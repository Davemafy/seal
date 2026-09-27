/* eslint-disable @next/next/no-img-element -- Native images are required for local blob previews and unoptimized brand marks. */
'use client';

import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Toaster,toast} from 'sonner';
import Link from 'next/link';
import PDFPreview from './pdf-preview';
import StoryPdfPage from './story-pdf-page';
import {fixtures} from '@/lib/fixtures';
import {fallbackExtract,claimsFromExtraction,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '@/lib/extract';
import {readInBrowser,warmOcr,ocrLanguages,ocrLanguageForLocale,type OcrLanguage,type BrowserDocument} from '@/lib/browser-file';
import {clearOrphanedResultArtifacts,clearResultSession,persistResultSession,restoreResultSession} from '@/lib/result-session';
import {officialCourtDirectoryFor} from '@/lib/official-directories';
import {detectDocumentContext,type DetectedDocumentLanguage} from '@/lib/document-context';
import {justiceSupportFor} from '@/lib/justice-support';
import {buildCaseReality,buildCourtQuestionScript,buildHandoffSummary,buildObligationMap,buildPlainLanguageSummary,buildRiskSummary} from '@/lib/user-guidance';
import {DISPLAY_LANGUAGES,displayLocaleFor,uiCopy,type DisplayLocale,type UiCopyKey} from '@/lib/ui-locales';
import type {Claim,Extraction,Result,Token,Verification} from '@/lib/types';
import './workspace.css';

type Mode='SNAPSHOT'|'LIVE';
type WorkspaceRunStatus='idle'|'reading'|'verifying'|'done'|'error';
type WorkspaceMeta={id:string;title:string;status:WorkspaceRunStatus;language?:string;jurisdiction?:string;preview?:string};
type SealWorkspaceProps={
 initialDemo?:boolean;
 initialText?:string;
 initialRun?:boolean;
 workspaceId:string;
 workspaces:WorkspaceMeta[];
 onNewWorkspace:()=>void;
 onSelectWorkspace:(id:string)=>void;
 onDeleteWorkspace:(id:string)=>void;
 onWorkspaceMeta:(id:string,patch:Partial<WorkspaceMeta>)=>void;
};


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
 .replace(/^(?:[~≈·|:;,.\-–—]\s*)+|(?:\s*[~≈·|:;,.\-–—])+$/g,'')
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

function SealGuideIcon({direction='down'}:{direction?:'down'|'right'|'left'|'up'}){
 return <svg className={`seal-guide-icon is-${direction}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
  <path d="M2.5 5.95c0-.72.3-1.3.9-1.77L5.78 2.2h5.76c.52 0 .94.42.94.94v1.48l-2.42 2.3H3.9c-.79 0-1.4-.36-1.4-.97Z" fill="currentColor"/>
  <path d="M3.9 8.58h6.06l2.52 2.27-2.27 2.45H2.5v-2.08c0-.65.27-1.2.8-1.64l.6-.5Z" fill="currentColor"/>
  <path d="M3.9 6.92h6.16L8.58 8.58H3.9c-.8 0-1.4-.34-1.4-.94 0 .52.65.94 1.4.94Z" fill="currentColor" opacity=".32"/>
 </svg>;
}

function DesignPlayIcon(){
 return <svg className="design-play-icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
  <path d="M5 3.6 10.1 7 5 10.4Z" fill="currentColor"/>
 </svg>;
}

type SealUiIconName='add'|'browse'|'globe'|'refresh'|'copy'|'message'|'download'|'list'|'workspaces'|'delete'|'close';

function SealUiIcon({name}:{name:SealUiIconName}){
 const common={fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {name==='add'&&<><path {...common} d="M12 5v14"/><path {...common} d="M5 12h14"/></>}
  {name==='browse'&&<><rect {...common} x="4.5" y="4.5" width="5.5" height="5.5" rx="1.2"/><rect {...common} x="14" y="4.5" width="5.5" height="5.5" rx="1.2"/><rect {...common} x="4.5" y="14" width="5.5" height="5.5" rx="1.2"/><rect {...common} x="14" y="14" width="5.5" height="5.5" rx="1.2"/></>}
  {name==='globe'&&<><circle {...common} cx="12" cy="12" r="8.25"/><path {...common} d="M3.9 12h16.2M12 3.75c2.15 2.2 3.2 4.95 3.2 8.25S14.15 18.05 12 20.25C9.85 18.05 8.8 15.3 8.8 12S9.85 5.95 12 3.75Z"/></>}
  {name==='refresh'&&<><path {...common} d="M19 8.2V4.8h-3.4"/><path {...common} d="M18.15 6.2A7.55 7.55 0 1 0 19.2 15"/></>}
  {name==='copy'&&<><rect {...common} x="8.25" y="8.25" width="10.25" height="10.25" rx="2"/><path {...common} d="M15.75 8.25V6.6a2.1 2.1 0 0 0-2.1-2.1H6.6a2.1 2.1 0 0 0-2.1 2.1v7.05a2.1 2.1 0 0 0 2.1 2.1h1.65"/></>}
  {name==='message'&&<><path {...common} d="M5.1 5.25h13.8a1.85 1.85 0 0 1 1.85 1.85v8.15a1.85 1.85 0 0 1-1.85 1.85H10l-4.75 3v-3H5.1a1.85 1.85 0 0 1-1.85-1.85V7.1A1.85 1.85 0 0 1 5.1 5.25Z"/><path {...common} d="M8 9.25h8M8 13h5.25"/></>}
  {name==='download'&&<><path {...common} d="M12 4.5v10.25"/><path {...common} d="m8.3 11.4 3.7 3.7 3.7-3.7"/><path {...common} d="M5 18.75h14"/></>}
  {name==='list'&&<><path {...common} d="M9 6.5h10M9 12h10M9 17.5h10"/><circle cx="5" cy="6.5" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17.5" r="1" fill="currentColor"/></>}
  {name==='workspaces'&&<><rect {...common} x="7.25" y="5.25" width="11.5" height="13.5" rx="1.8"/><path {...common} d="M5.25 8.25H4.8A1.8 1.8 0 0 0 3 10.05v7.15A1.8 1.8 0 0 0 4.8 19h.45M9.75 9h6.5M9.75 12.25h6.5M9.75 15.5h4.25"/></>}
  {name==='delete'&&<><path {...common} d="M5.5 7.25h13M9 7.25V5.5h6v1.75M7.5 7.25l.65 11h7.7l.65-11M10 10.5v4.75M14 10.5v4.75"/></>}
  {name==='close'&&<><path {...common} d="m6.5 6.5 11 11M17.5 6.5l-11 11"/></>}
 </svg>;
}

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
 const letters=(compact.match(/\p{L}/gu)||[]).length;
 const garbage=(compact.match(/[^\p{L}\p{M}\p{N}.,:;()/#$₦₹£€%&@'’"!?+\-–—]/gu)||[]).length;
 return letters>=3&&garbage<=Math.max(2,Math.floor(compact.length*.08));
}
function claimReliable(claim:Claim){
 if(claim.verification_eligible===false)return false;
 if(!claimTextUseful(claim))return false;
 const threshold=claim.action?66:80;
 return typeof claim.field_confidence!=='number'||claim.field_confidence>=threshold;
}

type ProcessRegion={x:number;y:number;width:number;height:number};

function processingTextRegions(tokens:Token[]):ProcessRegion[]{
 const page=tokens
  .filter(token=>token.page===1&&token.text.trim()&&token.width>.004&&token.height>.004)
  .sort((a,b)=>a.y-b.y||a.x-b.x);
 if(!page.length)return [];
 const lines:ProcessRegion[]=[];
 for(const token of page){
  const y=Math.max(0,Math.min(1,token.y));
  const x=Math.max(0,Math.min(1,token.x));
  const width=Math.max(.006,Math.min(1-x,token.width));
  const height=Math.max(.006,Math.min(.12,token.height));
  const center=y+height/2;
  const line=lines.find(item=>Math.abs((item.y+item.height/2)-center)<Math.max(.012,height*.7));
  if(!line){
   lines.push({x,y,width,height});
   continue;
  }
  const right=Math.max(line.x+line.width,x+width);
  line.x=Math.min(line.x,x);
  line.y=Math.min(line.y,y);
  line.width=Math.min(1-line.x,right-line.x);
  line.height=Math.max(line.height,height);
 }
 const useful=lines
  .filter(line=>line.width>.06)
  .sort((a,b)=>b.width-a.width)
  .slice(0,14)
  .sort((a,b)=>a.y-b.y);
 return useful;
}

function claimNarrativelyUsable(claim:Claim){
 if(!claim.action||!claimTextUseful(claim))return false;
 if(typeof claim.field_confidence!=='number')return true;
 return claim.field_confidence>=52;
}

function chooseDecisionClaim(claims:Claim[],verification:Verification){
 const resultById=new Map(verification.results.map(result=>[result.claim_id,result]));
 const actions=claims.filter(claim=>Boolean(claim.action)&&claimReliable(claim));
 const usableActions=claims.filter(claimNarrativelyUsable);
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
  ||usableActions.find(claim=>mismatch(claim))
  ||usableActions.find(hasEvidence)
  ||usableActions[0]
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
  summary:'These instructions come from the message itself. SEAL has not confirmed the case or sender with the court.'
 };
 return {
  title:'No supported check',
  summary:'SEAL does not have enough independent source coverage for this message.'
 };
}

function SealWorkspace({initialDemo=false,initialText='',initialRun=false,workspaceId,workspaces,onNewWorkspace,onSelectWorkspace,onDeleteWorkspace,onWorkspaceMeta}:SealWorkspaceProps){
 const [hydrated,setHydrated]=useState(false);
 const [text,setText]=useState(initialText||(initialDemo?fixtures['action-message-demo'].text:''));
 const [draft,setDraft]=useState('');
 const [file,setFile]=useState<BrowserDocument|null>(null);
 const [uploadPreview,setUploadPreview]=useState<{url:string;name:string;kind:'image'|'pdf'}|null>(null);
 const [claims,setClaims]=useState<Claim[]>([]);
 const [verification,setVerification]=useState<Verification|null>(null);
 const [mode,setMode]=useState<Mode>('SNAPSHOT');
 const [extractionMode,setExtractionMode]=useState('');
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [dragging,setDragging]=useState(false);
 const [pasteMode,setPasteMode]=useState(false);
 const [ocrLanguage,setOcrLanguage]=useState<OcrLanguage>('eng');
 const [displayLocale,setDisplayLocale]=useState<DisplayLocale>('en');
 const [languageMenuOpen,setLanguageMenuOpen]=useState(false);
 const [workspaceDrawerOpen,setWorkspaceDrawerOpen]=useState(false);
 const [translatedResult,setTranslatedResult]=useState<Record<string,string>>({});
 const [resultTranslationState,setResultTranslationState]=useState<'idle'|'translated'|'unavailable'>('idle');
 const [documentLanguage,setDocumentLanguage]=useState<DetectedDocumentLanguage|null>(null);
 const [jurisdiction,setJurisdiction]=useState('');
 const [workspaceTitle,setWorkspaceTitle]=useState('New check');
 const [revealed,setRevealed]=useState(0);
 const [selected,setSelected]=useState('');
 const [hovered,setHovered]=useState('');
 const [showIndex,setShowIndex]=useState(false);
 const [activeResultSection,setActiveResultSection]=useState<'summary'|'message'|'evidence'|'next'>('summary');
 const [technicalOpen,setTechnicalOpen]=useState(false);
 const [,setHandoffCopied]=useState(false);
 const [,setQuestionCopied]=useState(false);
 const workspaceRootRef=useRef<HTMLElement>(null);
 const resultCarouselRef=useRef<HTMLDivElement>(null);
 const sectionId=(base:string)=>workspaceId==='primary'?base:`${base}-${workspaceId}`;
 const jumpToResultSection=useCallback((event:React.MouseEvent<HTMLAnchorElement>,section:'summary'|'message'|'evidence'|'next',targetBase:string)=>{
  event.preventDefault();
  const carousel=resultCarouselRef.current;
  const slide=carousel?.querySelector<HTMLElement>(`[data-result-section="${section}"]`);
  if(!carousel||!slide)return;
  const currentIndex=carousel.clientWidth?Math.round(carousel.scrollLeft/carousel.clientWidth):0;
  const targetIndex=Math.max(0,Math.round(slide.offsetLeft/Math.max(1,carousel.clientWidth)));
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const adjacent=Math.abs(targetIndex-currentIndex)===1;
  slide.scrollTo({top:0,behavior:'auto'});
  setActiveResultSection(section);
  carousel.scrollTo({left:slide.offsetLeft,behavior:reduce||!adjacent?'auto':'smooth'});
  const id=workspaceId==='primary'?targetBase:`${targetBase}-${workspaceId}`;
  window.history.replaceState(null,'',`#${id}`);
 },[workspaceId]);
 const syncResultCarousel=useCallback((event:React.UIEvent<HTMLDivElement>)=>{
  const carousel=event.currentTarget;
  if(!carousel.clientWidth)return;
  const index=Math.max(0,Math.min(3,Math.round(carousel.scrollLeft/carousel.clientWidth)));
  const next=(['summary','message','evidence','next'] as const)[index];
  setActiveResultSection(current=>current===next?current:next);
 },[]);
 const [reviewOffer,setReviewOffer]=useState<'idle'|'counting'|'skipped'|'watching'|'completed'>('idle');
 const [,setReviewCountdown]=useState(3);
 const [,setReviewOfferPaused]=useState(false);
 const [storyArtifactReady,setStoryArtifactReady]=useState(true);
 const [,setStoryStartPending]=useState(false);
 const [storyOpen,setStoryOpen]=useState(false);
 const [storyStep,setStoryStep]=useState(0);
 const [storyPlaying,setStoryPlaying]=useState(true);
 const [storyClosing,setStoryClosing]=useState(false);
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
 const localeInitialized=useRef(false);
 const filePickerArmed=useRef(false);
 const sourceBlobRef=useRef<Blob|null>(null);
 const uploadPreviewRef=useRef<string|null>(null);
 const processingIntakeRef=useRef<HTMLDivElement>(null);
 const uploadOriginRectRef=useRef<{left:number;top:number;width:number;height:number}|null>(null);
 const activeReadRef=useRef<AbortController|null>(null);
 const activeRequestRef=useRef<AbortController|null>(null);
 const input=useRef<HTMLInputElement>(null);
 const anchors=useRef<Record<string,HTMLElement|null>>({});
 const runId=useRef(0);
 const ui=(key:UiCopyKey)=>uiCopy(displayLocale,key);

 useEffect(()=>()=> {
  activeReadRef.current?.abort();
  activeRequestRef.current?.abort();
  storyTimelineRef.current?.kill();
  if(storyCloseTimer.current)window.clearTimeout(storyCloseTimer.current);
  if(uploadPreviewRef.current)URL.revokeObjectURL(uploadPreviewRef.current);
 },[]);

 useEffect(()=>{
  if(!workspaceDrawerOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setWorkspaceDrawerOpen(false)};
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)};
 },[workspaceDrawerOpen]);

 const handleStoryArtifactReady=useCallback(()=>{
  setStoryArtifactReady(true);
  setStoryStartPending(false);
  setReviewOfferPaused(false);
  setReviewCountdown(3);
 },[]);

 useLayoutEffect(()=>{
  if(!busy||!uploadPreview?.url||!processingIntakeRef.current)return;
  const root=processingIntakeRef.current;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(media.matches){uploadOriginRectRef.current=null;return}

  const current=root.getBoundingClientRect();
  const origin=uploadOriginRectRef.current;
  uploadOriginRectRef.current=null;

  const context=gsap.context(()=>{
   const timeline=gsap.timeline({defaults:{ease:'power3.out'}});
   if(origin&&current.width>0&&current.height>0){
    timeline.fromTo(root,{
     x:origin.left-current.left,
     y:origin.top-current.top,
     scaleX:origin.width/current.width,
     scaleY:origin.height/current.height,
     transformOrigin:'50% 0%'
    },{
     x:0,y:0,scaleX:1,scaleY:1,duration:.46,clearProps:'transform'
    },0);
   }else{
    timeline.fromTo(root,{opacity:.8,y:6},{opacity:1,y:0,duration:.3,clearProps:'opacity,transform'},0);
   }

   timeline.fromTo('.upload-process-media',
    {opacity:0,scale:.94},
    {opacity:1,scale:1,duration:.34,clearProps:'opacity,transform'},
    .06
   );
   timeline.fromTo('.upload-process-body',
    {opacity:0,x:12},
    {opacity:1,x:0,duration:.3,clearProps:'opacity,transform'},
    .12
   );
  },root);

  return()=>context.revert();
 },[busy,uploadPreview?.url]);

 const isDemo=!file&&/^DEMO \/ (?:FICTIONAL NOTICE|SYNTHETIC MESSAGE)/.test(text);
 const isActionDemo=isDemo&&text.startsWith('DEMO / SYNTHETIC MESSAGE');
 const resultById=useMemo(()=>new Map(verification?.results.map(result=>[result.claim_id,result])||[]),[verification]);
 const requestedActions=useMemo(()=>claims.filter(claim=>Boolean(claim.action)),[claims]);
 const groundedActions=useMemo(()=>requestedActions.filter(claimReliable),[requestedActions]);
 const messageDetails=useMemo(()=>claims.filter(claim=>
  ['court','location','docket','reporting_date'].includes(claim.type)&&claimReliable(claim)
 ),[claims]);
 const scheduleQuote=useMemo(()=>text.match(/\b(?:hearing|conference|appearance|court date)\b[^.!?\n]{0,90}\b(?:scheduled for|set for|on)\b[^.!?\n]{0,120}/i)?.[0].trim()||'',[text]);
 const noPaymentQuote=useMemo(()=>text.match(/\b(?:no payment (?:is )?(?:requested|required|due)|payment is not (?:requested|required|due)|do not (?:pay|send payment))\b[^.!?\n]{0,70}/i)?.[0].trim()||'',[text]);
 const curatedSignal=verification?.signals?.find(signal=>signal.id.startsWith('curated-'));
 const storySignal=curatedSignal
  ||verification?.signals?.find(signal=>signal.id==='traffic-qr-warning')
  ||verification?.signals?.find(signal=>signal.kind==='SOURCE_CONFLICT')
  ||verification?.signals?.[0];
 const decisionClaim=verification?chooseDecisionClaim(claims,verification):undefined;
 const evidenceBackedClaim=verification?claims.find(claim=>Boolean(resultById.get(claim.id)?.evidence?.length)):undefined;
 const decisionClaimResult=decisionClaim?resultById.get(decisionClaim.id):undefined;
 const storyClaim=decisionClaim&&Boolean(decisionClaimResult?.evidence?.length)
  ?decisionClaim
  :evidenceBackedClaim||decisionClaim;
 const storyResult=storyClaim?resultById.get(storyClaim.id):undefined;
 const firstVerificationEvidence=verification?.results.find(result=>result.evidence.length)?.evidence?.[0];
 const storyEvidence=storySignal?.evidence?.[0]||storyResult?.evidence?.[0]||verification?.safe_action?.evidence?.[0]||firstVerificationEvidence||verification?.contact?.source;
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
  :storySignal
   ?storySignal.title
   :storyResult?.verdict==='MATCH'
    ?'This detail matches the source.'
    :storyResult?.verdict==='MISMATCH'
     ?'This detail conflicts with the source.'
     :'We couldn’t confirm this detail.';
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
  :storySignal?.kind==='OFFICIAL_PROCESS'
   ?'Official process'
   :storySignal?.kind==='OFFICIAL_DIRECTORY'
    ?'Official court directory'
   :storySignal?.id.startsWith('curated-')
    ?'Issuing authority'
    :storySignal?.id==='traffic-qr-warning'&&/ftc\.gov/i.test(storyEvidence.url)
     ?'Federal consumer guidance'
     :storySignal?.kind==='SOURCE_CONFLICT'
      ?'Official source'
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
 const curatedAuthorityMatch=Boolean(storySignal?.id.startsWith('curated-')&&verification?.safe_action?.evidence?.length);
 const officialDirectory=useMemo(()=>officialCourtDirectoryFor(text),[text]);
 const justiceSupport=useMemo(()=>justiceSupportFor(text),[text]);
 const riskSummary=useMemo(()=>verification?buildRiskSummary(claims,verification):null,[claims,verification]);
 const caseReality=useMemo(()=>verification?buildCaseReality(claims,verification):null,[claims,verification]);
 const obligations=useMemo(()=>verification?buildObligationMap(claims,verification):[],[claims,verification]);
 const plainExplanation=useMemo(()=>verification?buildPlainLanguageSummary(claims,verification):null,[claims,verification]);
 const courtQuestionScript=useMemo(()=>verification?buildCourtQuestionScript(claims,verification):'',[claims,verification]);
 const displayedExplanation=plainExplanation?{
  title:translatedResult.plainTitle||plainExplanation.title,
  summary:translatedResult.plainSummary||plainExplanation.summary
 }:null;
 const officialLookup=justiceSupport?.caseLookup||justiceSupport?.court;
 const directCheckSummary=directCourtUnavailable&&!curatedAuthorityMatch?'SEAL did not classify the sender, case, or payment request as genuine or fraudulent.':'';
 const decisionRelationship=storySignal?.id.startsWith('curated-')
  ?'The issuing authority published this artifact as a scam example.'
  :storySignal
   ?storySignal.summary
   :decisionResult?.verdict==='MATCH'
    ?'This detail matches the independent source.'
    :decisionResult?.verdict==='MISMATCH'
     ?'This detail conflicts with the independent source.'
     :directCourtUnavailable
      ?'No reviewed direct court source was available in this check.'
      :'Independent source evidence was not sufficient to verify this detail.';
 const decisionRelationshipConflict=storySignal?.kind==='SOURCE_CONFLICT'||(!storySignal&&decisionResult?.verdict==='MISMATCH');
 const current=claims.find(claim=>claim.id===selected)||claims[0];
 const currentResult=current&&resultById.get(current.id);
 const active=hovered||selected;
 const ready=Boolean(verification)&&revealed>=claims.length;
 const storyHasIndependentEvidence=Boolean(
  verification&&(
   verification.results.some(result=>Boolean(result.evidence?.length))
   ||verification.signals?.some(signal=>Boolean(signal.evidence?.length))
   ||verification.safe_action?.evidence?.length
   ||verification.contact?.source
  )
 );
 const reviewWorthWatching=Boolean(
  verification
  &&storyHasIndependentEvidence
  &&(storyClaim||storySignal||storyEvidence)
 );
 const unsupportedWithoutIndependentFinding=Boolean(
  directCourtUnavailable
  &&!verification?.safe_action
  &&!(verification?.signals?.length)
  &&directEvidenceFindings.length===0
 );
 const decision=unsupportedWithoutIndependentFinding
  ?{
   title:'This message needs a direct court check.',
   summary:groundedActions.length
    ?'SEAL found the instruction below in the original message, but it does not have a reviewed source for this court yet.'
    :'SEAL could read parts of the message, but it does not have a reviewed source for this court yet.'
  }
  :decisionCopy(verification,decisionClaim);
 const hasPaymentAction=groundedActions.some(claim=>claim.action?.kind==='pay')||decisionClaim?.action?.kind==='pay';
 const primaryActionKind=decisionClaim?.action?.kind||groundedActions[0]?.action?.kind;
 const conciseDecisionTitle=curatedAuthorityMatch
  ?decision.title
  :verification?.safe_action&&primaryActionKind==='pay'
   ?'Check it independently before you pay.'
   :verification?.safe_action&&primaryActionKind==='contact'
    ?'Check the number before you call.'
    :verification?.safe_action&&primaryActionKind==='navigate'
     ?'Check the link before you open it.'
     :verification?.safe_action&&primaryActionKind==='disclose'
      ?'Verify the request before you share anything.'
      :verification?.safe_action&&primaryActionKind==='appear'
       ?'Confirm the case before you go.'
       :verification?.safe_action
        ?'Check this before you act.'
        :decision.title;
 const humanDecisionSummary=file?.sample
  ?'This is an example form, not a notice you need to act on.'
  :curatedAuthorityMatch
   ?decision.summary
   :decisionRelationshipConflict
    ?'Something in this message does not line up with the public source we checked. Use an official route before you act.'
    :verification?.safe_action&&hasPaymentAction
     ?'We found an official process that fits parts of this notice, but not enough to confirm this notice or the case. Use the official route below before paying.'
     :verification?.safe_action
      ?'We found official guidance, but not enough to confirm this message. Use the official route below before you act.'
      :directCourtUnavailable
       ?'We could read the message, but we could not confirm the court or case from an independent source yet.'
       :decision.summary;
 const resultStatusLabel=file?.sample
  ?'Example document'
  :curatedAuthorityMatch
   ?'Official warning found'
   :decisionRelationshipConflict
    ?'Something does not line up'
    :directCourtUnavailable
     ?'We could not confirm this notice'
     :verification?.results.some(result=>result.verdict==='MATCH')
      ?'Some details check out'
      :'Check finished';
 const instructionStatus=file?.sample
  ?'Example only'
  :curatedAuthorityMatch
   ?'Do not use this route'
   :verification?.results.some(result=>result.verdict==='MISMATCH'&&claims.find(claim=>claim.id===result.claim_id)?.action)
    ?'Does not match the source'
    :verification?.results.some(result=>result.verdict==='MATCH'&&claims.find(claim=>claim.id===result.claim_id)?.action)
     ?'Some details match'
     :'Not confirmed';
 const matterStatus=file?.sample
  ?'No action needed'
  :caseReality?.status==='FOUND'
   ?'Case found'
   :caseReality?.status==='CONFLICT'
    ?'Does not match the source'
    :'Not confirmed';
 const primaryRoute=file?.sample
  ?null
  :verification?.safe_action?.primary_url
   ?{url:verification.safe_action.primary_url,label:translatedResult.safePrimary||verification.safe_action.primary_label}
   :verification?.contact?.website
    ?{url:verification.contact.website,label:'Open official court website'}
    :officialLookup
     ?{url:officialLookup.url,label:officialLookup.label}
     :officialDirectory
      ?{url:officialDirectory.url,label:officialDirectory.label}
      :null;
 const resultTranslationSource=useMemo(()=>{
  if(!verification)return {};
  const strings:Record<string,string>={
   decisionTitle:file?.sample?'This is a sample form.':conciseDecisionTitle,
   decisionSummary:humanDecisionSummary,
   relationship:decisionRelationship,
   plainTitle:plainExplanation?.title||'',
   plainSummary:plainExplanation?.summary||'',
   riskInstructionsTitle:riskSummary?.instructions.title||'',
   riskInstructionsDetail:riskSummary?.instructions.detail||'',
   riskMatterTitle:riskSummary?.matter.title||'',
   riskMatterDetail:riskSummary?.matter.detail||'',
   caseRealityTitle:caseReality?.title||'',
   caseRealityDetail:caseReality?.detail||'',
   supportHaventTitle:'I haven’t acted yet',
   supportHaventCopy:'Use the independently sourced court route above before calling, paying, scanning, replying, or appearing because of this message.',
   supportPaidTitle:'I already paid',
   supportPaidCopy:'Contact your bank or payment provider through its official app, card, or website and report the transaction immediately.',
   supportSharedTitle:'I shared personal information',
   supportSharedCopy:'Do not send anything else through the message. Use an official recovery service if one is available for this jurisdiction.',
   supportLegalTitle:'I need legal help',
   supportLegalCopy:'Use an official legal-aid service to understand your options for a real legal matter.',
   handoffEyebrow:'Take this with you',
   handoffTitle:'Ask the court without relying on the message',
   handoffCopy:'Use this wording with an independently sourced court channel. It carries the case reference and the exact instructions SEAL recovered without treating them as genuine.',
   courtQuestionScript,
   copyQuestion:'Copy what to ask',
   copyRecord:'Copy verification record',
   saveRecord:'Save verification record',
   handoffNote:'The saved record includes verification states, source links, and source-check timestamps. It does not include a legal opinion.'
  };
  (verification.signals||[]).forEach((signal,index)=>{
   strings['signalTitle'+index]=signal.title;
   strings['signalSummary'+index]=signal.summary;
  });
  verification.results.forEach((result,index)=>{
   strings['resultExplain'+index]=result.explanation;
   const claim=claims.find(candidate=>candidate.id===result.claim_id);
   if(claim)strings['resultLabel'+index]=claim.label;
  });
  if(verification.safe_action){
   strings.safeTitle=verification.safe_action.title;
   strings.safeSummary=verification.safe_action.summary;
   verification.safe_action.steps.forEach((step,index)=>{strings[`safeStep${index}`]=step});
   strings.safePrimary=verification.safe_action.primary_label;
  }
  return strings;
 },[verification,claims,file?.sample,conciseDecisionTitle,humanDecisionSummary,decisionRelationship,plainExplanation,riskSummary,caseReality,courtQuestionScript]);

 useEffect(()=>{
  if(!verification||displayLocale==='en')return;
  const controller=new AbortController();
  void fetch('/api/translate',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({locale:displayLocale,strings:resultTranslationSource}),signal:controller.signal
  }).then(async response=>{
   if(!response.ok){setResultTranslationState('unavailable');return}
   const payload=await response.json() as {strings?:Record<string,string>;mode?:string};
   if(payload.mode!=='TRANSLATED'||!payload.strings){setResultTranslationState('unavailable');return}
   setTranslatedResult(payload.strings);
   setResultTranslationState('translated');
  }).catch(()=>{if(!controller.signal.aborted)setResultTranslationState('unavailable')});
  return()=>controller.abort();
 },[verification,displayLocale,resultTranslationSource]);

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

 const checkObjectTitle=caseReality?.court&&caseReality.court!=='Court not identified'?cleanDisplayText(caseReality.court):'Court message';
 const checkObjectDisplayTitle=checkObjectTitle
  .replace(/^UNITED STATES DISTRICT COURT\s*/i,'U.S. District Court · ')
  .replace(/\s{2,}/g,' ')
  .replace(/·\s*·/g,'·')
  .replace(/·\s*$/,'');
 const checkObjectReference=caseReality?.reference||'';
 const checkSourceCount=technicalEvidence.length;
 const latestCheckTimestamp=technicalEvidence.reduce((latest,evidence)=>{
  const value=Date.parse(evidence.checked_at);
  return Number.isFinite(value)&&value>latest?value:latest;
 },0);
 const checkDateLabel=latestCheckTimestamp
  ?new Date(latestCheckTimestamp).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
  :'';
 const checkInputLabel=file?(file.kind==='pdf'?'PDF':'Image'):'Text';
 const liveFailed=mode==='LIVE'&&['riverside','connecticut'].includes(verification?.resolver_id||'')&&verification?.results.some(result=>result.explanation==='Official source could not be reached during this check.');

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
  if(!storyOpen||!storyArtifactReady)return;
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
 },[storyOpen,storyArtifactReady,buildStoryTimeline]);

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

 useEffect(()=>{
  let cancelled=false;
  if(input.current)input.current.value='';
  filePickerArmed.current=false;

  void (async()=>{
   const caseId=new URLSearchParams(window.location.search).get('case');
   const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
   const freshBrowseHandoff=Boolean(caseId&&navigation?.type!=='reload'&&navigation?.type!=='back_forward');

   if(!freshBrowseHandoff){
    const restored=await restoreResultSession(workspaceId);
    if(cancelled){
     if(restored?.browserFile)URL.revokeObjectURL(restored.browserFile.preview);
     return;
    }
    if(restored){
     initialRunStarted.current=true;
     setText(restored.text);
     setClaims(restored.claims);
     setVerification(restored.verification);
     setMode(restored.mode);
     setExtractionMode(restored.extractionMode);
     setSelected(restored.selected||restored.claims[0]?.id||'');
     setRevealed(restored.claims.length);
     setFile(restored.browserFile);
     sourceBlobRef.current=restored.sourceBlob;
     setStoryArtifactReady(!restored.browserFile);
     setReviewOffer('completed');
    }else{
     void clearOrphanedResultArtifacts(workspaceId).catch(()=>{});
    }
   }

   if(!cancelled)setHydrated(true);
  })();

  return()=>{
   cancelled=true;
   if(storyCloseTimer.current)window.clearTimeout(storyCloseTimer.current);
  };
 },[workspaceId]);

 useEffect(()=>{
  if(!hydrated||localeInitialized.current)return;
  localeInitialized.current=true;
  const browserLocale=typeof navigator!=='undefined'?(navigator.languages?.[0]||navigator.language||'en'):'en';
  setDisplayLocale(displayLocaleFor(browserLocale));
  setOcrLanguage(ocrLanguageForLocale(browserLocale));
 },[hydrated]);

 useEffect(()=>{
  if(!hydrated||busy||verification)return;
  const timer=window.setTimeout(()=>{
   void warmOcr(ocrLanguage).catch(()=>{});
  },350);
  return()=>window.clearTimeout(timer);
 },[hydrated,busy,verification,ocrLanguage]);

 useEffect(()=>{
  if(!hydrated||initialRunStarted.current)return;
  if(initialRun&&initialText){
   initialRunStarted.current=true;
   void run('SNAPSHOT',{text:initialText,file:null});
   return;
  }
  const caseId=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('case'):null;
  if(!caseId)return;
  const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;
  if(navigation?.type==='reload'||navigation?.type==='back_forward'){
   window.history.replaceState(null,'',window.location.pathname);
   return;
  }
  // A Browse handoff is a one-shot action, not persistent app state.
  // Consume the query immediately so refresh/back-to-home never re-runs a file.
  window.history.replaceState(null,'',window.location.pathname);
  initialRunStarted.current=true;
  void (async()=>{
   const controller=new AbortController();
   activeReadRef.current?.abort();
   activeReadRef.current=controller;
   const handoffId=runId.current;
   try{
    setBusy(true);
    setStatus('Opening the source document');
    const [caseResponse,assetResponse]=await Promise.all([
     fetch(`/api/browse-case?id=${encodeURIComponent(caseId)}`,{signal:controller.signal}),
     fetch(`/api/browse-asset?id=${encodeURIComponent(caseId)}`,{signal:controller.signal})
    ]);
    if(controller.signal.aborted||runId.current!==handoffId)return;
    if(!caseResponse.ok)throw new Error('Case unavailable');
    const payload=await caseResponse.json() as {runText?:string;assetType?:'pdf'|'image';ocrLanguage?:OcrLanguage;title?:string};
    const seededText=payload.runText?.trim()||'';

    if(assetResponse.ok&&payload.assetType){
     const blob=await assetResponse.blob();
     const isPdf=payload.assetType==='pdf';
     const type=isPdf?'application/pdf':blob.type.startsWith('image/')?blob.type:'image/jpeg';
     const extension=isPdf?'pdf':type.includes('png')?'png':'jpg';
     const sourceFile=new File([blob],`${caseId}.${extension}`,{type});
     sourceBlobRef.current=sourceFile;
     setStatus('Opening the source document');
     const doc:BrowserDocument=seededText&&!isPdf
      ?{text:seededText,tokens:[],preview:URL.createObjectURL(sourceFile),kind:'image',uncertain:false,sample:false,unreadableFields:[]}
      :await readInBrowser(sourceFile,next=>{if(!controller.signal.aborted&&runId.current===handoffId)setStatus(next)},payload.ocrLanguage||ocrLanguage,controller.signal);
     if(controller.signal.aborted||runId.current!==handoffId){URL.revokeObjectURL(doc.preview);return}
     const analysisText=seededText||doc.text;
     if(!analysisText.trim())throw new Error('Case text unavailable');
     setFile(doc);
     setStoryArtifactReady(false);
     setText(analysisText);
     setBusy(false);
     setStatus('');
     await run('SNAPSHOT',{text:analysisText,file:doc,curated:!!seededText,curatedCaseId:caseId,browse:true});
     return;
    }

    throw new Error('Case asset unavailable');
   }catch{
    if(controller.signal.aborted||runId.current!==handoffId)return;
    setBusy(false);
    setStatus('');
    initialRunStarted.current=false;
    setError('This browse case could not be opened. You can still upload or paste a message.');
   }finally{
    if(activeReadRef.current===controller)activeReadRef.current=null;
   }
  })();
 // This is a one-shot URL handoff. Adding run/ocrLanguage would replay the
 // case after the effect itself mutates result state.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[hydrated,initialRun,initialText]);

 useEffect(()=>{
  if(!file||file.kind!=='image')return;
  let cancelled=false;
  const image=new Image();
  image.src=file.preview;
  const markReady=()=>{if(!cancelled)handleStoryArtifactReady()};
  if(image.complete){
   window.queueMicrotask(markReady);
  }else if(typeof image.decode==='function'){
   void image.decode().then(markReady).catch(markReady);
  }else{
   image.onload=markReady;
   image.onerror=markReady;
  }
  return()=>{cancelled=true;image.onload=null;image.onerror=null};
 },[file,handleStoryArtifactReady]);

 useEffect(()=>{
  if(!storyOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){closeStory();return}
   if(event.key==='ArrowRight'){event.preventDefault();seekStoryBy(5);return}
   if(event.key==='ArrowLeft'){event.preventDefault();seekStoryBy(-5);return}
   if(event.key===' '){event.preventDefault();toggleStoryPlayback();return}
   if(event.key==='Tab'){
    const root=storyPlayerRef.current;
    if(!root)return;
    const focusable=Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]:not([tabindex="-1"]),input:not([disabled]):not([tabindex="-1"])'))
     .filter(node=>node.getClientRects().length>0);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
   }
  };
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)};
 // closeStory is intentionally a local command bound to current result state.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[storyOpen,seekStoryBy,toggleStoryPlayback]);

 function startStory(){
  if(!storyArtifactReady&&file?.kind!=='pdf'){
   setStoryStartPending(true);
   setReviewOfferPaused(true);
   setReviewCountdown(1);
   return;
  }
  if(file?.kind==='pdf'&&!storyArtifactReady){
   setStoryStartPending(true);
   setReviewOfferPaused(true);
   setReviewCountdown(1);
   setReviewOffer('watching');
   setStoryPlaying(false);
   setStoryClosing(false);
   setStoryOpen(true);
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
   if(file?.kind==='pdf')setStoryArtifactReady(false);
   window.requestAnimationFrame(()=>replayButton.current?.focus());
  },260);
 }
 function replayStory(){startStory()}

 function changeDisplayLanguage(locale:DisplayLocale){
  setTranslatedResult({});
  setResultTranslationState('idle');
  setDisplayLocale(locale);
  setLanguageMenuOpen(false);
 }

 async function copyCourtQuestion(){
  if(!courtQuestionScript)return;
  try{
   await navigator.clipboard.writeText(translatedResult.courtQuestionScript||courtQuestionScript);
   setQuestionCopied(true);
   toast.success('Court question copied');
   window.setTimeout(()=>setQuestionCopied(false),1800);
  }catch{
   setQuestionCopied(false);
   toast.error('Could not copy. Try again.');
  }
 }

 async function copyHandoff(){
  if(!verification)return;
  try{
   await navigator.clipboard.writeText(buildHandoffSummary(claims,verification,justiceSupport));
   setHandoffCopied(true);
   toast.success('Verification record copied');
   window.setTimeout(()=>setHandoffCopied(false),1800);
  }catch{
   setHandoffCopied(false);
   toast.error('Could not copy. Try again.');
  }
 }

 function saveHandoff(){
  if(!verification)return;
  const record=buildHandoffSummary(claims,verification,justiceSupport);
  const reference=caseReality?.reference||'check';
  const slug=reference.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'check';
  const url=URL.createObjectURL(new Blob([record],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='seal-verification-'+slug+'.txt';anchor.style.display='none';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  toast.success('Verification record saved');
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }

 function clear(){
  clearResultSession(workspaceId);
  activeReadRef.current?.abort();
  activeReadRef.current=null;
  activeRequestRef.current?.abort();
  activeRequestRef.current=null;
  sourceBlobRef.current=null;
  if(uploadPreviewRef.current){URL.revokeObjectURL(uploadPreviewRef.current);uploadPreviewRef.current=null}
  setUploadPreview(null);
  setTranslatedResult({});
  setResultTranslationState('idle');
  setDocumentLanguage(null);
  setJurisdiction('');
  setWorkspaceTitle('New check');
  if(typeof window!=='undefined'&&(window.location.search||window.location.hash)){
   window.history.replaceState(null,'',window.location.pathname);
  }
  storyTimelineRef.current?.kill();
  storyTimelineTime.current=0;
  storyPhaseRef.current=0;
  runId.current++;
  if(file)URL.revokeObjectURL(file.preview);
  setFile(null);setText('');setDraft('');setPasteMode(false);setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setActiveResultSection('summary');setTechnicalOpen(false);setHandoffCopied(false);setQuestionCopied(false);setReviewOffer('idle');setReviewCountdown(3);setReviewOfferPaused(false);setStoryArtifactReady(true);setStoryStartPending(false);setMode('SNAPSHOT');setStoryOpen(false);setStoryStep(0);setStoryPlaying(true);setStoryClosing(false);
 }

 function submitPaste(){const value=draft.trim();if(!value)return;clear();setText(value);void run('SNAPSHOT',{text:value,file:null})}

async function upload(uploaded:File){
  setWorkspaceTitle(uploaded.name.replace(/\.[^.]+$/,'')||'New check');
  const origin=processingIntakeRef.current?.getBoundingClientRect();
  uploadOriginRectRef.current=origin?{left:origin.left,top:origin.top,width:origin.width,height:origin.height}:null;
  clear();
  const selectedPreview=URL.createObjectURL(uploaded);
  uploadPreviewRef.current=selectedPreview;
  setUploadPreview({url:selectedPreview,name:uploaded.name,kind:uploaded.type==='application/pdf'?'pdf':'image'});
  sourceBlobRef.current=uploaded;
  const controller=new AbortController();
  activeReadRef.current=controller;
  const uploadId=runId.current;setBusy(true);setStatus('Preparing your file');
  try{
   const doc=await readInBrowser(uploaded,next=>{if(!controller.signal.aborted&&runId.current===uploadId)setStatus(next)},ocrLanguage,controller.signal);
   if(runId.current!==uploadId){URL.revokeObjectURL(doc.preview);return}
   setFile(doc);setStoryArtifactReady(false);setText(doc.text);
   if(!doc.text.trim()&&!doc.uncertain)setError('We couldn’t read enough from this file. Try a clearer image or paste the message.');
   else await run('SNAPSHOT',{text:doc.text,file:doc});
  }catch(e){
   if(!controller.signal.aborted&&runId.current===uploadId)setError(e instanceof Error?e.message:'Could not read this file.');
  }finally{
   if(activeReadRef.current===controller)activeReadRef.current=null;
   if(uploadPreviewRef.current===selectedPreview){URL.revokeObjectURL(selectedPreview);uploadPreviewRef.current=null;setUploadPreview(null)}
   if(runId.current===uploadId){setBusy(false);setStatus('')}
  }
 }

 async function run(sourceMode:Mode=mode,source?:{text:string;file:BrowserDocument|null;curated?:boolean;curatedCaseId?:string;browse?:boolean}){
  const sourceText=source?.text??text;
  const sourceFile=source?source.file:file;
  const sourceCurated=Boolean(source?.curated);
  const sourceBrowse=Boolean(source?.browse);
  const curatedCaseId=source?.curatedCaseId;
  const sourceIsDemo=!sourceFile&&/^DEMO \/ (?:FICTIONAL NOTICE|SYNTHETIC MESSAGE)/.test(sourceText);
  const sourceContext=detectDocumentContext(sourceText);
  setDocumentLanguage(sourceContext.language);
  if(sourceContext.jurisdiction)setJurisdiction(sourceContext.jurisdiction);
  activeRequestRef.current?.abort();
  const controller=new AbortController();
  activeRequestRef.current=controller;
  const contextPromise=!sourceContext.jurisdiction&&!sourceIsDemo
   ?fetch('/api/context',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({text:sourceText}),
     signal:controller.signal
    }).then(async response=>{
     if(!response.ok)return null;
     const payload=await response.json() as {context?:{jurisdiction:string;countryCode:string;evidenceQuote:string;confidence:number}|null};
     return payload.context||null;
    }).catch(()=>null)
   :Promise.resolve(null);
  const requestTimeout=window.setTimeout(()=>controller.abort(),30000);
  const id=++runId.current;
  storyTimelineRef.current?.kill();
  storyTimelineTime.current=0;
  storyPhaseRef.current=0;
  setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setTechnicalOpen(false);
  setReviewOffer('idle');setReviewCountdown(3);setReviewOfferPaused(false);
  setStoryStartPending(false);setStoryOpen(false);setStoryStep(0);setStoryPlaying(false);setStoryClosing(false);
  setStoryArtifactReady(!sourceFile);
  setMode(sourceMode);setStatus('Reading requested actions');
  try{
   // Do not use the document-level OCR flag as a kill switch. A globally noisy
   // transcript can still contain a clearly grounded action line that the
   // extractor and claim-level confidence checks can safely use.
   let extraction:Extraction=fallbackExtract(sourceText);
   let extractor='DETERMINISTIC';
   const deterministicReady=Boolean(
    !sourceFile
    &&extraction.court_name
    &&extraction.requested_actions?.length
   );

   if(!sourceIsDemo&&!deterministicReady){
    const extractController=new AbortController();
    const cancelExtract=()=>extractController.abort();
    controller.signal.addEventListener('abort',cancelExtract,{once:true});
    const extractTimeout=window.setTimeout(()=>extractController.abort(),12000);
    try{
     const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sourceText}),signal:extractController.signal});
     if(response.ok){
      const data=await response.json();
      extraction=data.extraction;
      extractor=data.mode||'DETERMINISTIC';
     }else extractor='DETERMINISTIC_FALLBACK';
    }catch{
     if(controller.signal.aborted)throw new DOMException('Check cancelled.','AbortError');
     extractor='DETERMINISTIC_FALLBACK';
    }finally{
     window.clearTimeout(extractTimeout);
     controller.signal.removeEventListener('abort',cancelExtract);
    }
   }

   if(sourceFile?.kind==='pdf'){
    const juror=recoverLabeledJurorNumber(sourceFile.tokens);
    const date=recoverLabeledReportingDate(sourceFile.tokens);
    extraction={...extraction,juror_or_reference_number:juror||extraction.juror_or_reference_number,reporting_date:date||extraction.reporting_date};
   }

   if(runId.current!==id)return;
   setExtractionMode(extractor);
   const routedDirectory=officialCourtDirectoryFor([sourceText,extraction.court_name,extraction.court_location].filter(Boolean).join('\n'))||sourceContext.officialDirectory;
   let inferredContext:null|{jurisdiction:string;countryCode:string;evidenceQuote:string;confidence:number}=null;
   if(!routedDirectory&&!sourceContext.jurisdiction){
    inferredContext=await Promise.race([
     contextPromise,
     new Promise<null>(resolve=>window.setTimeout(()=>resolve(null),900))
    ]);
   }
   const routedJurisdiction=routedDirectory?.jurisdiction
    ||sourceContext.jurisdiction
    ||inferredContext?.jurisdiction
    ||cleanDisplayText(extraction.court_location);
   if(routedJurisdiction)setJurisdiction(routedJurisdiction);
   if(extraction.court_name)setWorkspaceTitle(cleanDisplayText(extraction.court_name));

   // Curated cases use a source-checked transcript for analysis. OCR tokens from
   // the pictured artifact may help display it, but must not invent new claims.
   const extractedClaims=claimsFromExtraction(extraction,sourceText,sourceCurated?[]:sourceFile?.tokens||[]);
   const found=sourceCurated
    ?extractedClaims.map(claim=>({...claim,verification_eligible:true}))
    :extractedClaims;
   const reliableAction=found.some(claim=>Boolean(claim.action)&&claimReliable(claim));
   const usableAction=found.some(claimNarrativelyUsable);
   const courtRelated=/\b(?:court|jury|summons|hearing|case|docket|judge|tribunal|magistrate|citation|parking violation|juzgado|gericht|tribunale|mahakama|mahkama|mahkeme|pengadilan|cour|llys)\b|poder judiciário|vara cível|edital de citação|न्यायालय|अदालत|محكمة|المحكمة|法院|裁判所|법원|\bсуд\b/iu.test(sourceText)
    ||Boolean(extraction.court_name&&sourceText.toLocaleLowerCase().includes(extraction.court_name.toLocaleLowerCase()));
   if(!sourceCurated&&!courtRelated)throw new Error('This does not look like a court message SEAL can check. Try a court notice, text, or email.');
   if(!sourceCurated&&!sourceBrowse&&!usableAction)throw new Error(sourceFile?.uncertain
    ?'SEAL read parts of this document, but not a requested action clearly enough to check it safely. Try a clearer image or paste the instruction text.'
    :'We couldn’t find a requested action in this court message. Try another image or paste the message text.');
   if(!found.length){
    if(sourceFile&&sourceText.trim().length>=40)throw new Error('We could read text in this image, but SEAL couldn’t find a court message or notice to check. Try another image or paste the message text.');
    throw new Error('We couldn’t read enough of this message to check it reliably. Try a clearer screenshot or paste the message text.');
   }

   setClaims(found);
   setStatus('Checking independent sources');
   onWorkspaceMeta(workspaceId,{status:'verifying',language:sourceContext.language.label,jurisdiction:routedJurisdiction});

   const verifiable=found.filter(claim=>claim.verification_eligible!==false);
   // Low-confidence action claims may still drive the narrative, but they never
   // get routed as canonical facts. Verification remains claim-gated.
   void reliableAction;
   const courtClaim=found.find(claim=>claim.type==='court');
   const routingCourt=courtClaim?.verification_eligible===false?'':extraction.court_name;

   const response=await fetch('/api/verify',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({claims:verifiable,court_name:routingCourt,jurisdiction_hint:routedJurisdiction,mode:sourceMode,text:sourceText,curated_case_id:curatedCaseId}),
    signal:controller.signal
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
   const selectedId=requested?.id||firstReliable?.id||'';
   setSelected(selectedId);

   void persistResultSession({
    text:sourceText,
    claims:found,
    verification:checked,
    mode:sourceMode,
    extractionMode:extractor,
    selected:selectedId,
    file:sourceFile?{
     kind:sourceFile.kind,
     uncertain:sourceFile.uncertain,
     sample:sourceFile.sample,
     ocrConfidence:sourceFile.ocrConfidence,
     unreadableFields:sourceFile.unreadableFields
    }:undefined
   },sourceFile?sourceBlobRef.current:null,workspaceId);
  }catch(e){
   const aborted=e instanceof DOMException&&e.name==='AbortError';
   if(!aborted&&runId.current===id)setError(e instanceof Error?e.message:'The source check could not finish.');
  }finally{
   window.clearTimeout(requestTimeout);
   if(activeRequestRef.current===controller)activeRequestRef.current=null;
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

 useEffect(()=>{
  const courtTitle=claims.find(claim=>claim.type==='court'&&claimReliable(claim))?.value;
  const title=cleanDisplayText(courtTitle||workspaceTitle||'New check');
  const firstAction=claims.find(claim=>Boolean(claim.action)&&claimReliable(claim));
  const firstUsefulLine=text.split(/\n+/).map(cleanDisplayText).find(line=>line.length>=12&&!/^new check$/i.test(line));
  const preview=cleanDisplayText(firstAction?.action?.source_text||firstAction?.value||firstUsefulLine||'').slice(0,84);
  const state:WorkspaceRunStatus=error?'error':verification?'done':busy?(status==='Checking independent sources'?'verifying':'reading'):'idle';
  onWorkspaceMeta(workspaceId,{title,status:state,language:documentLanguage?.label,jurisdiction,preview});
 },[workspaceId,workspaceTitle,claims,text,error,verification,busy,status,documentLanguage?.label,jurisdiction,onWorkspaceMeta]);

 const processingStage=status==='Checking independent sources'?2:status==='Reading requested actions'?1:0;
 const processingTitle=processingStage===2?'Checking public sources':processingStage===1?'Reading what the message asks':'Reading your document';
 const processingTextRegionsVisible=useMemo(()=>file?.tokens?processingTextRegions(file.tokens):[],[file]);
 const processingRegionCount=processingTextRegionsVisible.length;

 const currentWorkspaceMeta=workspaces.find(item=>item.id===workspaceId);
 const currentWorkspaceTitle=cleanDisplayText(currentWorkspaceMeta?.title||workspaceTitle||'New check');
 const showWorkspaceIdentity=workspaces.length>1||currentWorkspaceTitle!=='New check';

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

 return <main ref={workspaceRootRef} className="seal-app" data-testid="seal-app">
  <aside className="workspace-rail" aria-label="Workspace">
   <Link href="/" className="rail-brand" aria-label="SEAL home" onClick={event=>{if(verification||busy||file||text||draft){event.preventDefault();clear()}}}><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></Link>
   <div className="rail-command-row">
    <button className="icon-control rail-icon-control rail-new-check" type="button" aria-label={ui('newCheck')} title={ui('newCheck')} data-tooltip={ui('newCheck')} onClick={onNewWorkspace}><SealUiIcon name="add"/></button>
    <Link className="icon-control rail-icon-control" href="/browse" aria-label={ui('browse')} title={ui('browse')} data-tooltip={ui('browse')}><SealUiIcon name="browse"/></Link>
   </div>
   <div className="rail-check-list" aria-label="Open checks">
    {workspaces.filter(item=>item.status!=='idle'||item.id===workspaceId).map((item,index)=>{
     const title=item.title||`Check ${index+1}`;
     const statusLabel=item.status==='verifying'?'Checking sources':item.status==='reading'?'Reading':item.status==='done'?'Checked':item.status==='error'?'Needs attention':'New';
     return <div className={`rail-check-row ${item.id===workspaceId?'is-current':''}`} key={item.id}>
      <button
       type="button"
       className={`rail-check ${item.id===workspaceId?'is-current':''}`}
       onClick={()=>onSelectWorkspace(item.id)}
       aria-current={item.id===workspaceId?'page':undefined}
      >
       <span className={`rail-check-state is-${item.status}`} aria-hidden="true"/>
       <span className="rail-check-copy"><strong>{title}</strong><small>{[item.jurisdiction||item.language,statusLabel].filter(Boolean).join(' · ')}</small></span>
      </button>
      <button className="rail-check-delete icon-control" type="button" aria-label={`Delete check ${index+1}: ${title}`} title={`Delete ${title}`} onClick={()=>onDeleteWorkspace(item.id)}><SealUiIcon name="delete"/></button>
     </div>;
    })}
   </div>
   <div className="rail-spacer"/>
   <div className="rail-language">
    <div className="rail-language-menu">
     <button type="button" className="rail-language-trigger" aria-label={ui('displayLanguage')} title={ui('displayLanguage')} aria-haspopup="listbox" aria-expanded={languageMenuOpen} onClick={()=>setLanguageMenuOpen(open=>!open)}>
      <SealUiIcon name="globe"/><span>{displayLocale.toUpperCase()}</span><SealGuideIcon/>
     </button>
     {languageMenuOpen&&<div className="rail-language-popover" role="listbox" aria-label={ui('displayLanguage')}>
      {Object.entries(DISPLAY_LANGUAGES).map(([code,label])=><button type="button" role="option" aria-selected={code===displayLocale} className={code===displayLocale?'is-selected':''} key={code} onClick={()=>changeDisplayLanguage(code as DisplayLocale)}><span>{label}</span><small>{code.toUpperCase()}</small></button>)}
     </div>}
    </div>
   </div>
  </aside>
  <header className="seal-nav mobile-only-nav">
   <div className="mobile-nav-identity">
    <Link href="/" className="mobile-brand" aria-label="SEAL home" onClick={event=>{if(verification||busy||file||text||draft){event.preventDefault();clear()}}}><img src="/brand/seal-mark-black.svg" alt=""/></Link>
    {showWorkspaceIdentity&&<button className="mobile-current-check" type="button" aria-label={`Open checks. Current: ${currentWorkspaceTitle}`} title={currentWorkspaceTitle} onClick={()=>{setLanguageMenuOpen(false);setWorkspaceDrawerOpen(true)}}>
     <span className={`mobile-current-check-state is-${currentWorkspaceMeta?.status||'idle'}`} aria-hidden="true"/>
     <span>{currentWorkspaceTitle}</span>
    </button>}
   </div>
   <div className="mobile-nav-tools">
    <div className="mobile-language-menu">
     <button type="button" className="icon-control mobile-language-trigger" aria-label={ui('displayLanguage')} title={ui('displayLanguage')} aria-haspopup="listbox" aria-expanded={languageMenuOpen} onClick={()=>{setWorkspaceDrawerOpen(false);setLanguageMenuOpen(open=>!open)}}>
      <SealUiIcon name="globe"/><span>{displayLocale.toUpperCase()}</span>
     </button>
     {languageMenuOpen&&<div className="mobile-language-popover" role="listbox" aria-label={ui('displayLanguage')}>
      <div className="mobile-language-title">{ui('displayLanguage')}</div>
      {Object.entries(DISPLAY_LANGUAGES).map(([code,label])=><button type="button" role="option" aria-selected={code===displayLocale} className={code===displayLocale?'is-selected':''} key={code} onClick={()=>changeDisplayLanguage(code as DisplayLocale)}><span>{label}</span><small>{code.toUpperCase()}</small></button>)}
     </div>}
    </div>
    <span className="mobile-nav-divider" aria-hidden="true"/>
    <button className="icon-control mobile-nav-icon mobile-workspace-trigger" type="button" aria-label="Open checks" title="Open checks" aria-haspopup="dialog" aria-expanded={workspaceDrawerOpen} onClick={()=>{setLanguageMenuOpen(false);setWorkspaceDrawerOpen(true)}}><SealUiIcon name="workspaces"/></button>
    <button className="icon-control mobile-nav-icon mobile-new-check" type="button" aria-label={ui('newCheck')} title={ui('newCheck')} onClick={()=>{setWorkspaceDrawerOpen(false);onNewWorkspace()}}><SealUiIcon name="add"/></button>
   </div>
  </header>

  <div className={`workspace-drawer-layer ${workspaceDrawerOpen?'is-open':''}`} data-testid="workspace-drawer-layer" aria-hidden={!workspaceDrawerOpen}>
   <button className="workspace-drawer-backdrop" type="button" aria-label="Close checks" onClick={()=>setWorkspaceDrawerOpen(false)}/>
   <aside className="workspace-drawer" role="dialog" aria-modal="true" aria-label="Checks">
    <div className="workspace-drawer-head">
     <div className="workspace-drawer-title"><strong>Checks</strong><span>{workspaces.length}</span></div>
     <div className="workspace-drawer-head-actions">
      <button className="icon-control drawer-icon-button" type="button" aria-label={ui('newCheck')} title={ui('newCheck')} onClick={()=>{setWorkspaceDrawerOpen(false);onNewWorkspace()}}><SealUiIcon name="add"/></button>
      <button className="icon-control drawer-icon-button" type="button" aria-label="Close checks" title="Close checks" onClick={()=>setWorkspaceDrawerOpen(false)}><SealUiIcon name="close"/></button>
     </div>
    </div>
    <div className="workspace-drawer-list" aria-label="Open checks">
     {workspaces.map((item,index)=>{
      const title=item.title||`Check ${index+1}`;
      const statusLabel=item.status==='verifying'?'Checking sources':item.status==='reading'?'Reading':item.status==='done'?'Checked':item.status==='error'?'Needs attention':'New';
      return <div className={`workspace-drawer-row ${item.id===workspaceId?'is-current':''}`} key={item.id}>
       <button className="workspace-drawer-select" type="button" aria-current={item.id===workspaceId?'page':undefined} onClick={()=>{onSelectWorkspace(item.id);setWorkspaceDrawerOpen(false)}}>
        <span className={`rail-check-state is-${item.status}`} aria-hidden="true"/>
        <span className="workspace-drawer-copy"><strong>{title}</strong><small>{item.preview||[item.jurisdiction||item.language,statusLabel].filter(Boolean).join(' · ')}</small></span>
       </button>
       <div className="workspace-drawer-row-actions">
        {item.status!=='idle'&&<span className={`workspace-drawer-status is-${item.status}`} aria-label={statusLabel}/>}
        <button className="icon-control workspace-drawer-delete" type="button" aria-label={`Delete check ${index+1}: ${title}`} title={`Delete ${title}`} onClick={()=>{if(item.id===workspaceId)setWorkspaceDrawerOpen(false);onDeleteWorkspace(item.id)}}><SealUiIcon name="delete"/></button>
       </div>
      </div>;
     })}
    </div>
    <div className="workspace-drawer-foot">
     <Link className="workspace-drawer-browse" href="/browse" onClick={()=>setWorkspaceDrawerOpen(false)}><SealUiIcon name="browse"/><span>{ui('browse')}</span></Link>
    </div>
   </aside>
  </div>

  {!verification?
   <section className={`entry-shell ${busy?'is-processing':''}`} data-testid="entry-shell">
   <div className="entry-copy">
     <h1>{ui('checkCourtMessage')}</h1>
     <p>{ui('entrySummary')}</p>
    </div>

    <div ref={processingIntakeRef} className={`intake ${pasteMode?'is-paste-mode':'is-upload-mode'} ${busy?'is-processing-intake':''}`}>
     {!pasteMode?
      <>
       <button className={`upload-row ${dragging?'is-dragging':''} ${busy?'is-busy':''}`} data-testid="upload-file" type="button" disabled={busy||!hydrated} aria-busy={busy} onClick={()=>{filePickerArmed.current=true;input.current?.click()}}
        onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();setDragging(true)}}}
        onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false)}}
        onDrop={event=>{event.preventDefault();setDragging(false);if(event.dataTransfer.files[0])upload(event.dataTransfer.files[0])}}>
        {busy?
         <span className="upload-process" role="status" aria-live="polite" aria-label={processingTitle}>
          <span className={`upload-process-media ${uploadPreview?.kind==='pdf'?'is-pdf':''}`} data-testid="processing-preview">
           {uploadPreview?.kind==='image'
            ?<img src={uploadPreview.url} alt="Selected court message"/>
            :<span className="upload-pdf-preview" aria-hidden="true"><b>PDF</b><i/></span>}
          </span>
          <span className="upload-process-body">
           <span className="upload-process-kicker">Check in progress</span>
           <strong>{processingTitle}</strong>
           <span className="process-context">
            {processingStage===0
             ?'Reading locally from the selected file.'
             :processingStage===1
              ?(processingRegionCount?`${processingRegionCount} text regions recovered. Identifying the instructions that matter.`:'Identifying the instructions that matter.')
              :'Comparing the recovered instructions with independent court and agency sources.'}
           </span>
           {uploadPreview?.name&&<span className="upload-file-name" title={uploadPreview.name}>{uploadPreview.name}</span>}
           <span className="process-device-note"><span>Original stays on this device</span><small>Extracted text may be sent for checking</small></span>
          </span>
         </span>
         :<span className="upload-group">
          <span className="upload-copy">
           <strong>{ui('upload')}</strong>
           <small>{ui('uploadHint')}</small>
          </span>
          <span className="upload-browse">{ui('browseFiles')}</span>
         </span>}
       </button>
       {!busy&&<>
        <label className="ocr-language-control"><span>{ui('imageLanguage')}</span><select value={ocrLanguage} onChange={event=>setOcrLanguage(event.target.value as OcrLanguage)}>{Object.entries(ocrLanguages).map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
        <button className="paste-mode-switch" type="button" onClick={()=>setPasteMode(true)}>{ui('pasteInstead')} <SealGuideIcon direction="right"/></button>
        <p className="privacy-note">{ui('privacyNote')}</p>
       </>}
      </>
      :
      <div className="paste-mode-panel">
       <button className="paste-mode-switch paste-mode-back" type="button" onClick={()=>setPasteMode(false)}><SealGuideIcon direction="left"/> {ui('uploadInstead')}</button>
       <label className="paste-field">
        <span className="field-label">{ui('messageText')}</span>
        <textarea autoFocus aria-label="Paste the court message" value={draft} onChange={event=>setDraft(event.target.value)} placeholder={ui('messagePlaceholder')}/>
       </label>
       <div className="intake-actions">
        <button className="check-message" type="button" disabled={!draft.trim()||!hydrated} onClick={submitPaste}>{ui('checkMessage')}</button>
       </div>
       <p className="privacy-note">{ui('privacyNote')}</p>
      </div>}

     {error&&<div role="alert" className="inspection-error">{error}</div>}
    </div>

   </section>
   :
   <section className="review-shell" data-testid="result-shell"
    onPointerDownCapture={event=>{if(reviewOffer==='counting'&&!(event.target as Element).closest('[data-review-offer]'))skipReviewOffer()}}
    onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault()}}
    onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();skipReviewOffer();upload(event.dataTransfer.files[0])}}}>
    <header className="result-masthead" id={sectionId('result-top')} data-testid="check-object-header">
     <div className="result-masthead-row">
      <div className="check-object-identity">
       <p className="result-masthead-title">{ui('resultTitle')}</p>
       <h1>{checkObjectDisplayTitle}</h1>
       <div className="check-object-meta">
        <span className="meta-status">{resultStatusLabel}</span>
        {documentLanguage?.label&&<span className="meta-language" data-testid="document-language">{documentLanguage.label}</span>}
        {jurisdiction&&<span className="meta-jurisdiction" data-testid="document-jurisdiction">{jurisdiction}</span>}
       </div>
      </div>
      <div className="check-object-actions" aria-label="Check actions">
       <button type="button" className="icon-control result-icon-action" aria-label="Check again" title="Check again" data-tooltip="Check again" onClick={()=>run('LIVE')} disabled={busy}><SealUiIcon name="refresh"/></button>
      </div>
     </div>

     {verification&&<nav className="result-chapters" aria-label="Jump to result section">
      <a href={`#${sectionId('review-summary')}`} className={activeResultSection==='summary'?'is-current':''} aria-current={activeResultSection==='summary'?'location':undefined} onClick={event=>jumpToResultSection(event,'summary','review-summary')}>Summary</a>
      <a href={`#${sectionId('original-message')}`} className={activeResultSection==='message'?'is-current':''} aria-current={activeResultSection==='message'?'location':undefined} onClick={event=>jumpToResultSection(event,'message','original-message')}>{ui('original')}</a>
      <a href={`#${sectionId('source-checks')}`} className={activeResultSection==='evidence'?'is-current':''} aria-current={activeResultSection==='evidence'?'location':undefined} onClick={event=>jumpToResultSection(event,'evidence','source-checks')}>Evidence</a>
      <a href={`#${sectionId('user-actions')}`} className={activeResultSection==='next'?'is-current':''} aria-current={activeResultSection==='next'?'location':undefined} onClick={event=>jumpToResultSection(event,'next','user-actions')}>Resolve</a>
     </nav>}
    </header>

    {liveFailed&&<div className="source-failure" role="status"><span>The court’s live pages didn’t respond. Affected claims remain unverified.</span><button onClick={()=>run('LIVE')} disabled={busy}>Check live sources</button></div>}

    {verification&&ready&&storyOpen&&<div className={`story-overlay ${storyClosing?'is-closing':''}`} data-testid="evidence-review" role="dialog" aria-modal="true" aria-label="SEAL verification review">
     <div ref={storyPlayerRef} className={`story-player ${storyPlaying?'is-playing':'is-paused'} ${storyFocusBox?'has-story-focus':'no-story-focus'}`}>
      <div className="story-topbar">
       <span className="story-brand"><img src="/brand/seal-mark-white.svg" alt=""/><span>SEAL</span></span>
       <div className="story-top-actions">
        <span className="story-chapter-label" aria-live="polite">{STORY_CHAPTERS[storyStep].label}</span>
        <button type="button" onClick={closeStory}>Back to result</button>
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
            <StoryPdfPage url={file.preview} focusBox={storyFocusBox} onReady={handleStoryArtifactReady}/>
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
           {storyEvidence&&<a href={storyEvidence.url} target="_blank" rel="noopener noreferrer" tabIndex={storyStep>=2&&storyStep<=3?0:-1}>Open source</a>}
          </div>
         </div>
        </div>

        <div className="story-claim-anchor" aria-hidden={storyStep<1||storyStep>2}>
         <span>{ui('fromMessage')}</span>
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
          {verification.contact?.website&&<a href={verification.contact.website} target="_blank" rel="noopener noreferrer" tabIndex={storyStep===4?0:-1}>Open official court website</a>}
          {!verification.contact?.website&&verification.safe_action&&<a href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer" tabIndex={storyStep===4?0:-1}>{translatedResult.safePrimary||verification.safe_action.primary_label}</a>}
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

    <div ref={resultCarouselRef} className="result-carousel" data-testid="result-carousel" onScroll={syncResultCarousel}>
     <div className="review-hero">
     <div className="decision-pane result-screen result-screen-summary result-slide" data-result-section="summary" id={sectionId('review-summary')}>
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
        <div className="decision-overview">
         <div className="decision-copy">
        <p className="decision-status" data-testid="result-status">{resultStatusLabel}</p>
        <h1>{translatedResult.decisionTitle||(file?.sample?'This is a sample form.':conciseDecisionTitle)}</h1>
        <p className="decision-summary">{translatedResult.decisionSummary||humanDecisionSummary}</p>
        {displayLocale!=='en'&&resultTranslationState==='translated'&&<p className="translation-note">{ui('translatedNote')}</p>}
        {displayLocale!=='en'&&resultTranslationState==='unavailable'&&<p className="translation-note is-unavailable" role="status">{ui('translationUnavailable')}</p>}

        {primaryRoute&&<div className="decision-primary-route" data-testid="primary-next-step">
         <span>{ui('nextStep')}</span>
         <a href={primaryRoute.url} target="_blank" rel="noopener noreferrer">{primaryRoute.label}</a>
         <small>Opens an independently sourced official service.</small>
        </div>}

        {riskSummary&&!file?.sample&&<div className="decision-at-a-glance" data-testid="two-risk-result">
         <div><span>This message</span><strong>{instructionStatus}</strong></div>
         <div><span>The case</span><strong>{matterStatus}</strong></div>
        </div>}
         </div>

         <aside className="decision-visual" aria-label="Check snapshot">
          <div className="decision-artifact">
           {file?.kind==='image'
            ?<img src={file.preview} alt="Original message preview"/>
            :file?.kind==='pdf'
             ?<StoryPdfPage url={file.preview}/>
             :<div className="decision-text-thumb"><span>Original message</span><p>{cleanDisplayText(text.slice(0,360))}</p></div>}
          </div>
          <div className="decision-artifact-caption">
           <strong>{file?.sample?'Sample document':'Original message'}</strong>
           <span>{file?.kind==='pdf'?'PDF':file?.kind==='image'?'Image':'Text'}</span>
          </div>
          <div className="decision-source-brief">
           <span>Independent check</span>
           <strong>{checkSourceCount?checkSourceCount+' public source'+(checkSourceCount===1?'':'s'):'No public source attached'}</strong>
           {storyEvidence&&<small>{storyEvidence.title}</small>}
          </div>
          {reviewWorthWatching&&!storyOpen&&<button ref={replayButton} type="button" className="decision-review-player" data-testid="play-evidence-review" onClick={replayStory}>
           <span className="decision-review-play" aria-hidden="true"><DesignPlayIcon/></span>
           <span><strong>{ui('seeHowChecked')}</strong><small>{ui('evidenceReviewHint')}</small></span>
          </button>}
         </aside>
        </div>

        <details className="decision-details">
         <summary><span>Why this result</span><SealGuideIcon/></summary>
         <div className="decision-details-body">
          {riskSummary&&<div className="decision-risks">
           <div className="decision-risk-row"><span>Message instructions</span><div><strong>{translatedResult.riskInstructionsTitle||riskSummary.instructions.title}</strong><small>{translatedResult.riskInstructionsDetail||riskSummary.instructions.detail}</small></div></div>
           <div className="decision-risk-row"><span>Underlying matter</span><div><strong>{translatedResult.riskMatterTitle||riskSummary.matter.title}</strong><small>{translatedResult.riskMatterDetail||riskSummary.matter.detail}</small></div></div>
          </div>}

          {directCourtUnavailable&&groundedActions.length>0?<div className="decision-claim">
           <span>{ui('messageAsks')}</span>
           <ul className="message-action-list">{groundedActions.map(claim=><li key={claim.id}>{cleanDisplayText(claim.action?.source_text||claim.exact_source_text||claim.value)}</li>)}</ul>
          </div>:decisionClaim&&<div className="decision-claim">
           <span>{ui('fromMessage')}</span>
           <p>{decisionClaimDisplay||cleanDisplayText(decisionClaim.value)}</p>
          </div>}

          <div className={`decision-evidence decision-relationship-block ${decisionRelationshipConflict?'is-conflict':''}`}>
           <span>{ui('publicSourcesSay')}</span>
           <strong>{translatedResult.relationship||decisionRelationship}</strong>
           {storyEvidence&&<a className="decision-source-link" href={storyEvidence.url} target="_blank" rel="noopener noreferrer">{ui('openPublicSource')}</a>}
           {directCheckSummary&&!storySignal&&<small className="decision-direct-check">{directCheckSummary}</small>}
          </div>

         </div>
        </details>
       </div>}
     </div>

     <div className="document-zone result-screen result-screen-original result-slide" data-result-section="message" id={sectionId('original-message')}>
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

    <section className="result-slide result-slide-evidence" data-result-section="evidence" aria-label="Evidence panel">
     {ready&&verification&&<section className="source-resolution" id={sectionId('source-checks')} aria-label="What SEAL found">
     <div className="section-heading evidence-heading">
      <h2>{ui('independentEvidence')}</h2>
     </div>

     {verification.signals&&verification.signals.length>0?
      <div className="source-signals">
       {verification.signals.map((signal,signalIndex)=>{
        const primary=signal.id===storySignal?.id;
        const evidenceTitles=signal.evidence.map(evidence=>evidence.title);
        return <article className={`source-signal ${primary?'is-primary':'is-secondary'}`} key={signal.id}>
         <p className="signal-kind">{signal.kind==='OFFICIAL_PROCESS'?ui('officialProcess'):signal.kind==='OFFICIAL_DIRECTORY'?ui('officialDirectory'):signal.kind==='SOURCE_CONFLICT'?ui('sourceConflict'):signal.kind==='KNOWN_PATTERN'?ui('knownPattern'):ui('officialWarning')}</p>
         <h3>{translatedResult['signalTitle'+signalIndex]||signal.title}</h3>
         <p>{translatedResult['signalSummary'+signalIndex]||signal.summary}</p>
         {signal.evidence.length>0&&<div className="signal-links">
          {signal.evidence.length>1&&<span className="signal-links-label">{ui('sources')}</span>}
          {signal.evidence.map((evidence,index)=><a href={evidence.url} target="_blank" rel="noopener noreferrer" key={`${signal.id}-${index}`}>{compactEvidenceTitle(evidence.title,index,evidenceTitles)}</a>)}
         </div>}
        </article>;
       })}
      </div>
      :directEvidenceFindings.length>0?
      <div className="source-signals direct-evidence-findings">
       {directEvidenceFindings.map(({claim,result})=>{
        const resultIndex=verification.results.findIndex(candidate=>candidate.claim_id===result.claim_id);
        const primary=claim.id===decisionClaim?.id;
        const evidenceTitles=result.evidence.map(evidence=>evidence.title);
        return <article className={`source-signal direct-evidence-finding ${primary?'is-primary':'is-secondary'}`} key={claim.id}>
         <p className="signal-kind">{result.verdict==='MATCH'?ui('officialSourceMatch'):result.verdict==='MISMATCH'?ui('officialSourceConflict'):ui('sourceEvidence')}</p>
         <h3>{translatedResult['resultLabel'+resultIndex]||claim.label}{claim.value?`: ${cleanDisplayText(claim.value)}`:''}</h3>
         <p>{translatedResult['resultExplain'+resultIndex]||result.explanation}</p>
         <div className="signal-links">
          {result.evidence.length>1&&<span className="signal-links-label">Sources</span>}
          {result.evidence.map((evidence,index)=><a href={evidence.url} target="_blank" rel="noopener noreferrer" key={`${claim.id}-${index}`}>{compactEvidenceTitle(evidence.title,index,evidenceTitles)}</a>)}
         </div>
        </article>;
       })}
      </div>
      :<div className="source-signals source-evidence-empty">
       <article className="source-signal is-primary">
        <p className="signal-kind">{ui('independentCheck')}</p>
        <h3>{directCourtUnavailable?'This court is not in SEAL’s direct-check network yet.':'No independent source evidence was available for this result.'}</h3>
        <p>{directCourtUnavailable?'SEAL can still show exactly what the message asks you to do, but it will not guess whether the case or sender is genuine.':'The inspection below shows what SEAL could and could not establish from its supported sources.'}</p>
       </article>
      </div>}

     <p className="resolution-disclaimer">{curatedSignal?'This finding is about this published example only. It does not label other messages.':'These sources help with the check, but they still cannot tell us who sent the message.'}</p>
    </section>}
     <details className="record-disclosure" aria-label="Evidence record">
      <summary><span>Evidence record</span><small>Claims, source provenance, and technical details</small><SealGuideIcon/></summary>
      <div className="record-disclosure-body">
       {ready&&verification&&<section className="check-metadata-section" aria-label="Check context">
     <div className="check-record-details" data-testid="check-details">
      <div className="record-subheading"><span>Check context</span><small>Provenance for this result</small></div>
      <dl>
       <div><dt>Input</dt><dd>{checkInputLabel}</dd></div>
       <div><dt>Document language</dt><dd>{documentLanguage?.label||'Not resolved'}</dd></div>
       <div><dt>Jurisdiction</dt><dd>{jurisdiction||'Not resolved'}</dd></div>
       <div><dt>Source mode</dt><dd>{mode==='LIVE'?'Live public sources':'Source snapshot'}</dd></div>
       <div><dt>Sources attached</dt><dd>{String(checkSourceCount)}</dd></div>
       {checkDateLabel&&<div><dt>Checked</dt><dd>{checkDateLabel}</dd></div>}
      </dl>
      <p>Original files stay in this browser. Source quotations remain attached to the check so the result can be inspected later.</p>
     </div>
    </section>}
       {ready&&!directCourtUnavailable&&<section className="record-section" id={sectionId('checked-details')}>
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
         <summary><span>{currentResult.evidence.length-1} more source excerpt{currentResult.evidence.length>2?'s':''}</span><SealGuideIcon/></summary>
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
      <summary><span>Technical record</span><SealGuideIcon/></summary>
      <p>Extractor: {extractionMode} · {resolverSummary}</p>
      {!!verification.lanes?.length&&<div className="verification-lanes">
       {verification.lanes.map(lane=><div className="verification-lane" key={lane.id}>
        <span className={'verification-lane-state is-'+lane.status} aria-hidden="true"/>
        <div>
         <strong>{lane.label}</strong>
         <small>{lane.summary}{typeof lane.duration_ms==='number'?' · '+lane.duration_ms+' ms':''}</small>
        </div>
       </div>)}
      </div>}
      {technicalEvidence.map((evidence,index)=><p key={evidence.url||index}>{evidence.title} · {evidence.source_mode} · {evidence.checked_at} · <a href={evidence.url} target="_blank" rel="noopener noreferrer">Original source</a></p>)}
     </details>

     {isDemo&&<button className="replay-button" onClick={()=>run('SNAPSHOT')}>Replay check</button>}
    </section>}
      </div>
     </details>
    </section>

    <section className="result-slide result-slide-resolve" data-result-section="next" aria-label="Resolve panel">
     {ready&&verification&&<div className="resolve-primary" data-testid="resolve-primary">
     {verification&&!verification.safe_action&&decisionClaim?.action&&!verification.contact&&<div className="unsupported-next-step" id={sectionId('next-step')}>
      <span>What to do next</span>
      <h2>Check this with the court directly.</h2>
      {messageDetails.length>0||scheduleQuote||noPaymentQuote?<dl className="message-detail-list">{messageDetails.map(claim=><div key={claim.id}><dt>{claim.type==='location'?'Location named':claim.label}</dt><dd>{cleanDisplayText(claim.value)}</dd></div>)}{scheduleQuote&&<div><dt>Schedule stated</dt><dd>{cleanDisplayText(scheduleQuote)}</dd></div>}{noPaymentQuote&&<div><dt>Payment statement</dt><dd>{cleanDisplayText(noPaymentQuote)}</dd></div>}</dl>:<p>No court or case details could be read reliably.</p>}
      <p>Those details come from the message itself. They do not confirm that the case exists or that the sender is connected to the court.</p>
      <p>Do not use a payment link, QR code, phone number, or reply address from the message until you reach the court independently.</p>
      {officialDirectory&&<div className="official-directory-route">
       <span>Start here</span>
       <a href={officialDirectory.url} target="_blank" rel="noopener noreferrer">{officialDirectory.label}</a>
       <p>{officialDirectory.note}</p>
      </div>}
     </div>}
     {verification?.safe_action&&<div className="safe-route" id={sectionId('next-step')}>
      <div>
       <h2>{translatedResult.safeTitle||verification.safe_action.title}</h2>
       <p>{translatedResult.safeSummary||verification.safe_action.summary}</p>
      </div>
      <div>
       <ol className="safe-steps">{verification.safe_action.steps.map((step,index)=><li key={index}>{translatedResult[`safeStep${index}`]||step}</li>)}</ol>
       <div className="safe-route-actions">
        {verification.contact?.website&&<a className="safe-primary" href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open official court website</a>}
        {verification.safe_action.primary_url&&verification.safe_action.primary_url!==verification.contact?.website&&<a className="safe-source-link" href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label}</a>}
       </div>
      </div>
     </div>}

     </div>}
     {ready&&verification&&caseReality&&<section className="user-actions" id={sectionId('user-actions')} aria-label="What to do next">
     <div className="user-actions-heading"><h2>What to do next</h2><p>Keep the message, but use a court site or support service you opened yourself for anything you do next.</p></div>
     <div className="journey-block case-reality-block" data-testid="case-reality-check">
      <div className="journey-label">The case</div>
      <div className="journey-content">
       <h3>{translatedResult.caseRealityTitle||caseReality.title}</h3><p>{translatedResult.caseRealityDetail||caseReality.detail}</p>
       <dl className="case-reality-facts"><div><dt>Court claimed</dt><dd>{caseReality.court}</dd></div><div><dt>Case/reference</dt><dd>{caseReality.reference||'Not verified'}</dd></div></dl>
       {verification.contact?.website?<a className="journey-link" href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open the court website independently</a>:officialLookup&&<a className="journey-link" href={officialLookup.url} target="_blank" rel="noopener noreferrer">{officialLookup.label}</a>}
       {officialLookup&&<small className="journey-note">{officialLookup.note}</small>}
      </div>
     </div>
     {obligations.length>0&&<div className="journey-block obligation-block" data-testid="obligation-map">
      <div className="journey-label">What the message asks</div>
      <div className="journey-content"><div className="obligation-list">{obligations.map(item=><div className="obligation-row" key={item.id}><div><strong>{cleanDisplayText(item.text)}</strong>{item.deadline&&<small>Time/date stated: {item.deadline}</small>}</div><span className={item.status==='MISMATCH'?'is-conflict':item.status==='MATCH'?'is-match':''}>{item.statusLabel}</span></div>)}</div><p className="journey-note">Dates and instructions here come from the message unless a row explicitly says it matches a public source.</p></div>
     </div>}
     <details className="journey-details" data-testid="plain-language-explanation">
      <summary><span>Explain this notice</span><small>Plain language + translation</small><SealGuideIcon/></summary>
      <div className="journey-details-body">
       <div className="explanation-controls"><small>Explanation follows Display language: {DISPLAY_LANGUAGES[displayLocale]} · detected document language: {documentLanguage?.label||'Unknown'}{documentLanguage?.confidence==='low'?' · low confidence':''}</small></div>
       {displayedExplanation&&<div className="plain-explanation" aria-live="polite"><h3>{displayedExplanation.title}</h3><p>{displayedExplanation.summary}</p></div>}
       <p className="journey-note">This explains what SEAL extracted and verified. It is not legal advice.</p>
      </div>
     </details>
     <details className="journey-details" data-testid="resolution-help">
      <summary><span>Get help resolving this</span><small>Court, recovery, and legal-aid paths</small><SealGuideIcon/></summary>
      <div className="journey-details-body support-paths">
       <div className="support-path"><strong>{translatedResult.supportHaventTitle||'I haven’t acted yet'}</strong><p>{translatedResult.supportHaventCopy||'Use the independently sourced court route above before calling, paying, scanning, replying, or appearing because of this message.'}</p></div>
       <div className="support-path"><strong>{translatedResult.supportPaidTitle||'I already paid'}</strong><p>{translatedResult.supportPaidCopy||'Contact your bank or payment provider through its official app, card, or website and report the transaction immediately.'}</p>{justiceSupport?.recovery&&<a className="journey-link" href={justiceSupport.recovery.url} target="_blank" rel="noopener noreferrer">{justiceSupport.recovery.label}</a>}</div>
       <div className="support-path"><strong>{translatedResult.supportSharedTitle||'I shared personal information'}</strong><p>{translatedResult.supportSharedCopy||'Do not send anything else through the message. Use an official recovery service if one is available for this jurisdiction.'}</p>{justiceSupport?.recovery&&<a className="journey-link" href={justiceSupport.recovery.url} target="_blank" rel="noopener noreferrer">{justiceSupport.recovery.label}</a>}</div>
       <div className="support-path"><strong>{translatedResult.supportLegalTitle||'I need legal help'}</strong><p>{translatedResult.supportLegalCopy||'Use an official legal-aid service to understand your options for a real legal matter.'}</p>{justiceSupport?.legalAid?<a className="journey-link" href={justiceSupport.legalAid.url} target="_blank" rel="noopener noreferrer">{justiceSupport.legalAid.label}</a>:<span className="support-unavailable">No reviewed legal-aid directory is linked for this jurisdiction yet.</span>}</div>
       <div className="handoff-pack" data-testid="handoff-pack">
        <span>{translatedResult.handoffEyebrow||'Take this with you'}</span>
        <strong>{translatedResult.handoffTitle||'Ask the court without relying on the message'}</strong>
        <p>{translatedResult.handoffCopy||'Use this wording with an independently sourced court channel. It carries the case reference and the exact instructions SEAL recovered without treating them as genuine.'}</p>
        <blockquote>{translatedResult.courtQuestionScript||courtQuestionScript}</blockquote>
        <div className="handoff-actions" aria-label="Verification record actions">
         <button type="button" className="icon-control" aria-label={translatedResult.copyQuestion||'Copy what to ask'} title={translatedResult.copyQuestion||'Copy what to ask'} data-tooltip={translatedResult.copyQuestion||'Copy what to ask'} onClick={()=>void copyCourtQuestion()}><SealUiIcon name="message"/></button>
         <button type="button" className="icon-control" aria-label={translatedResult.copyRecord||'Copy verification record'} title={translatedResult.copyRecord||'Copy verification record'} data-tooltip={translatedResult.copyRecord||'Copy verification record'} onClick={()=>void copyHandoff()}><SealUiIcon name="copy"/></button>
         <button type="button" className="icon-control" aria-label={translatedResult.saveRecord||'Save verification record'} title={translatedResult.saveRecord||'Save verification record'} data-tooltip={translatedResult.saveRecord||'Save verification record'} onClick={saveHandoff}><SealUiIcon name="download"/></button>
        </div>
        <small>{translatedResult.handoffNote||'The saved record includes verification states, source links, and source-check timestamps. It does not include a legal opinion.'}</small>
       </div>
      </div>
     </details>
    </section>}
     {ready&&verification?.contact&&<section className="contact-section" id={verification.safe_action?undefined:sectionId('next-step')} aria-label="Court contact from an official source">
     <div className="court-contact">
      <div>
       <h3>Court contact from an official source</h3>
       <p>{verification.contact.name||(verification.resolver_id==='connecticut'?'District of Connecticut Jury Office':'Court contact')}</p>
      </div>
      <div>
       <a className="contact-phone" href={`tel:${verification.contact.phone}`}>{verification.contact.phone}</a>
       <div className="contact-actions">
        <a href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open court website</a>
        <button onClick={()=>run('LIVE')} disabled={busy}>Check live sources</button>
       </div>
       <p className="contact-source">This contact came from the court source, not from the message. {verification.contact.source.source_mode==='SNAPSHOT'?'Source snapshot checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.':'Live source checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.'}</p>
      </div>
     </div>
    </section>}
    </section>
    </div>
   </section>}

  <input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>{
   const armed=filePickerArmed.current;
   filePickerArmed.current=false;
   const next=event.target.files?.[0];
   event.target.value='';
   if(armed&&next)upload(next);
  }}/>

  <footer className="seal-footer">
   <span>SEAL is not affiliated with any court.</span>
  </footer>
 </main>;
}

