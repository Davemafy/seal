'use client';

import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import PDFPreview from './pdf-preview';
import StoryPdfPage from './story-pdf-page';
import {fixtures,type FixtureKey} from '@/lib/fixtures';
import {fallbackExtract,claimsFromExtraction,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '@/lib/extract';
import {readInBrowser,warmOcr,type BrowserDocument} from '@/lib/browser-file';
import type {Claim,Extraction,Result,Verification} from '@/lib/types';
import './workspace.css';

type Mode='SNAPSHOT'|'LIVE';

const verdictLabel=(value:Result['verdict'])=>value==='MATCH'?'Matches':value==='MISMATCH'?'Conflicts':'Could not verify';
const stateWord=verdictLabel;
const compactEvidenceTitle=(title:string,index:number,allTitles:string[])=>{
 const allVirginia=allTitles.length>1&&allTitles.every(value=>/^Code of Virginia\s+/i.test(value));
 return allVirginia&&index>0?title.replace(/^Code of Virginia\s+/i,''):title;
};
const cleanDisplayText=(value:string)=>value
 .replace(/\[\s*=\s*\]/g,' ')
 .replace(/(?:^|\s)[*•]+\s*/g,' ')
 .replace(/\s*\/\s*/g,' · ')
 .replace(/\s+,/g,',')
 .replace(/,\s*,+/g,', ')
 .replace(/\s+/g,' ')
 .replace(/^(?:[·|:;,.\-–—]\s*)+|(?:\s*[·|:;,.\-–—])+$/g,'')
 .trim();

const cinematicExcerpt=(value:string,max=220)=>{
 const clean=cleanDisplayText(value);
 if(clean.length<=max)return clean;
 const window=clean.slice(0,max+1);
 const ends=[window.lastIndexOf('. '),window.lastIndexOf('? '),window.lastIndexOf('! ')].filter(index=>index>=90);
 if(ends.length)return window.slice(0,Math.max(...ends)+1);
 const next=clean.slice(max,max+80).search(/[.!?](?:\s|$)/);
 if(next>=0)return clean.slice(0,max+next+1);
 return clean.slice(0,max).replace(/\s+\S*$/,'')+'…';
};

const STORY_CHAPTERS=[
 {label:'Message',start:0},
 {label:'Claim',start:2.6},
 {label:'Source',start:5.8},
 {label:'Finding',start:10.4},
 {label:'Next step',start:13.2}
] as const;
const STORY_TOTAL=17.2;

const formatStoryTime=(seconds:number)=>{
 const whole=Math.max(0,Math.floor(seconds));
 return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;
};

const actionSummaryWord=(claim:Claim)=>{
 const action=claim.action;
 if(!action)return '';
 if(action.kind==='pay')return action.target_type==='money'&&action.target_value?`Pay ${action.target_value}`:'Pay';
 if(action.kind==='contact')return action.verb==='text'?'Text':/^(?:call|phone)$/.test(action.verb)?'Call':'Contact';
 if(action.kind==='navigate')return action.verb==='scan'?'Scan':action.target_type==='url'?'Open link':'Open';
 if(action.kind==='disclose')return 'Provide information';
 if(action.kind==='appear')return action.verb==='report'?'Report':'Appear';
 return action.verb?action.verb.charAt(0).toUpperCase()+action.verb.slice(1):'Act';
};

function claimTextUseful(claim:Claim){
 const value=cleanDisplayText(claim.action?.source_text||claim.exact_source_text||claim.value||'');
 if(value.length<4)return false;
 const compact=value.replace(/\s/g,'');
 const letters=(compact.match(/[a-z]/gi)||[]).length;
 const garbage=(compact.match(/[^a-z0-9.,:;()/#$%&@'’"!?+\-–—]/gi)||[]).length;
 return letters>=3&&garbage<=Math.max(2,Math.floor(compact.length*.08));
}
function claimReliable(claim:Claim){
 if(claim.verification_eligible===false)return false;
 if(!claimTextUseful(claim))return false;
 const threshold=claim.action?66:80;
 return typeof claim.field_confidence!=='number'||claim.field_confidence>=threshold;
}

function chooseDecisionClaim(claims:Claim[],verification:Verification){
 const resultById=new Map(verification.results.map(result=>[result.claim_id,result]));
 const actions=claims.filter(claim=>Boolean(claim.action)&&claimReliable(claim));
 const reliable=claims.filter(claimReliable);
 const result=(claim:Claim)=>resultById.get(claim.id);
 const hasEvidence=(claim:Claim)=>Boolean(result(claim)?.evidence?.length);
 const mismatch=(claim:Claim)=>result(claim)?.verdict==='MISMATCH';
 const trafficSignal=verification.signals?.find(signal=>signal.id==='traffic-qr-warning');

 const payWithEvidence=actions.find(claim=>claim.action?.kind==='pay'&&(hasEvidence(claim)||mismatch(claim)));
 const pay=actions.find(claim=>claim.action?.kind==='pay');
 const scan=actions.find(claim=>claim.action?.verb==='scan'||claim.action?.target_type==='qr');

 if(trafficSignal)return payWithEvidence||pay||scan
  ||actions.find(claim=>mismatch(claim))
  ||actions.find(hasEvidence)
  ||actions.find(claim=>claim.action?.kind==='appear');

 const mismatchingScan=scan&&mismatch(scan)?scan:undefined;
 return payWithEvidence
  ||mismatchingScan
  ||actions.find(claim=>mismatch(claim))
  ||actions.find(hasEvidence)
  ||pay
  ||scan
  ||actions[0]
  ||reliable.find(claim=>mismatch(claim)&&hasEvidence(claim))
  ||reliable.find(claim=>result(claim)?.verdict==='MATCH'&&hasEvidence(claim))
  ||reliable.find(hasEvidence)
  ||reliable[0];
}

function decisionCopy(verification:Verification|null,claim?:Claim){
 if(!verification)return {title:'',summary:''};
 if(verification.safe_action)return {title:verification.safe_action.title,summary:verification.safe_action.summary};
 const mismatches=verification.results.filter(result=>result.verdict==='MISMATCH').length;
 const matches=verification.results.filter(result=>result.verdict==='MATCH').length;
 if(mismatches)return {
  title:'Some details do not match court sources.',
  summary:'See which parts conflict, then use the court contact shown below to check what to do next.'
 };
 if(matches)return {
  title:'Some details match official sources.',
  summary:'See what matched below. A matching detail alone does not confirm who sent the message.'
 };
 if(claim?.action)return {
  title:'What this message asks you to do',
  summary:'SEAL could read the requested action, but the available official sources cannot confirm this case or sender. Verify through a court website or phone number you find independently before acting.'
 };
 return {
  title:'We could not confirm these details.',
  summary:'See what was checked below, then contact the court through its own website if you need to act.'
 };
}

export default function SealApp({initialDemo=false,initialText='',initialRun=false}:{initialDemo?:boolean;initialText?:string;initialRun?:boolean}){
 const [hydrated,setHydrated]=useState(false);
 const [fixture,setFixture]=useState<FixtureKey>('action-message-demo');
 const [text,setText]=useState(initialText||(initialDemo?fixtures['action-message-demo'].text:''));
 const [draft,setDraft]=useState('');
 const [file,setFile]=useState<BrowserDocument|null>(null);
 const [claims,setClaims]=useState<Claim[]>([]);
 const [verification,setVerification]=useState<Verification|null>(null);
 const [mode,setMode]=useState<Mode>('SNAPSHOT');
 const [extractionMode,setExtractionMode]=useState('');
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [dragging,setDragging]=useState(false);
 const [pasteMode,setPasteMode]=useState(false);
 const [revealed,setRevealed]=useState(0);
 const [selected,setSelected]=useState('');
 const [hovered,setHovered]=useState('');
 const [showIndex,setShowIndex]=useState(false);
 const [activeResultSection,setActiveResultSection]=useState<'summary'|'message'|'next'|'checked'>('summary');
 const [technicalOpen,setTechnicalOpen]=useState(false);
 const [reviewOffer,setReviewOffer]=useState<'idle'|'counting'|'skipped'|'watching'|'completed'>('idle');
 const [reviewCountdown,setReviewCountdown]=useState(3);
 const [reviewOfferPaused,setReviewOfferPaused]=useState(false);
 const [storyArtifactReady,setStoryArtifactReady]=useState(true);
 const [storyStartPending,setStoryStartPending]=useState(false);
 const [storyOpen,setStoryOpen]=useState(false);
 const [storyStep,setStoryStep]=useState(0);
 const [storyPlaying,setStoryPlaying]=useState(true);
 const [storyClosing,setStoryClosing]=useState(false);
 const storyKey=useRef('');
 const storyPlayerRef=useRef<HTMLDivElement>(null);
 const storyTimelineRef=useRef<ReturnType<typeof gsap.timeline>|null>(null);
 const storyScrubberRef=useRef<HTMLInputElement>(null);
 const storyPlayedRef=useRef<HTMLSpanElement>(null);
 const storyTimeLabelRef=useRef<HTMLSpanElement>(null);
 const storyTimelineTime=useRef(0);
 const storyPhaseRef=useRef(0);
 const storyCloseTimer=useRef<number|undefined>(undefined);
 const replayButton=useRef<HTMLButtonElement>(null);
 const storyPauseButton=useRef<HTMLButtonElement>(null);
 const initialRunStarted=useRef(false);
 const input=useRef<HTMLInputElement>(null);
 const anchors=useRef<Record<string,HTMLElement|null>>({});
 const runId=useRef(0);

 const isDemo=!file&&/^DEMO \/ (?:FICTIONAL NOTICE|SYNTHETIC MESSAGE)/.test(text);
 const isActionDemo=isDemo&&text.startsWith('DEMO / SYNTHETIC MESSAGE');
 const resultById=useMemo(()=>new Map(verification?.results.map(result=>[result.claim_id,result])||[]),[verification]);
 const requestedActions=useMemo(()=>claims.filter(claim=>Boolean(claim.action)),[claims]);
 const primaryAction=requestedActions[0];
 const actionSummary=useMemo(()=>{
  const words=[...new Set(requestedActions.map(actionSummaryWord).filter(Boolean))];
  return words.length?`${words.length} action${words.length===1?'':'s'}: ${words.join(' · ')}`:'';
 },[requestedActions]);
 const storySignal=verification?.signals?.find(signal=>signal.id.startsWith('curated-'))
  ||verification?.signals?.find(signal=>signal.id==='traffic-qr-warning')
  ||verification?.signals?.find(signal=>signal.kind==='SOURCE_CONFLICT')
  ||verification?.signals?.[0];
 const decisionClaim=verification?chooseDecisionClaim(claims,verification):undefined;
 const storyClaim=decisionClaim;
 const storyResult=storyClaim?resultById.get(storyClaim.id):undefined;
 const storyEvidence=storySignal?.evidence?.[0]||storyResult?.evidence?.[0];
 const storyClaimHeading=storySignal?.id==='traffic-qr-warning'&&storyClaim?.action
  ?actionSummaryWord(storyClaim)
  :storyClaim?.action
   ?actionSummaryWord(storyClaim)
   :storyClaim?.label&&storyClaim?.value
    ?`${storyClaim.label}: ${cleanDisplayText(storyClaim.value)}`
    :'This detail needs checking.';
 const storyClaimDisplay=cleanDisplayText(storyClaim?.action?.source_text||storyClaim?.exact_source_text||storyClaim?.value||'');
 const storyFocusBox=storyClaim
  &&claimReliable(storyClaim)
  &&storyClaim.source_bbox
  &&storyClaim.page===1
  &&storyClaim.source_bbox.width>=.015
  &&storyClaim.source_bbox.width<=.78
  &&storyClaim.source_bbox.height>=.01
  &&storyClaim.source_bbox.height<=.18
   ?storyClaim.source_bbox
   :undefined;
 const storySourceCopy=storySignal?.summary||storyEvidence?.excerpt||storyResult?.explanation||'SEAL could not establish this detail from a supported source.';
 const storySourceDisplay=cinematicExcerpt(storySourceCopy);
 const storyVerdict=storySignal?.id.startsWith('curated-')
  ?'The issuing authority published this example as a scam.'
  :storySignal?.id==='traffic-qr-warning'
   ?'This pattern matches an official scam warning.'
   :storyResult?.verdict==='MATCH'
   ?'This detail matches the source.'
   :storyResult?.verdict==='MISMATCH'
    ?'This detail conflicts with the source.'
    :'We couldn’t confirm this detail.';
 const storyVerdictCopy=storySignal?.summary||storyResult?.explanation||decisionCopy(verification).summary;
 const storyFinalTitle=storySignal?.id==='traffic-qr-warning'
  ?verification?.safe_action?.title||'Verify independently before you pay.'
  :storyClaim?.type==='authority'&&verification?.safe_action
   ?'Verify this notice in Virginia’s official court system.'
   :verification?.safe_action?.title
    ||(storyResult?.verdict==='MATCH'?'Matching details do not authenticate the sender.':'Verify independently before you respond.');
 const storyFinalSummary=storySignal?.id==='traffic-qr-warning'
  ?verification?.safe_action?.summary||'Do not use the payment route in this message until the case is independently verified.'
  :storyClaim?.type==='authority'&&verification?.safe_action
   ?'The cited law does not match the printed toll claim. Search the case independently before relying on the notice.'
   :verification?.safe_action?.summary
    ||(storyResult?.verdict==='MATCH'&&verification?.contact
      ?'Use the independently sourced court contact if you need to act.'
      :'Use the court’s own website or independently sourced contact information before responding.');
 const storySourceLabel=!storyEvidence
  ?'Source check'
  :storySignal?.id.startsWith('curated-')
   ?'Issuing authority'
   :storySignal?.id==='traffic-qr-warning'&&/ftc\.gov/i.test(storyEvidence.url)
   ?'Federal consumer guidance'
   :storySignal?.kind==='SOURCE_CONFLICT'
    ?'State law'
    :['connecticut','riverside','courtlistener'].includes(storyResult?.resolver_id||verification?.resolver_id||'')
     ?'Official court source'
     :'Independent official source';
 const decisionResult=decisionClaim?resultById.get(decisionClaim.id):undefined;
 const decisionClaimDisplay=cleanDisplayText(decisionClaim?.action?.source_text||decisionClaim?.exact_source_text||decisionClaim?.value||'');
 const directEvidenceFindings=verification
  ?claims.flatMap(claim=>{
    const result=resultById.get(claim.id);
    return result?.evidence?.length?[{claim,result}]:[];
   })
  :[];
 const directCourtUnavailable=verification?.resolver_id==='unsupported';
 const directCheckSummary=directCourtUnavailable?'No supported direct court check is available for this jurisdiction.':'';
 const decisionRelationship=storySignal?.id.startsWith('curated-')
  ?'The issuing authority published this artifact as a scam example.'
  :storySignal?.kind==='SOURCE_CONFLICT'
   ?'This detail conflicts with an official source.'
   :storySignal?.id==='traffic-qr-warning'
   ?'Published official warnings match this payment pattern.'
   :storySignal
    ?'Published official warnings match this pattern.'
    :decisionResult?.verdict==='MATCH'
     ?'This detail matches the independent source.'
     :decisionResult?.verdict==='MISMATCH'
      ?'This detail conflicts with the independent source.'
      :'No direct case confirmation.';
 const decisionRelationshipConflict=storySignal?.kind==='SOURCE_CONFLICT'||(!storySignal&&decisionResult?.verdict==='MISMATCH');
 const current=claims.find(claim=>claim.id===selected)||claims[0];
 const currentResult=current&&resultById.get(current.id);
 const active=hovered||selected;
 const ready=Boolean(verification)&&revealed>=claims.length;
 const storyHasIndependentEvidence=Boolean(
  verification&&(
   verification.signals?.some(signal=>Boolean(signal.evidence?.length))
   ||storyResult?.evidence?.length
   ||((storyResult?.verdict==='MATCH'||storyResult?.verdict==='MISMATCH')&&storyResult?.evidence?.length)
   ||verification.safe_action?.evidence?.length
  )
 );
 const reviewWorthWatching=Boolean(
  verification
  &&storyClaim
  &&claimReliable(storyClaim)
  &&storyHasIndependentEvidence
 );
 const count=(value:Result['verdict'])=>verification?.results.filter(result=>result.verdict===value).length||0;
 const decision=decisionCopy(verification,decisionClaim);
 const technicalEvidence=useMemo(()=>{
  if(!verification)return [];
  const all=[
   ...verification.results.flatMap(result=>result.evidence),
   ...(verification.signals||[]).flatMap(signal=>signal.evidence),
   ...(verification.safe_action?.evidence||[])
  ];
  return [...new Map(all.map(evidence=>[evidence.url,evidence])).values()];
 },[verification]);
 const resolverSummary=verification
  ?`Court resolver: ${verification.resolver_id==='unsupported'?'unavailable':verification.resolver_id} · Source intelligence: ${verification.signals?.length||verification.safe_action?'active':'inactive'} · Mode: ${mode}`
  :'';
 const liveFailed=mode==='LIVE'&&['riverside','connecticut'].includes(verification?.resolver_id||'')&&verification?.results.some(result=>result.explanation==='Official source could not be reached during this check.');
 const sourceLabel=verification?.signals?.length?'OFFICIAL SOURCE FINDINGS':verification?.resolver_id==='riverside'?(mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 24 SEP 2026'):verification?.resolver_id==='connecticut'?(mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 25 SEP 2026'):verification?.resolver_id==='courtlistener'?(claims.some(claim=>claim.type==='docket')?'FEDERAL DOCKET INDEX':'NO JURY-SOURCE COVERAGE'):verification?.resolver_id==='ocr'?'LOW CONFIDENCE OCR':verification?'NO SUPPORTED SOURCE':error?'NOT CHECKED':isActionDemo?'SOURCE SNAPSHOT · 25 SEP 2026':isDemo?'SOURCE SNAPSHOT · 24 SEP 2026':'SOURCE CHECK PENDING';

 const syncStoryTime=useCallback((time:number)=>{
  const clamped=Math.max(0,Math.min(STORY_TOTAL,time));
  storyTimelineTime.current=clamped;
  if(storyScrubberRef.current)storyScrubberRef.current.value=String(clamped);
  if(storyPlayedRef.current)storyPlayedRef.current.style.transform=`scaleX(${clamped/STORY_TOTAL})`;
  if(storyTimeLabelRef.current)storyTimeLabelRef.current.textContent=formatStoryTime(clamped);
  let phase=0;
  for(let i=STORY_CHAPTERS.length-1;i>=0;i--){
   if(clamped>=STORY_CHAPTERS[i].start-.01){phase=i;break}
  }
  if(storyPhaseRef.current!==phase){
   storyPhaseRef.current=phase;
   setStoryStep(phase);
  }
 },[]);

 const buildStoryTimeline=useCallback(()=>{
  const root=storyPlayerRef.current;
  if(!root)return null;

  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile=window.matchMedia('(max-width: 599px)').matches;
  const stage=root.querySelector<HTMLElement>('.story-document-stage');
  const documentRegion=root.querySelector<HTMLElement>('.story-document-region');
  const artifact=root.querySelector<HTMLElement>('[data-story-artifact]');
  const sourceRegion=root.querySelector<HTMLElement>('.story-source-region');
  const sourcePanel=root.querySelector<HTMLElement>('.story-source-panel');
  const claim=root.querySelector<HTMLElement>('.story-claim-anchor');
  const verdict=root.querySelector<HTMLElement>('.story-verdict-panel');
  const verdictScrim=root.querySelector<HTMLElement>('.story-verdict-scrim');
  const action=root.querySelector<HTMLElement>('.story-action-panel');
  const stageLabel=root.querySelector<HTMLElement>('.story-stage-label');
  const highlight=root.querySelector<HTMLElement>('.story-highlight');
  const sourceChildren=Array.from(root.querySelectorAll<HTMLElement>('.story-source-panel > span,.story-source-panel > strong,.story-source-panel > p,.story-source-panel > a'));
  const actionChildren=Array.from(root.querySelectorAll<HTMLElement>('.story-action-panel > span,.story-action-panel > strong,.story-action-panel > p,.story-action-panel > small,.story-action-panel > .story-final-actions'));
  const targets=[documentRegion,sourceRegion,sourcePanel,claim,verdict,verdictScrim,action,stageLabel,highlight,...sourceChildren,...actionChildren].filter(Boolean) as HTMLElement[];
  const clock={value:0};

  storyTimelineRef.current?.kill();
  gsap.killTweensOf(targets);
  targets.forEach(target=>{target.style.willChange='transform,opacity'});

  const tl=gsap.timeline({
   paused:true,
   defaults:{ease:'expo.out',overwrite:'auto'},
   onUpdate:()=>syncStoryTime(tl.time()),
   onComplete:()=>{
    syncStoryTime(STORY_TOTAL);
    setStoryPlaying(false);
    targets.forEach(target=>{target.style.willChange='auto'});
   }
  });
  storyTimelineRef.current=tl;

  const placeHighlight=()=>{
   if(!storyFocusBox||!artifact||!highlight)return false;
   const parent=highlight.offsetParent as HTMLElement|null;
   if(!parent)return false;
   const artifactRect=artifact.getBoundingClientRect();
   const parentRect=parent.getBoundingClientRect();
   const parentScaleX=parent.offsetWidth?parentRect.width/parent.offsetWidth:1;
   const parentScaleY=parent.offsetHeight?parentRect.height/parent.offsetHeight:1;
   const left=(artifactRect.left-parentRect.left)/parentScaleX+storyFocusBox.x*(artifactRect.width/parentScaleX);
   const top=(artifactRect.top-parentRect.top)/parentScaleY+storyFocusBox.y*(artifactRect.height/parentScaleY);
   const width=storyFocusBox.width*(artifactRect.width/parentScaleX);
   const height=storyFocusBox.height*(artifactRect.height/parentScaleY);
   gsap.set(highlight,{left,top,width,height,transformOrigin:'center center'});
   return true;
  };

  const hasPlacedHighlight=placeHighlight();
  const focusCenterX=storyFocusBox?storyFocusBox.x+storyFocusBox.width/2:.5;
  const focusCenterY=storyFocusBox?storyFocusBox.y+storyFocusBox.height/2:.5;
  const focusX=Math.max(-24,Math.min(24,(.5-focusCenterX)*48));
  const focusY=Math.max(-16,Math.min(16,(.5-focusCenterY)*34));

  if(documentRegion)gsap.set(documentRegion,{
   x:0,y:0,xPercent:0,yPercent:0,
   scale:reduced?1:.97,
   opacity:reduced?1:.92,
   filter:'brightness(1)',
   transformOrigin:'center center'
  });
  if(stageLabel)gsap.set(stageLabel,{opacity:1,y:0});
  if(highlight)gsap.set(highlight,{opacity:0,scale:.92});
  if(claim){
   if(hasPlacedHighlight&&stage&&highlight){
    const stageRect=stage.getBoundingClientRect();
    const boxRect=highlight.getBoundingClientRect();
    const claimWidth=Math.min(mobile?stageRect.width-36:430,stageRect.width*.42);
    const desiredLeft=boxRect.left-stageRect.left;
    const left=Math.max(mobile?18:24,Math.min(stageRect.width-claimWidth-(mobile?18:24),desiredLeft));
    const desiredTop=boxRect.bottom-stageRect.top+12;
    const top=Math.max(72,Math.min(stageRect.height-154,desiredTop));
    gsap.set(claim,{left,right:'auto',top,bottom:'auto',width:claimWidth});
   }else{
    gsap.set(claim,{left:mobile?'18px':'6%',right:mobile?'18px':'auto',top:'auto',bottom:mobile?'7%':'6%',width:mobile?'auto':'min(430px,42%)'});
   }
   gsap.set(claim,{opacity:0,y:reduced?0:8,scale:reduced?1:.985});
  }
  if(sourceRegion)gsap.set(sourceRegion,{opacity:0,x:reduced?0:20,pointerEvents:'none'});
  if(sourcePanel)gsap.set(sourcePanel,{opacity:1,x:0});
  if(sourceChildren.length)gsap.set(sourceChildren,{opacity:0,y:reduced?0:8,filter:reduced?'blur(0px)':'blur(1.5px)'});
  if(verdictScrim)gsap.set(verdictScrim,{opacity:0});
  if(verdict)gsap.set(verdict,{opacity:0,y:reduced?0:12,scale:reduced?1:.99});
  if(action)gsap.set(action,{opacity:0,x:reduced?0:18});
  if(actionChildren.length)gsap.set(actionChildren,{opacity:0,y:reduced?0:6});

  // A single clock guarantees a real continuous duration and makes scrubbing deterministic.
  tl.to(clock,{value:1,duration:STORY_TOTAL,ease:'none'},0);

  // 0.0–2.6 — establish the exact document.
  if(documentRegion)tl.to(documentRegion,{scale:1,opacity:1,duration:reduced?.16:.72},0);
  if(stageLabel)tl.to(stageLabel,{opacity:0,y:reduced?0:-3,duration:reduced?.16:.28},1.75);

  // 2.6–5.8 — isolate the decision-driving instruction without pretending to know a bbox we do not have.
  if(documentRegion)tl.to(documentRegion,{
   x:reduced?0:(hasPlacedHighlight?focusX:0),
   y:reduced?0:(hasPlacedHighlight?focusY:0),
   scale:reduced?1:(hasPlacedHighlight?1.075:1),
   filter:reduced?'brightness(1)':(hasPlacedHighlight?'brightness(.93)':'brightness(.82)'),
   duration:reduced?.16:.88
  },2.58);
  if(highlight&&hasPlacedHighlight)tl.to(highlight,{opacity:1,scale:1,duration:reduced?.16:.42},2.88);
  if(claim)tl.to(claim,{opacity:1,y:0,scale:1,duration:reduced?.16:.44},2.98);

  // 5.8–10.4 — shared-element comparison: document glides left, independent source opens on the right.
  if(documentRegion)tl.to(documentRegion,{
   x:0,y:0,
   xPercent:reduced?0:(mobile?0:-27),
   yPercent:reduced?0:(mobile?-20:-4),
   scale:reduced?1:(mobile?.61:.70),
   opacity:reduced?.82:.9,
   filter:reduced?'brightness(.86)':'brightness(.76)',
   duration:reduced?.18:.88
  },5.78);
  if(highlight)tl.to(highlight,{opacity:hasPlacedHighlight?.82:0,duration:reduced?.14:.3},5.78);
  if(claim)tl.to(claim,{
   left:mobile?'18px':'6%',
   right:mobile?'18px':'auto',
   top:'auto',
   bottom:mobile?'51%':'5%',
   width:mobile?'auto':'min(370px,32%)',
   opacity:.96,
   y:0,
   scale:1,
   duration:reduced?.16:.72
  },5.78);
  if(sourceRegion){
   tl.set(sourceRegion,{pointerEvents:'auto'},6.16);
   tl.to(sourceRegion,{opacity:1,x:0,duration:reduced?.16:.54},6.18);
  }
  sourceChildren.forEach((child,index)=>{
   tl.to(child,{opacity:1,y:0,filter:'blur(0px)',duration:reduced?.14:.38},6.38+index*.06);
  });

  // 10.4–13.2 — source + message recede together; the relationship becomes the focal point.
  if(claim)tl.to(claim,{opacity:0,y:reduced?0:-6,duration:reduced?.14:.25},10.30);
  if(documentRegion)tl.to(documentRegion,{opacity:reduced?.42:.18,filter:'brightness(.2)',duration:reduced?.18:.58},10.34);
  if(sourceRegion)tl.to(sourceRegion,{opacity:reduced?.38:.22,duration:reduced?.18:.58},10.34);
  if(sourceChildren.length)tl.to(sourceChildren,{opacity:.55,duration:reduced?.14:.28},10.34);
  if(verdictScrim)tl.to(verdictScrim,{opacity:reduced?.52:.72,duration:reduced?.18:.58},10.34);
  if(verdict)tl.to(verdict,{opacity:1,y:0,scale:1,duration:reduced?.16:.46},10.58);

  // 13.2–17.2 — resolve into the safe action, then HOLD. The player does not auto-close.
  if(verdict)tl.to(verdict,{opacity:0,y:reduced?0:-8,duration:reduced?.14:.28},13.04);
  if(verdictScrim)tl.to(verdictScrim,{opacity:reduced?.30:.36,duration:reduced?.16:.5},13.08);
  if(documentRegion)tl.to(documentRegion,{
   xPercent:reduced?0:(mobile?0:-22),
   yPercent:reduced?0:(mobile?-18:0),
   scale:reduced?1:(mobile?.60:.66),
   opacity:reduced?.36:(mobile?.34:.28),
   filter:reduced?'brightness(.5)':(mobile?'brightness(.42)':'brightness(.36)'),
   duration:reduced?.16:.56
  },13.10);
  if(sourceRegion)tl.to(sourceRegion,{opacity:reduced?.22:.14,duration:reduced?.16:.46},13.10);
  if(action)tl.to(action,{opacity:1,x:0,duration:reduced?.16:.46},13.54);
  actionChildren.forEach((child,index)=>{
   tl.to(child,{opacity:1,y:0,duration:reduced?.14:.34},13.62+index*.055);
  });

  syncStoryTime(0);
  return tl;
 },[storyFocusBox,syncStoryTime]);

 useLayoutEffect(()=>{
  if(!storyOpen)return;
  let cancelled=false;
  let frame=0;
  frame=window.requestAnimationFrame(()=>{
   if(cancelled)return;
   const tl=buildStoryTimeline();
   if(!tl)return;
   setStoryPlaying(true);
   tl.play(0);
  });
  return()=>{
   cancelled=true;
   window.cancelAnimationFrame(frame);
   storyTimelineRef.current?.kill();
  };
 },[storyOpen,buildStoryTimeline]);

 useEffect(()=>()=>{storyTimelineRef.current?.kill()},[]);

 const seekStory=useCallback((time:number)=>{
  const tl=storyTimelineRef.current;
  if(!tl)return;
  const clamped=Math.max(0,Math.min(STORY_TOTAL,time));
  tl.time(clamped,false);
  syncStoryTime(clamped);
 },[syncStoryTime]);

 const seekStoryBy=useCallback((delta:number)=>{
  seekStory(storyTimelineTime.current+delta);
 },[seekStory]);

 const toggleStoryPlayback=useCallback(()=>{
  const tl=storyTimelineRef.current;
  if(!tl)return;
  if(tl.time()>=STORY_TOTAL-.04){
   tl.pause(0,false);
   syncStoryTime(0);
   setStoryStep(0);
   storyPhaseRef.current=0;
   tl.play();
   setStoryPlaying(true);
   return;
  }
  if(tl.paused()){
   tl.play();
   setStoryPlaying(true);
  }else{
   tl.pause();
   setStoryPlaying(false);
  }
 },[syncStoryTime]);

 useEffect(()=>{const timer=window.setTimeout(()=>setHydrated(true),0);return()=>{clearTimeout(timer);if(storyCloseTimer.current)window.clearTimeout(storyCloseTimer.current)}},[]);

 useEffect(()=>{
  if(!hydrated||initialRunStarted.current)return;
  if(initialRun&&initialText){
   initialRunStarted.current=true;
   void run('SNAPSHOT',{text:initialText,file:null});
   return;
  }
  const caseId=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('case'):null;
  if(!caseId)return;
  // A Browse handoff is a one-shot action, not persistent app state.
  // Consume the query immediately so refresh/back-to-home never re-runs a file.
  window.history.replaceState(null,'',window.location.pathname);
  initialRunStarted.current=true;
  void (async()=>{
   try{
    setBusy(true);
    setStatus('Opening the source document');
    const [caseResponse,assetResponse]=await Promise.all([
     fetch(`/api/browse-case?id=${encodeURIComponent(caseId)}`),
     fetch(`/api/browse-asset?id=${encodeURIComponent(caseId)}`)
    ]);
    if(!caseResponse.ok)throw new Error('Case unavailable');
    const payload=await caseResponse.json() as {runText?:string;assetType?:'pdf'|'image';title?:string};
    const seededText=payload.runText?.trim()||'';

    if(assetResponse.ok&&payload.assetType){
     const blob=await assetResponse.blob();
     const isPdf=payload.assetType==='pdf';
     const type=isPdf?'application/pdf':blob.type.startsWith('image/')?blob.type:'image/jpeg';
     const extension=isPdf?'pdf':type.includes('png')?'png':'jpg';
     const sourceFile=new File([blob],`${caseId}.${extension}`,{type});
     setStatus('Opening the source document');
     const doc=await readInBrowser(sourceFile,next=>setStatus(next));
     const analysisText=seededText||doc.text;
     if(!analysisText.trim())throw new Error('Case text unavailable');
     setFile(doc);
     setText(analysisText);
     setBusy(false);
     setStatus('');
     await run('SNAPSHOT',{text:analysisText,file:doc,curated:true,curatedCaseId:caseId});
     return;
    }

    if(!seededText)throw new Error('Case asset unavailable');
    setBusy(false);
    setStatus('');
    setText(seededText);
    await run('SNAPSHOT',{text:seededText,file:null,curated:true,curatedCaseId:caseId});
   }catch{
    setBusy(false);
    setStatus('');
    initialRunStarted.current=false;
    setError('This browse case could not be opened. You can still upload or paste a message.');
   }
  })();
 },[hydrated,initialRun,initialText]);

 useEffect(()=>{
  setStoryStartPending(false);
  if(!file){setStoryArtifactReady(true);return}
  if(file.kind==='pdf'){setStoryArtifactReady(false);return}
  setStoryArtifactReady(false);
  let cancelled=false;
  const image=new Image();
  image.src=file.preview;
  const markReady=()=>{if(!cancelled)setStoryArtifactReady(true)};
  if(image.complete){markReady();return()=>{cancelled=true}}
  if(typeof image.decode==='function')void image.decode().then(markReady).catch(markReady);
  else{image.onload=markReady;image.onerror=markReady}
  return()=>{cancelled=true;image.onload=null;image.onerror=null};
 },[file?.preview,file?.kind]);

 useEffect(()=>{
  if(storyStartPending&&storyArtifactReady)startStory();
 },[storyStartPending,storyArtifactReady]);

 useEffect(()=>{
  if(!verification||!ready)return;
  const key=`${text.slice(0,96)}:${claims.length}:${verification.resolver_id}`;
  if(storyKey.current===key)return;
  storyKey.current=key;
  setStoryOpen(false);
  setStoryStep(0);
  setStoryPlaying(false);
  setStoryClosing(false);
  setReviewCountdown(3);
  setReviewOfferPaused(false);
  if(!reviewWorthWatching){setReviewOffer('skipped');return}
  setReviewOffer('idle');
 },[verification,ready,text,claims.length,reviewWorthWatching]);

 useEffect(()=>{
  if(reviewOffer!=='counting'||reviewOfferPaused)return;
  const timer=window.setTimeout(()=>{
   if(reviewCountdown<=1){startStory();return}
   setReviewCountdown(value=>Math.max(1,value-1));
  },1000);
  return()=>window.clearTimeout(timer);
 },[reviewOffer,reviewOfferPaused,reviewCountdown]);

 useEffect(()=>{
  if(reviewOffer!=='counting')return;
  const startY=window.scrollY;
  const onScroll=()=>{if(Math.abs(window.scrollY-startY)>18)skipReviewOffer()};
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')skipReviewOffer()};
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('keydown',onKey);
  return()=>{window.removeEventListener('scroll',onScroll);window.removeEventListener('keydown',onKey)};
 },[reviewOffer]);

 useEffect(()=>{
  if(!storyOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){closeStory();return}
   if(event.key==='ArrowRight'){event.preventDefault();seekStoryBy(5);return}
   if(event.key==='ArrowLeft'){event.preventDefault();seekStoryBy(-5);return}
   if(event.key===' '){event.preventDefault();toggleStoryPlayback()}
  };
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)};
 },[storyOpen,seekStoryBy,toggleStoryPlayback]);

 function startStory(){
  if(!storyArtifactReady){
   setStoryStartPending(true);
   setReviewOfferPaused(true);
   setReviewCountdown(1);
   return;
  }
  if(storyCloseTimer.current){window.clearTimeout(storyCloseTimer.current);storyCloseTimer.current=undefined}
  setStoryStartPending(false);
  setReviewOfferPaused(false);
  setReviewOffer('watching');
  setReviewCountdown(3);
  storyTimelineRef.current?.kill();
  storyTimelineTime.current=0;
  storyPhaseRef.current=0;
  setStoryStep(0);
  setStoryPlaying(true);
  setStoryClosing(false);
  setStoryOpen(true);
  window.requestAnimationFrame(()=>storyPauseButton.current?.focus());
 }
 function skipReviewOffer(){
  setReviewOffer('skipped');
  setReviewCountdown(3);
  setReviewOfferPaused(false);
 }
 function closeStory(){
  if(storyClosing)return;
  if(storyCloseTimer.current)window.clearTimeout(storyCloseTimer.current);
  storyTimelineRef.current?.pause();
  setStoryClosing(true);
  setStoryPlaying(false);
  setReviewOffer('completed');
  storyCloseTimer.current=window.setTimeout(()=>{
   storyCloseTimer.current=undefined;
   setStoryOpen(false);
   setStoryClosing(false);
   window.requestAnimationFrame(()=>replayButton.current?.focus());
  },260);
 }
 function replayStory(){startStory()}

 function clear(){
  if(typeof window!=='undefined'&&(window.location.search||window.location.hash)){
   window.history.replaceState(null,'',window.location.pathname);
  }
  storyTimelineRef.current?.kill();
  storyTimelineTime.current=0;
  storyPhaseRef.current=0;
  runId.current++;
  if(file)URL.revokeObjectURL(file.preview);
  setFile(null);setText('');setDraft('');setPasteMode(false);setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setActiveResultSection('summary');setTechnicalOpen(false);setReviewOffer('idle');setReviewCountdown(3);setReviewOfferPaused(false);setStoryArtifactReady(true);setStoryStartPending(false);setMode('SNAPSHOT');setStoryOpen(false);setStoryStep(0);setStoryPlaying(true);setStoryClosing(false);storyKey.current='';
 }

 function chooseFixture(key:FixtureKey){clear();setFixture(key);setText(fixtures[key].text);void run('SNAPSHOT',{text:fixtures[key].text,file:null})}
 function submitPaste(){const value=draft.trim();if(!value)return;clear();setText(value);void run('SNAPSHOT',{text:value,file:null})}

async function upload(uploaded:File){
  clear();const uploadId=runId.current;setBusy(true);setStatus('Preparing your file');
  try{
   const doc=await readInBrowser(uploaded,next=>{if(runId.current===uploadId)setStatus(next)});
   if(runId.current!==uploadId){URL.revokeObjectURL(doc.preview);return}
   setFile(doc);setText(doc.text);
   if(!doc.text.trim()&&!doc.uncertain)setError('We couldn’t read enough from this file. Try a clearer image or paste the message.');
   else await run('SNAPSHOT',{text:doc.text,file:doc});
  }catch(e){
   if(runId.current===uploadId)setError(e instanceof Error?e.message:'Could not read this file.');
  }finally{
   if(runId.current===uploadId){setBusy(false);setStatus('')}
  }
 }

 async function run(sourceMode:Mode=mode,source?:{text:string;file:BrowserDocument|null;curated?:boolean;curatedCaseId?:string}){
  const sourceText=source?.text??text;
  const sourceFile=source?source.file:file;
  const sourceCurated=Boolean(source?.curated);
  const curatedCaseId=source?.curatedCaseId;
  const sourceIsDemo=!sourceFile&&/^DEMO \/ (?:FICTIONAL NOTICE|SYNTHETIC MESSAGE)/.test(sourceText);
  const id=++runId.current;
  setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setTechnicalOpen(false);setReviewOffer('idle');setReviewCountdown(3);setReviewOfferPaused(false);setStoryStartPending(false);setMode(sourceMode);setStatus('Reading requested actions');
  try{
   if(sourceFile?.uncertain)throw new Error('We couldn’t reliably read the important instructions in this document. Try a clearer image or paste the message text.');

   let extraction:Extraction=fallbackExtract(sourceText);
   let extractor='DETERMINISTIC';

   if(!sourceIsDemo){
    let response:Response;
    try{response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sourceText})});}
    catch{throw new Error('We couldn’t reach the instruction reader. Please try again in a moment.');}
    if(!response.ok)throw new Error('We couldn’t reliably read the important instructions right now. Please try again in a moment.');
    const data=await response.json();
    extraction=data.extraction;
    extractor=data.mode||'DETERMINISTIC';
   }

   if(sourceFile?.kind==='pdf'){
    const juror=recoverLabeledJurorNumber(sourceFile.tokens);
    const date=recoverLabeledReportingDate(sourceFile.tokens);
    extraction={...extraction,juror_or_reference_number:juror||extraction.juror_or_reference_number,reporting_date:date||extraction.reporting_date};
   }

   if(runId.current!==id)return;
   setExtractionMode(extractor);

   // Curated cases use a source-checked transcript for analysis. OCR tokens from
   // the pictured artifact may help display it, but must not invent new claims.
   const extractedClaims=claimsFromExtraction(extraction,sourceText,sourceCurated?[]:sourceFile?.tokens||[]);
   const found=sourceCurated
    ?extractedClaims.map(claim=>({...claim,verification_eligible:true}))
    :extractedClaims;
   const reliableAction=found.some(claim=>Boolean(claim.action)&&claimReliable(claim));
   const courtRelated=/\b(?:court|jury|summons|hearing|case|docket|judge|tribunal|magistrate|citation|parking violation)\b/i.test(sourceText);
   if(!sourceCurated&&(!courtRelated||!reliableAction))throw new Error(!courtRelated
    ?'This does not look like a court message SEAL can check. Try a court notice, text, or email.'
    :'We couldn’t reliably read the important instructions in this document. Try a clearer image or paste the message text.');
   if(!found.length){
    if(sourceFile&&sourceText.trim().length>=40)throw new Error('We could read text in this image, but SEAL couldn’t find a court message or notice to check. Try another image or paste the message text.');
    throw new Error('We couldn’t read enough of this message to check it reliably. Try a clearer screenshot or paste the message text.');
   }

   setClaims(found);
   setStatus('Checking independent sources');

   const verifiable=found.filter(claim=>claim.verification_eligible!==false);
   const courtClaim=found.find(claim=>claim.type==='court');
   const routingCourt=courtClaim?.verification_eligible===false?'':extraction.court_name;

   const response=await fetch('/api/verify',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({claims:verifiable,court_name:routingCourt,jurisdiction_hint:'',mode:sourceMode,text:sourceText,curated_case_id:curatedCaseId})
   });
   if(!response.ok)throw new Error('The source check could not finish. Try again.');

   const checkedServer=await response.json() as Verification;
   const checkedById=new Map(checkedServer.results.map(result=>[result.claim_id,result]));
   const checked:Verification={
    ...checkedServer,
    results:found.map(claim=>claim.verification_eligible===false
     ?{claim_id:claim.id,verdict:'COULD_NOT_VERIFY',explanation:'We couldn’t read this field confidently.',evidence:[],resolver_id:'ocr'}
     :checkedById.get(claim.id)||{claim_id:claim.id,verdict:'COULD_NOT_VERIFY',explanation:'No supported official-source check applies to this extracted action.',evidence:[],resolver_id:checkedServer.resolver_id})
   };

   if(runId.current!==id)return;
   setVerification(checked);
   setRevealed(found.length);

   const requested=chooseDecisionClaim(found,checked);
   const firstReliable=found.find(claimReliable);
   setSelected(requested?.id||firstReliable?.id||'');
  }catch(e){
   if(runId.current===id)setError(e instanceof Error?e.message:'The source check could not finish.');
  }finally{
   if(runId.current===id){setBusy(false);setStatus('')}
  }
 }

 const select=useCallback((id:string)=>{
  if(!verification||!resultById.has(id))return;
  setSelected(id);
 },[verification,resultById]);

 useEffect(()=>{
  if(!verification)return;
  const onKey=(event:KeyboardEvent)=>{
   if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLButtonElement||event.target instanceof HTMLAnchorElement)return;
   if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key))return;
   event.preventDefault();
   const index=claims.findIndex(claim=>claim.id===selected);
   const direction=event.key==='ArrowDown'||event.key==='ArrowRight'?1:-1;
   const next=Math.max(0,Math.min(claims.length-1,index+direction));
   select(claims[next].id);
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[verification,claims,selected,select]);

 const renderTextLines=(lines:string[])=><div className="message-lines">{lines.map((line,index)=>{
  const claim=claims.find(candidate=>candidate.exact_source_text===line||line.includes(candidate.value));
  const result=claim&&resultById.get(claim.id);
  const value=claim?.value||'';
  const at=claim?line.indexOf(value):-1;
  return <div className={`message-line ${claim?'document-has-claim':''}`} key={index}>
   {claim&&at>=0?<>
    {line.slice(0,at)}
    <button
     type="button"
     className={`document-claim ${result?`state-${result.verdict.toLowerCase()}`:''} ${active===claim.id?'is-active':''}`}
     aria-label={`${claim.label}: ${claim.value}${result?' — '+verdictLabel(result.verdict):''}`}
     aria-pressed={selected===claim.id}
     onClick={()=>select(claim.id)}
     onMouseEnter={()=>setHovered(claim.id)}
     onMouseLeave={()=>setHovered('')}
     ref={element=>{anchors.current[claim.id]=element}}
    >
     {value}
    </button>
    {line.slice(at+value.length)}
   </>:line}
  </div>;
 })}</div>;

 return <main className="seal-app">
  <aside className="workspace-rail" aria-label="Workspace">
   <a href="/" className="rail-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></a>
   <div className="rail-group-label">WORKSPACE</div>
   <button className="rail-item is-current" type="button" onClick={clear}>Check a message</button>
   <a className="rail-item" href="/browse">Browse real cases</a>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every item links back to the issuing court or agency.</span></div>
  </aside>
  <header className="seal-nav mobile-only-nav">
   <a href="/" className="mobile-brand" aria-label="SEAL home"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></a>
   {!text
    ?<a href="/browse" className="mobile-nav-action">Browse</a>
    :<button className="mobile-nav-action mobile-nav-button" type="button" onClick={clear}>New check</button>}
  </header>

  {!text?
   <section className="entry-shell">
   <div className="entry-copy">
     <h1>Check a court message</h1>
     <p>See what it asks you to do, what the court can confirm, and where to check next.</p>
    </div>

    <div className={`intake ${pasteMode?'is-paste-mode':'is-upload-mode'}`}>
     {!pasteMode?
      <>
       <button className={`upload-row ${dragging?'is-dragging':''} ${busy?'is-busy':''}`} type="button" disabled={busy||!hydrated} onPointerDown={()=>{void warmOcr()}} onClick={()=>input.current?.click()}
        onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();setDragging(true)}}}
        onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false)}}
        onDrop={event=>{event.preventDefault();setDragging(false);if(event.dataTransfer.files[0])upload(event.dataTransfer.files[0])}}>
        <span className="upload-group">
         <span className="upload-copy">{busy&&<img className="upload-busy-mark" src="/brand/seal-mark-black.svg" alt=""/>}{busy&&<span className="upload-process-label">ON THIS DEVICE</span>}<strong>{busy?(status==='Reading text from the image'?'Reading image':status==='Reading text from the PDF'?'Reading PDF':status):'Upload a notice or screenshot'}</strong><small>{busy?(status==='Reading text from the image'?'Reading the words in your image. Nothing has been sent yet.':status==='Reading text from the PDF'?'Reading the text layer in this PDF. Nothing has been sent yet.':'Preparing the file locally.'):'Drop here or browse files · PDF, PNG, or JPG · up to 16 MB'}</small></span>
         {!busy&&<span className="upload-browse">Browse files</span>}
        </span>
        
       </button>
       <button className="paste-mode-switch" type="button" onClick={()=>setPasteMode(true)}>Paste text instead <span aria-hidden="true">→</span></button>
       <p className="privacy-note">Original file stays on this device. Extracted text may be sent for checking.</p>
      </>
      :
      <div className="paste-mode-panel">
       <button className="paste-mode-switch paste-mode-back" type="button" onClick={()=>setPasteMode(false)}><span aria-hidden="true">←</span> Upload a file instead</button>
       <label className="paste-field">
        <span className="field-label">Message text</span>
        <textarea autoFocus aria-label="Paste the court message" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Paste the message exactly as you received it"/>
       </label>
       <div className="intake-actions">
        <button className="check-message" type="button" disabled={!draft.trim()||!hydrated} onClick={submitPaste}>Check this message</button>
       </div>
       <p className="privacy-note">Original file stays on this device. Extracted text may be sent for checking.</p>
      </div>}

     {error&&<div role="alert" className="inspection-error">{error}</div>}
    </div>

   </section>
   :
   <section className="review-shell"
    onPointerDownCapture={event=>{if(reviewOffer==='counting'&&!(event.target as Element).closest('[data-review-offer]'))skipReviewOffer()}}
    onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault()}}
    onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();skipReviewOffer();upload(event.dataTransfer.files[0])}}}>
    <header className="result-masthead" id="result-top">
     <div className="result-masthead-row">
      <h1>Your message</h1>

      {verification&&ready&&reviewWorthWatching&&!storyOpen&&(reviewOffer==='counting'||reviewOffer==='idle')?
       <div
        className={`review-offer ${reviewOffer==='counting'?'is-counting':'is-explicit'} ${reviewOfferPaused?'is-paused':''}`}
        data-review-offer
        onMouseEnter={()=>setReviewOfferPaused(true)}
        onMouseLeave={()=>setReviewOfferPaused(false)}
        onFocusCapture={()=>setReviewOfferPaused(true)}
        onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setReviewOfferPaused(false)}}
        role="status"
        aria-live="polite"
       >
        {reviewOffer==='counting'&&<div className="review-timer" aria-hidden="true">
         <svg viewBox="0 0 44 44" focusable="false">
          <circle className="review-timer-track" cx="22" cy="22" r="19" pathLength="100"/>
          <circle className="review-timer-progress" cx="22" cy="22" r="19" pathLength="100"/>
         </svg>
         <span>{reviewCountdown}</span>
        </div>}
        <div className="review-offer-meta">
         <strong>{storyStartPending?'Preparing review':'Review ready'}</strong>
         <div className="review-offer-actions">
          <button type="button" onClick={startStory}>{reviewOffer==='counting'?'Watch now':'Watch review'}</button>
          <button type="button" onClick={skipReviewOffer}>Skip</button>
         </div>
        </div>
       </div>
       :verification&&reviewWorthWatching&&<button ref={replayButton} type="button" className="masthead-play-review" onClick={replayStory}>Play review</button>}
     </div>

     {verification&&<nav className="result-chapters" aria-label="Result sections">
      <a href="#review-summary" className={activeResultSection==='summary'?'is-current':''} aria-current={activeResultSection==='summary'?'location':undefined} onClick={()=>setActiveResultSection('summary')}>Summary</a>
      <a href="#original-message" className={activeResultSection==='message'?'is-current':''} aria-current={activeResultSection==='message'?'location':undefined} onClick={()=>setActiveResultSection('message')}>Message</a>
      <a href={verification.safe_action||verification.contact||decisionClaim?.action?'#next-step':'#source-checks'} className={activeResultSection==='next'?'is-current':''} aria-current={activeResultSection==='next'?'location':undefined} onClick={()=>setActiveResultSection('next')}>Next step</a>
      {!directCourtUnavailable&&<a href="#checked-details" className={activeResultSection==='checked'?'is-current':''} aria-current={activeResultSection==='checked'?'location':undefined} onClick={()=>setActiveResultSection('checked')}>Checked details</a>}
     </nav>}
    </header>

    {file?.kind==='pdf'&&<StoryPdfPage url={file.preview} preloadOnly onReady={()=>setStoryArtifactReady(true)}/>}
    {file?.sample&&<div className="source-failure sample-warning" role="status">This document is marked SAMPLE. It is an example form, not a summons to act on. Claim checks below do not authenticate an individual notice.</div>}
    {liveFailed&&<div className="source-failure" role="status"><span>The court’s live pages didn’t respond. Affected claims remain unverified.</span><button onClick={()=>run('LIVE')} disabled={busy}>Check live sources</button></div>}

    {verification&&ready&&storyOpen&&<div className={`story-overlay ${storyClosing?'is-closing':''}`} role="dialog" aria-modal="true" aria-label="SEAL verification review">
     <div ref={storyPlayerRef} className={`story-player ${storyPlaying?'is-playing':'is-paused'} ${storyFocusBox?'has-story-focus':'no-story-focus'}`}>
      <div className="story-topbar">
       <span className="story-brand"><img src="/brand/seal-mark-white.svg" alt=""/><span>SEAL</span></span>
       <div className="story-top-actions">
        <span className="story-chapter-label" aria-live="polite">{STORY_CHAPTERS[storyStep].label}</span>
        <button type="button" onClick={closeStory}>Full evidence</button>
       </div>
      </div>

      <div className="story-stage">
       <div className="story-document-stage">
        <span className="story-stage-label">Your message</span>

        <div className="story-comparison">
         <div className="story-document-region">
          {file?.kind==='image'?<div
            className="story-image-wrap"
            style={{transformOrigin:storyFocusBox?`${(storyFocusBox.x+storyFocusBox.width/2)*100}% ${(storyFocusBox.y+storyFocusBox.height/2)*100}%`:'50% 50%'}}
           >
            <img data-story-artifact src={file.preview} alt="Your uploaded notice"/>
            {storyFocusBox&&<span className="story-highlight"/>}
           </div>
           :file?.kind==='pdf'?
            <StoryPdfPage url={file.preview} focusBox={storyFocusBox}/>
           :<div className="story-text-document">
            <span>Pasted message</span>
            <p>{cleanDisplayText(text.slice(0,900))}</p>
           </div>}
         </div>

         <div className="story-source-region">
          <div className="story-source-panel" aria-hidden={storyStep<2||storyStep>3}>
           <span>{storySourceLabel}</span>
           <strong>{storyEvidence?.title||'No supported public source available'}</strong>
           <p>{storySourceDisplay}</p>
           {storyEvidence&&<a href={storyEvidence.url} target="_blank" rel="noopener noreferrer">Open source</a>}
          </div>
         </div>
        </div>

        <div className="story-claim-anchor" aria-hidden={storyStep<1||storyStep>2}>
         <span>From the message</span>
         <strong>{storyClaimDisplay||storyClaimHeading}</strong>
        </div>

        <div className="story-verdict-scrim" aria-hidden="true"/>
        <div className={`story-verdict-panel ${storyResult?.verdict==='MISMATCH'||storySignal?.kind==='SOURCE_CONFLICT'?'is-conflict':''}`} aria-hidden={storyStep!==3}>
         <strong>{storyVerdict}</strong>
        </div>

        <div className="story-action-panel" aria-hidden={storyStep!==4}>
         <span>Safest next step</span>
         <strong>{storyFinalTitle}</strong>
         <p>{storyFinalSummary}</p>
         {verification.contact?.name&&<small>{verification.contact.name}{verification.contact.phone?` · ${verification.contact.phone}`:''}</small>}
         <div className="story-final-actions">
          {verification.contact?.website&&<a href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open official court website</a>}
          {!verification.contact?.website&&verification.safe_action&&<a href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label}</a>}
         </div>
        </div>
       </div>
      </div>

      <div className="story-transport" aria-label="Review playback controls">
       <button
        ref={storyPauseButton}
        type="button"
        className="story-play-toggle"
        onClick={toggleStoryPlayback}
        aria-label={storyPlaying?'Pause review':storyTimelineTime.current>=STORY_TOTAL-.04?'Replay review':'Play review'}
       >
        <span className={`story-control-icon ${storyPlaying?'is-pause':'is-play'}`} aria-hidden="true"/>
        <span>{storyPlaying?'Pause':storyTimelineTime.current>=STORY_TOTAL-.04?'Replay':'Play'}</span>
       </button>

       <div className="story-timeline">
        <div className="story-timeline-track" aria-hidden="true">
         <span className="story-played" ref={storyPlayedRef}/>
         {STORY_CHAPTERS.slice(1).map(chapter=><span
          key={chapter.label}
          className="story-chapter-tick"
          style={{left:`${(chapter.start/STORY_TOTAL)*100}%`}}
         />)}
        </div>
        <input
         ref={storyScrubberRef}
         className="story-seek"
         type="range"
         min="0"
         max={STORY_TOTAL}
         step="0.01"
         defaultValue="0"
         aria-label="Review timeline"
         onChange={event=>seekStory(Number(event.currentTarget.value))}
        />
        <div className="story-chapter-buttons" aria-hidden="false">
         {STORY_CHAPTERS.map(chapter=><button
          key={chapter.label}
          type="button"
          className={STORY_CHAPTERS[storyStep].label===chapter.label?'is-current':''}
          style={{left:`${(chapter.start/STORY_TOTAL)*100}%`}}
          onClick={()=>seekStory(chapter.start)}
          aria-label={`Jump to ${chapter.label}`}
          title={chapter.label}
         />)}
        </div>
       </div>

       <span className="story-timecode" aria-label="Review time">
        <span ref={storyTimeLabelRef}>0:00</span>
        <span aria-hidden="true"> / </span>
        <span>{formatStoryTime(STORY_TOTAL)}</span>
       </span>
      </div>
     </div>
    </div>}

    <div className="review-hero">
     <div className="decision-pane" id="review-summary">
      <div className="review-tools">
       {isDemo&&<select aria-label="Choose demo fixture" value={fixture} onChange={event=>chooseFixture(event.target.value as FixtureKey)}>
        {Object.entries(fixtures).map(([key,value])=><option value={key} key={key}>{value.title}</option>)}
       </select>}
       {verification&&<a href="#full-evidence" className="full-evidence-link">Full evidence</a>}
       <button type="button" className="review-new-check" onClick={clear}>Check another message</button>
      </div>

      {!verification?
       <div className={`precheck ${error?'has-error':''}`}>
        <h1>{busy?'Checking this message':error?(file?'We couldn’t check this image.':'We couldn’t check this message.'):'Ready to check this message.'}</h1>
        <p>{busy?(status||'Working through the message…'):error?error:'Keep the original beside the result while SEAL checks independently sourced information.'}</p>
        {busy?
         <div className="check-status" role="status" aria-live="polite" aria-label={status||'Checking the message'}>
          <span>{status||'Checking the message'}</span>
          <small>{status==='Reading text from the image'?'Reading locally before any text is checked.':'Keep this tab open while this check finishes.'}</small>
         </div>
         :error?
         <div className="precheck-actions">
          <button type="button" className="run-button" onClick={clear}>{file?'Choose another file':'Start again'}</button>
          {text.trim()&&<button type="button" className="replay-button" onClick={()=>run()}>Try again</button>}
         </div>
         :
         <button type="button" className="run-button" disabled={busy||!text.trim()||!hydrated} onClick={()=>run()}>Check this message</button>}
        <p className="precheck-note">{file?'The original file stays in this browser. Only extracted text is sent for claim structuring.':'Pasted text can be sent for claim structuring; SEAL does not store it.'}</p>
       </div>
       :
       <div className="decision">
        <h1>{decision.title}</h1>
        <p className="decision-summary">{decision.summary}</p>

        {decisionClaim&&<div className="decision-claim">
         <span>From the message</span>
         <p>{decisionClaimDisplay||cleanDisplayText(decisionClaim.value)}</p>
        </div>}

        <div className={`decision-evidence decision-relationship-block ${decisionRelationshipConflict?'is-conflict':''}`}>
         <span>Source relationship</span>
         <strong>{decisionRelationship}</strong>
         {directCheckSummary&&<small className="decision-direct-check">{directCheckSummary}</small>}
        </div>

        {reviewWorthWatching&&!storyOpen&&<button type="button" className="decision-review-player" onClick={replayStory}>
         <span className="decision-review-play" aria-hidden="true">▶</span>
         <span><strong>Play evidence review</strong><small>17 sec · message → source → next step</small></span>
        </button>}
       </div>}
     </div>

     <div className="document-zone" id="original-message">
      <div className="document-heading"><span>Original message</span><span>{file?.kind==='pdf'?'PDF':file?'Image':'Text'}</span></div>
      <div className={`document-paper ${!file?'is-text-document':''}`}>
       {isActionDemo?
        <div className="message-card">
         <div className="message-card-head"><span>DEMO / SYNTHETIC MESSAGE</span><span>NOT A REAL PERSON</span></div>
         <div className="message-sender"><span>Unknown sender</span><strong>Claims to be a federal court</strong></div>
         {renderTextLines(text.split('\n').slice(1))}
         <div className="notice-end">Synthetic engineering example based on published jury-scam patterns. It does not prove real-world accuracy or demand. SEAL is not affiliated with any court.</div>
        </div>
        :isDemo?
        <div className="message-card">
         <div className="message-card-head"><span>Fictional notice</span><span>Product demonstration only</span></div>
         {renderTextLines(text.split('\n').slice(1))}
         <div className="notice-end">This example uses fictional personal details. SEAL is not affiliated with any court.</div>
        </div>
        :!file?
        <div className="message-card pasted-message">
         <div className="message-card-head"><span>Pasted message</span><span>Original text</span></div>
         {renderTextLines(text.split('\n'))}
        </div>
        :file.kind==='image'?
        <div className="preview-box">
         <img src={file.preview} alt="Uploaded notice"/>
         {claims.filter(claim=>claim.source_bbox&&claim.page===1).map(claim=><button
          type="button"
          key={claim.id}
          aria-label={`Select ${claim.label}`}
          className={`bbox ${claim.source_bbox!.height<.012?'is-thin':''} ${active===claim.id?'focused':''}`}
          style={{left:`${claim.source_bbox!.x*100}%`,top:`${claim.source_bbox!.y*100}%`,width:`${claim.source_bbox!.width*100}%`,height:`${claim.source_bbox!.height*100}%`}}
          onClick={()=>select(claim.id)}
          onMouseEnter={()=>setHovered(claim.id)}
          onMouseLeave={()=>setHovered('')}
          ref={element=>{anchors.current[claim.id]=element}}
         />)}
        </div>
        :
        <PDFPreview url={file.preview} claims={claims} active={active} anchors={anchors} onSelect={select}/>}
      </div>
     </div>
    </div>

    {ready&&<div id="full-evidence" className="full-evidence-anchor" aria-hidden="true"/>}

    {ready&&verification&&<section className="source-resolution" id="source-checks" aria-label="Evidence and safe next step">
     <div className="section-heading evidence-heading">
      <h2>Independent evidence</h2>
     </div>

     {verification.signals&&verification.signals.length>0?
      <div className="source-signals">
       {verification.signals.map(signal=>{
        const primary=signal.id===storySignal?.id;
        const evidenceTitles=signal.evidence.map(evidence=>evidence.title);
        return <article className={`source-signal ${primary?'is-primary':'is-secondary'}`} key={signal.id}>
         <p className="signal-kind">{signal.kind==='SOURCE_CONFLICT'?'Source conflict':signal.kind==='KNOWN_PATTERN'?'Known pattern':'Official warning'}</p>
         <h3>{signal.title}</h3>
         <p>{signal.summary}</p>
         {signal.evidence.length>0&&<div className="signal-links">
          {signal.evidence.length>1&&<span className="signal-links-label">Sources</span>}
          {signal.evidence.map((evidence,index)=><a href={evidence.url} target="_blank" rel="noopener noreferrer" key={`${signal.id}-${index}`}>{compactEvidenceTitle(evidence.title,index,evidenceTitles)} <span aria-hidden="true">→</span></a>)}
         </div>}
        </article>;
       })}
      </div>
      :directEvidenceFindings.length>0?
      <div className="source-signals direct-evidence-findings">
       {directEvidenceFindings.map(({claim,result})=>{
        const primary=claim.id===decisionClaim?.id;
        const evidenceTitles=result.evidence.map(evidence=>evidence.title);
        return <article className={`source-signal direct-evidence-finding ${primary?'is-primary':'is-secondary'}`} key={claim.id}>
         <p className="signal-kind">{result.verdict==='MATCH'?'Official source match':result.verdict==='MISMATCH'?'Official source conflict':'Source evidence'}</p>
         <h3>{claim.label}{claim.value?`: ${cleanDisplayText(claim.value)}`:''}</h3>
         <p>{result.explanation}</p>
         <div className="signal-links">
          {result.evidence.length>1&&<span className="signal-links-label">Sources</span>}
          {result.evidence.map((evidence,index)=><a href={evidence.url} target="_blank" rel="noopener noreferrer" key={`${claim.id}-${index}`}>{compactEvidenceTitle(evidence.title,index,evidenceTitles)} <span aria-hidden="true">→</span></a>)}
         </div>
        </article>;
       })}
      </div>
      :<div className="source-signals source-evidence-empty">
       <article className="source-signal is-primary">
        <p className="signal-kind">Source coverage</p>
        <h3>{directCourtUnavailable?'Direct court check unavailable':'No independent source evidence was available for this result.'}</h3>
        <p>{directCourtUnavailable?'SEAL can describe the action in this message, but cannot confirm this case with the issuing court.':'The inspection below shows what SEAL could and could not establish from its supported sources.'}</p>
       </article>
      </div>}

     {verification&&!verification.safe_action&&decisionClaim?.action&&<div className="unsupported-next-step" id="next-step">
      <span>Coverage limit</span>
      <h2>SEAL could not add enough independent evidence for this message.</h2>
      <p>Do not treat this result as approval or rejection of the message. If you need to act, start from the issuing court’s official site that you find independently rather than from a link, QR code, or phone number in the message.</p>
     </div>}
     {verification?.safe_action&&<div className="safe-route" id="next-step">
      <div>
       <h2>Safest next step</h2>
       <p>{verification.safe_action.summary}</p>
      </div>
      <div>
       <ol className="safe-steps">{verification.safe_action.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
       <div className="safe-route-actions">
        {verification.contact?.website&&<a className="safe-primary" href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open official court website</a>}
        {verification.safe_action.primary_url&&verification.safe_action.primary_url!==verification.contact?.website&&<div className="safe-supporting">
         <span>Supporting guidance</span>
         <a href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label} <span aria-hidden="true">→</span></a>
        </div>}
       </div>
      </div>
     </div>}

     <p className="resolution-disclaimer">These sources can inform the check, but they cannot confirm who sent the message.</p>
    </section>}

    {ready&&verification?.contact&&<section className="contact-section" id={verification.safe_action?undefined:'next-step'} aria-label="Independent court contact">
     <div className="court-contact">
      <div>
       <h3>Independent court contact</h3>
       <p>{verification.contact.name||(verification.resolver_id==='connecticut'?'District of Connecticut Jury Office':'Court contact')}</p>
      </div>
      <div>
       <a className="contact-phone" href={`tel:${verification.contact.phone}`}>{verification.contact.phone}</a>
       <div className="contact-actions">
        <a href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open court website</a>
        <button onClick={()=>run('LIVE')} disabled={busy}>Check live sources</button>
       </div>
       <p className="contact-source">These details come from the court source, not the uploaded message. {verification.contact.source.source_mode==='SNAPSHOT'?'Source snapshot checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.':'Live source checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.'}</p>
      </div>
     </div>
    </section>}

    {ready&&!directCourtUnavailable&&<section className="record-section" id="checked-details">
     <div className="section-heading record-heading">
      <h2>What was checked</h2>
      <p>Inspect each extracted detail and the source evidence available for it.</p>
     </div>

     <div className="record-layout">
      <div className="claim-index">
       <div className="index-title">
        <span>Checked details</span>
        <button type="button" className="mobile-index-toggle" onClick={()=>setShowIndex(value=>!value)}>{showIndex?'Hide list':'Show list'}</button>
       </div>
       <div className={`claim-index-list ${showIndex?'mobile-open':''}`}>
        {claims.map((claim,index)=>{
         const result=resultById.get(claim.id);
         return <button type="button" key={claim.id} className={`index-item ${selected===claim.id?'selected':''}`} disabled={!result} onClick={()=>select(claim.id)}>
          <span className="index-ordinal">{String(index+1).padStart(2,'0')}</span>
          <span className="index-claim">{claim.type==='authority'?`${claim.label} · ${cleanDisplayText(claim.value)}`:claim.label}</span>
          <span className={`index-state ${result?result.verdict.toLowerCase():''}`}>{result?stateWord(result.verdict):'—'}</span>
         </button>;
        })}
       </div>
      </div>

      {current&&currentResult&&<div className="focused-evidence" aria-live="polite">
       <div className="focus-number">
        <span>{current.label}</span>
        <span className={`state-text ${currentResult.verdict.toLowerCase()}`}>{verdictLabel(currentResult.verdict)}</span>
       </div>
       <div className="from-label">In the message</div>
       <div className="claim-value">{cleanDisplayText(current.value)}</div>
       {cleanDisplayText(current.exact_source_text)!==cleanDisplayText(current.value)&&<p className="exact-source">“{cleanDisplayText(current.exact_source_text)}”</p>}
       <div className="focus-rule"/>
       <div className="source-label">{currentResult.evidence.length?'Official source evidence':'What we can establish'}</div>
       {currentResult.evidence.length?<>
        {(currentResult.explanation==='Official sources currently disagree.'?currentResult.evidence:currentResult.evidence.slice(0,1)).map((evidence,index)=><div className="evidence-excerpt" key={`${evidence.url}-${index}`}>
         <div className="source-name">{evidence.title}</div>
         <div className="source-quote">“{evidence.excerpt}”</div>
         <a className="official-link" href={evidence.url} target="_blank" rel="noopener noreferrer">Open official source</a>
         <div className="source-timestamp">{evidence.source_mode==='LIVE'?'Live official source':'Source snapshot'} · {new Date(evidence.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div>
        </div>)}
        {currentResult.evidence.length>1&&currentResult.explanation!=='Official sources currently disagree.'&&<details className="additional-sources">
         <summary>{currentResult.evidence.length-1} more source excerpt{currentResult.evidence.length>2?'s':''}</summary>
         {currentResult.evidence.slice(1).map((evidence,index)=><div key={index}>
          <div>{evidence.title}</div>
          <blockquote>{evidence.excerpt}</blockquote>
          <a href={evidence.url} target="_blank" rel="noopener noreferrer">Open source</a>
          <div className="source-timestamp">{evidence.source_mode} · {new Date(evidence.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div>
         </div>)}
        </details>}
       </>:<div className="no-source">{currentResult.explanation}</div>}
       <div className="why-line">{currentResult.evidence.length?currentResult.explanation:'This does not mean the detail is wrong.'}</div>
      </div>}
     </div>

     <details className="technical-record" open={technicalOpen} onToggle={event=>setTechnicalOpen(event.currentTarget.open)}>
      <summary>Technical record <span>{technicalOpen?'−':'+'}</span></summary>
      <p>Extractor: {extractionMode} · {resolverSummary}</p>
      {technicalEvidence.map((evidence,index)=><p key={evidence.url||index}>{evidence.title} · {evidence.source_mode} · {evidence.checked_at} · <a href={evidence.url} target="_blank" rel="noopener noreferrer">Original source</a></p>)}
     </details>

     {isDemo&&<button className="replay-button" onClick={()=>run('SNAPSHOT')}>Replay check</button>}
    </section>}

   </section>}

  <input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>{const next=event.target.files?.[0];if(next)upload(next);event.target.value=''}}/>

  <footer className="seal-footer">
   <span>SEAL is not affiliated with any court.</span>
  </footer>
 </main>;
}