const WORKSPACE_LIST_KEY='seal:workspace-list:v1';

export default function SealApp({initialDemo=false,initialText='',initialRun=false}:{initialDemo?:boolean;initialText?:string;initialRun?:boolean}){
 const [workspaces,setWorkspaces]=useState<WorkspaceMeta[]>([{id:'primary',title:'New check',status:'idle'}]);
 const [activeWorkspace,setActiveWorkspace]=useState('primary');
 const [workspaceMotion,setWorkspaceMotion]=useState<{id:string;direction:'forward'|'backward'}|null>(null);
 const workspaceMotionTimer=useRef<number|undefined>(undefined);
 const workspaceSwipeRef=useRef<{x:number;y:number;startedAt:number;blocked:boolean}|null>(null);
 const [registryReady,setRegistryReady]=useState(false);

 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{
    const raw=window.sessionStorage.getItem(WORKSPACE_LIST_KEY);
    if(raw){
     const parsed=JSON.parse(raw) as {active?:string;items?:WorkspaceMeta[]};
     const items=Array.isArray(parsed.items)?parsed.items.filter(item=>item&&typeof item.id==='string').slice(0,8):[];
     if(items.length){
      setWorkspaces(items.map(item=>({...item,status:item.status==='reading'||item.status==='verifying'?'idle':item.status})));
      setActiveWorkspace(items.some(item=>item.id===parsed.active)?parsed.active!:items[0].id);
     }
    }
   }catch{}
   setRegistryReady(true);
  },0);
  return()=>window.clearTimeout(timer);
 },[]);

 useEffect(()=>{
  if(!registryReady)return;
  try{window.sessionStorage.setItem(WORKSPACE_LIST_KEY,JSON.stringify({active:activeWorkspace,items:workspaces}))}catch{}
 },[registryReady,activeWorkspace,workspaces]);

 useEffect(()=>()=>{if(workspaceMotionTimer.current)window.clearTimeout(workspaceMotionTimer.current)},[]);

 const animateWorkspaceTo=useCallback((id:string,direction:'forward'|'backward')=>{
  if(id===activeWorkspace)return;
  if(workspaceMotionTimer.current)window.clearTimeout(workspaceMotionTimer.current);
  setWorkspaceMotion({id,direction});
  setActiveWorkspace(id);
  workspaceMotionTimer.current=window.setTimeout(()=>setWorkspaceMotion(null),360);
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
 },[activeWorkspace]);

 const updateWorkspace=useCallback((id:string,patch:Partial<WorkspaceMeta>)=>{
  setWorkspaces(items=>items.map(item=>{
   if(item.id!==id)return item;
   const next={...item,...patch};
   const unchanged=
    next.title===item.title
    &&next.status===item.status
    &&next.language===item.language
    &&next.jurisdiction===item.jurisdiction
    &&next.preview===item.preview;
   return unchanged?item:next;
  }));
 },[]);

 const createWorkspace=useCallback(()=>{
  const id=`check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  setWorkspaces(items=>{
   const number=items.filter(item=>/^New check(?: \\d+)?$/.test(item.title)).length+1;
   const title=number===1?'New check':`New check ${number}`;
   return [...items,{id,title,status:'idle' as WorkspaceRunStatus}].slice(-8);
  });
  if(workspaceMotionTimer.current)window.clearTimeout(workspaceMotionTimer.current);
  setWorkspaceMotion({id,direction:'forward'});
  setActiveWorkspace(id);
  workspaceMotionTimer.current=window.setTimeout(()=>setWorkspaceMotion(null),360);
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
 },[]);

 const selectWorkspace=useCallback((id:string)=>{
  const from=workspaces.findIndex(item=>item.id===activeWorkspace);
  const to=workspaces.findIndex(item=>item.id===id);
  animateWorkspaceTo(id,to>=from?'forward':'backward');
 },[workspaces,activeWorkspace,animateWorkspaceTo]);

 const beginWorkspaceSwipe=useCallback((event:React.TouchEvent<HTMLDivElement>)=>{
  if(event.touches.length!==1||workspaces.length<2){workspaceSwipeRef.current=null;return}
  const target=event.target as HTMLElement;
  const blocked=Boolean(target.closest('input,textarea,select,button,a,[role="dialog"],.result-carousel,.story-player,.story-shell,.workspace-drawer-layer,[data-no-workspace-swipe]'));
  const touch=event.touches[0];
  workspaceSwipeRef.current={x:touch.clientX,y:touch.clientY,startedAt:Date.now(),blocked};
 },[workspaces.length]);

 const finishWorkspaceSwipe=useCallback((event:React.TouchEvent<HTMLDivElement>)=>{
  const start=workspaceSwipeRef.current;
  workspaceSwipeRef.current=null;
  if(!start||start.blocked||event.changedTouches.length!==1)return;
  const touch=event.changedTouches[0];
  const dx=touch.clientX-start.x;
  const dy=touch.clientY-start.y;
  const elapsed=Date.now()-start.startedAt;
  if(elapsed>700||Math.abs(dx)<64||Math.abs(dx)<Math.abs(dy)*1.25)return;
  const index=workspaces.findIndex(item=>item.id===activeWorkspace);
  if(index<0)return;
  const nextIndex=dx<0?index+1:index-1;
  const next=workspaces[nextIndex];
  if(next)animateWorkspaceTo(next.id,dx<0?'forward':'backward');
 },[workspaces,activeWorkspace,animateWorkspaceTo]);

 const deleteWorkspace=useCallback((id:string)=>{
  const index=workspaces.findIndex(item=>item.id===id);
  if(index<0)return;
  clearResultSession(id);
  const remaining=workspaces.filter(item=>item.id!==id);
  if(!remaining.length){
   const replacementId=`check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
   setWorkspaces([{id:replacementId,title:'New check',status:'idle'}]);
   setActiveWorkspace(replacementId);
  }else{
   setWorkspaces(remaining);
   if(activeWorkspace===id){
    const next=remaining[Math.min(index,remaining.length-1)];
    if(workspaceMotionTimer.current)window.clearTimeout(workspaceMotionTimer.current);
    setWorkspaceMotion({id:next.id,direction:index>=remaining.length?'backward':'forward'});
    setActiveWorkspace(next.id);
    workspaceMotionTimer.current=window.setTimeout(()=>setWorkspaceMotion(null),360);
   }
  }
  toast.success('Check removed');
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
 },[workspaces,activeWorkspace]);

 return <>
  <div className="seal-workspace-stack" onTouchStart={beginWorkspaceSwipe} onTouchEnd={finishWorkspaceSwipe}>
   {workspaces.map((workspace,index)=><div
    className={`seal-workspace-instance ${workspaceMotion?.id===workspace.id?`is-entering-${workspaceMotion.direction}`:''}`}
    key={workspace.id}
    hidden={workspace.id!==activeWorkspace}
    aria-hidden={workspace.id!==activeWorkspace}
   >
    <SealWorkspace
     initialDemo={index===0?initialDemo:false}
     initialText={index===0?initialText:''}
     initialRun={index===0?initialRun:false}
     workspaceId={workspace.id}
     workspaces={workspaces}
     onNewWorkspace={createWorkspace}
     onSelectWorkspace={selectWorkspace}
     onDeleteWorkspace={deleteWorkspace}
     onWorkspaceMeta={updateWorkspace}
    />
   </div>)}
  </div>
  <Toaster
   position="bottom-center"
   duration={2800}
   visibleToasts={3}
   toastOptions={{
    style:{
     fontFamily:'var(--font-uber-move),Arial,Helvetica,sans-serif',
     background:'#fff',
     color:'#000',
     border:'1px solid #d9d9d9',
     borderRadius:'12px',
     boxShadow:'0 12px 32px rgba(0,0,0,.12)'
    }
   }}
  />
 </>;
}
