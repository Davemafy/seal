/* eslint-disable @next/next/no-img-element -- Native images are required for local blob previews and unoptimized brand marks. */
'use client';

import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Toaster,toast} from 'sonner';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import PDFPreview from './pdf-preview';
import StoryPdfPage from './story-pdf-page';
import {fixtures} from '@/lib/fixtures';
import {fallbackExtract,claimsFromExtraction,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '@/lib/extract';
import {readInBrowser,warmOcr,ocrLanguageForLocale,type OcrLanguage,type BrowserDocument} from '@/lib/browser-file';
import {clearOrphanedResultArtifacts,clearResultSession,persistResultSession,restoreResultSession} from '@/lib/result-session';
import {officialCourtDirectoryFor} from '@/lib/official-directories';
import {detectDocumentContext,type DetectedDocumentLanguage} from '@/lib/document-context';
import {justiceSupportFor} from '@/lib/justice-support';
import {buildCaseReality,buildCourtQuestionScript,buildHandoffSummary,buildObligationMap,buildPlainLanguageSummary,buildRiskSummary} from '@/lib/user-guidance';
import {DISPLAY_LANGUAGES,displayLocaleFor,type DisplayLocale,type UiCopyKey} from '@/lib/ui-locales';
import {persistUiLocale,useStoredUiLocale,useUiText} from '@/lib/use-ui-text';
import {primeBrowserTranslator,translateRecordWithBrowser} from '@/lib/browser-translate';
import type {Claim,Extraction,Result,Token,Verification} from '@/lib/types';
import './workspace.css';
import './result-mobile-repair.css';
import './result-desktop-final.css';
import './result-tabs-final.css';

type Mode='SNAPSHOT'|'LIVE';
type WorkspaceRunStatus='idle'|'reading'|'verifying'|'done'|'error';
type WorkspaceMeta={id:string;title:string;status:WorkspaceRunStatus;language?:string;jurisdiction?:string;preview?:string};
type SealWorkspaceProps={
 initialDemo?:boolean;
 initialText?:string;
 initialRun?:boolean;
 deferIdleOcr?:boolean;
 workspaceId:string;
 workspaceActive:boolean;
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
 const compact=allVirginia&&index>0?title.replace(/^Code of Virginia\s+/i,''):title;
 return compact.replace(/\s+[—–]\s+/g,' ').replace(/\s{2,}/g,' ').trim();
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

const actionDisplayKey=(claim:Claim)=>cleanDisplayText(
 claim.action?.source_text||claim.exact_source_text||claim.value||''
).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const humanizeDisplayName=(value:string)=>{
 const clean=cleanDisplayText(value);
 const letters=clean.replace(/[^A-Za-z]/g,'');
 if(!letters||clean!==clean.toUpperCase())return clean;
 const smallWords=new Set(['a','an','and','as','at','by','for','from','in','of','on','or','the','to','with']);
 const roman=new Set(['ii','iii','iv','vi','vii','viii','ix','xi','xii']);
 return clean.toLowerCase().split(/\s+/).map((word,index,all)=>{
  const bare=word.replace(/^[^a-z0-9]+|[^a-z0-9.]+$/g,'');
  if(!bare)return word;
  let transformed=bare;
  if(roman.has(bare))transformed=bare.toUpperCase();
  else if(index>0&&index<all.length-1&&smallWords.has(bare))transformed=bare;
  else transformed=bare.charAt(0).toUpperCase()+bare.slice(1);
  return word.replace(bare,transformed);
 }).join(' ');
};

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
  <path
   d="m5.75 3.5 4.5 4.5-4.5 4.5"
   fill="none"
   stroke="currentColor"
   strokeWidth="1.55"
   strokeLinecap="round"
   strokeLinejoin="round"
  />
 </svg>;
}

function DesignPlayIcon(){
 return <svg className="design-play-icon" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
  <path d="M5 3.6 10.1 7 5 10.4Z" fill="currentColor"/>
 </svg>;
}

type SealUiIconName='add'|'browse'|'globe'|'refresh'|'copy'|'message'|'download'|'list'|'workspaces'|'delete'|'close'|'voice';

function SealUiIcon({name}:{name:SealUiIconName}){
 const common={fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <svg className="seal-ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  {name==='add'&&<><path {...common} d="M12 5v14"/><path {...common} d="M5 12h14"/></>}
  {name==='browse'&&<><rect {...common} x="4.5" y="4.5" width="5.5" height="5.5" rx="1.2"/><rect {...common} x="14" y="4.5" width="5.5" height="5.5" rx="1.2"/><rect {...common} x="4.5" y="14" width="5.5" height="5.5" rx="1.2"/><rect {...common} x="14" y="14" width="5.5" height="5.5" rx="1.2"/></>}
  {name==='globe'&&<><circle {...common} cx="12" cy="12" r="8.25"/><path {...common} d="M3.9 12h16.2M12 3.75c2.15 2.2 3.2 4.95 3.2 8.25S14.15 18.05 12 20.25C9.85 18.05 8.8 15.3 8.8 12S9.85 5.95 12 3.75Z"/></>}
  {name==='refresh'&&<path {...common} d="M17.7 7.5A6.7 6.7 0 1 0 18.2 14.1M17.7 7.5V4.9m0 2.6h-2.6"/>}
  {name==='copy'&&<><rect {...common} x="8.25" y="8.25" width="10.25" height="10.25" rx="2"/><path {...common} d="M15.75 8.25V6.6a2.1 2.1 0 0 0-2.1-2.1H6.6a2.1 2.1 0 0 0-2.1 2.1v7.05a2.1 2.1 0 0 0 2.1 2.1h1.65"/></>}
  {name==='message'&&<><path {...common} d="M5.1 5.25h13.8a1.85 1.85 0 0 1 1.85 1.85v8.15a1.85 1.85 0 0 1-1.85 1.85H10l-4.75 3v-3H5.1a1.85 1.85 0 0 1-1.85-1.85V7.1A1.85 1.85 0 0 1 5.1 5.25Z"/><path {...common} d="M8 9.25h8M8 13h5.25"/></>}
  {name==='download'&&<><path {...common} d="M12 4.5v10.25"/><path {...common} d="m8.3 11.4 3.7 3.7 3.7-3.7"/><path {...common} d="M5 18.75h14"/></>}
  {name==='list'&&<><path {...common} d="M9 6.5h10M9 12h10M9 17.5h10"/><circle cx="5" cy="6.5" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="17.5" r="1" fill="currentColor"/></>}
  {name==='workspaces'&&<><rect {...common} x="7.25" y="5.25" width="11.5" height="13.5" rx="1.8"/><path {...common} d="M5.25 8.25H4.8A1.8 1.8 0 0 0 3 10.05v7.15A1.8 1.8 0 0 0 4.8 19h.45M9.75 9h6.5M9.75 12.25h6.5M9.75 15.5h4.25"/></>}
  {name==='delete'&&<><path {...common} d="M5.5 7.25h13M9 7.25V5.5h6v1.75M7.5 7.25l.65 11h7.7l.65-11M10 10.5v4.75M14 10.5v4.75"/></>}
  {name==='close'&&<><path {...common} d="m6.5 6.5 11 11M17.5 6.5l-11 11"/></>}
  {name==='voice'&&<><path {...common} d="M5 10v4h3l4 3V7L8 10H5Z"/><path {...common} d="M15 9.25a4 4 0 0 1 0 5.5M17.5 6.75a7.25 7.25 0 0 1 0 10.5"/></>}
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

const PROCESSING_WAIT_NOTES=[
 'A real court name, seal, or address can be copied into a fake message.',
 'A matching phone number or website still does not prove who sent the message.',
 'SEAL checks what the message asks you to do separately from how official it looks.',
 'When a detail cannot be confirmed independently, SEAL leaves it unconfirmed.',
 'The safest next step comes from an independently sourced court or agency page.'
] as const;

function SealWorkspace({initialDemo=false,initialText='',initialRun=false,deferIdleOcr=false,workspaceId,workspaceActive,workspaces,onNewWorkspace,onSelectWorkspace,onDeleteWorkspace,onWorkspaceMeta}:SealWorkspaceProps){
 const [hydrated,setHydrated]=useState(false);
 const [text,setText]=useState(initialText||(initialDemo?fixtures['action-message-demo'].text:''));
 const [draft,setDraft]=useState('');
 const [file,setFile]=useState<BrowserDocument|null>(null);
 const [uploadPreview,setUploadPreview]=useState<{url:string;name:string;kind:'image'|'pdf'}|null>(null);
 const [documentPreviewOpen,setDocumentPreviewOpen]=useState(false);
 const [documentPreviewClosing,setDocumentPreviewClosing]=useState(false);
 const [claims,setClaims]=useState<Claim[]>([]);
 const [verification,setVerification]=useState<Verification|null>(null);
 const [mode,setMode]=useState<Mode>('SNAPSHOT');
 const [extractionMode,setExtractionMode]=useState('');
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [processingTipIndex,setProcessingTipIndex]=useState(0);
 const [dragging,setDragging]=useState(false);
 const [pasteMode,setPasteMode]=useState(false);
 const [ocrLanguage,setOcrLanguage]=useState<OcrLanguage>('eng');
 const [displayLocale,setDisplayLocale]=useState<DisplayLocale>('en');
 const ui=useUiText(displayLocale);
 const [languageMenuOpen,setLanguageMenuOpen]=useState(false);
 const [resultLanguageMenuOpen,setResultLanguageMenuOpen]=useState(false);
 const [workspaceDrawerOpen,setWorkspaceDrawerOpen]=useState(false);
 const [translatedResultData,setTranslatedResult]=useState<Record<string,string>>({});
 const [resultTranslationState,setResultTranslationState]=useState<'idle'|'translating'|'translated'|'unavailable'>('idle');
 const [translationRetry,setTranslationRetry]=useState(0);
 const translationCacheRef=useRef<Map<string,Record<string,string>>>(new Map());
 const translatedResult=useMemo(()=>displayLocale==='en'?{}:translatedResultData,[displayLocale,translatedResultData]);
 const resultUi=useCallback((key:UiCopyKey)=>ui(key),[ui]);
 const [documentLanguage,setDocumentLanguage]=useState<DetectedDocumentLanguage|null>(null);
 const [jurisdiction,setJurisdiction]=useState('');
 const [workspaceTitle,setWorkspaceTitle]=useState('New check');
 const [revealed,setRevealed]=useState(0);
 const [selected,setSelected]=useState('');
 const [hovered,setHovered]=useState('');
 const [showIndex,setShowIndex]=useState(false);
 const [activeResultSection,setActiveResultSection]=useState<'summary'|'message'|'evidence'|'next'>('summary');
 const voiceSupported=typeof window==='undefined'||('speechSynthesis' in window&&typeof window.SpeechSynthesisUtterance!=='undefined');
 const [resultSpeaking,setResultSpeaking]=useState(false);
 const [technicalOpen,setTechnicalOpen]=useState(false);
 const [,setHandoffCopied]=useState(false);

 useEffect(()=>{
  if(!busy)return;
  const timer=window.setInterval(()=>{
   setProcessingTipIndex(index=>(index+1)%PROCESSING_WAIT_NOTES.length);
  },3200);
  return()=>window.clearInterval(timer);
 },[busy]);

 useEffect(()=>()=>{window.speechSynthesis?.cancel()},[]);

 useEffect(()=>{
  if(workspaceActive||!resultSpeaking)return;
  window.speechSynthesis?.cancel();
  const timer=window.setTimeout(()=>setResultSpeaking(false),0);
  return()=>window.clearTimeout(timer);
 },[workspaceActive,resultSpeaking]);
 const [,setQuestionCopied]=useState(false);
 const workspaceRootRef=useRef<HTMLElement>(null);
 const sectionId=(base:string)=>workspaceId==='primary'?base:`${base}-${workspaceId}`;
 const jumpToResultSection=useCallback((section:'summary'|'message'|'evidence'|'next')=>{
  setActiveResultSection(section);
  if(resultSpeaking){
   window.speechSynthesis?.cancel();
   setResultSpeaking(false);
  }
 },[resultSpeaking]);
 const [storyArtifactReady,setStoryArtifactReady]=useState(true);
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
 const documentPreviewPanelRef=useRef<HTMLDivElement>(null);
 const documentPreviewOriginRef=useRef<{left:number;top:number;width:number;height:number}|null>(null);
 const uploadOriginRectRef=useRef<{left:number;top:number;width:number;height:number}|null>(null);
 const activeReadRef=useRef<AbortController|null>(null);
 const activeRequestRef=useRef<AbortController|null>(null);
 const input=useRef<HTMLInputElement>(null);
 const anchors=useRef<Record<string,HTMLElement|null>>({});
 const runId=useRef(0);

 const documentPreviewAsset=uploadPreview
  ?uploadPreview
  :file
   ?{url:file.preview,name:workspaceTitle||'Court message',kind:file.kind}
   :null;
 const processingPreview=uploadPreview
  ?uploadPreview
  :file
   ?{url:file.preview,name:workspaceTitle||'Court message',kind:file.kind}
   :null;

 useEffect(()=>()=> {
  activeReadRef.current?.abort();
  activeRequestRef.current?.abort();
  storyTimelineRef.current?.kill();
  if(storyCloseTimer.current)window.clearTimeout(storyCloseTimer.current);
  if(uploadPreviewRef.current)URL.revokeObjectURL(uploadPreviewRef.current);
 },[]);

 useEffect(()=>{
  const onLocale=(event:Event)=>{
   const next=(event as CustomEvent<DisplayLocale>).detail;
   if(next&&next!==displayLocale)setDisplayLocale(next);
  };
  window.addEventListener('seal:locale-change',onLocale);
  return()=>window.removeEventListener('seal:locale-change',onLocale);
 },[displayLocale]);

 useEffect(()=>{
  if(!workspaceDrawerOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setWorkspaceDrawerOpen(false)};
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)};
 },[workspaceDrawerOpen]);

 const openDocumentPreview=useCallback((origin?:HTMLElement|null)=>{
  if(!documentPreviewAsset)return;
  const rect=origin?.getBoundingClientRect();
  documentPreviewOriginRef.current=rect?{left:rect.left,top:rect.top,width:rect.width,height:rect.height}:null;
  setDocumentPreviewClosing(false);
  setDocumentPreviewOpen(true);
 },[documentPreviewAsset]);

 const closeDocumentPreview=useCallback(()=>{
  if(!documentPreviewOpen||documentPreviewClosing)return;
  const panel=documentPreviewPanelRef.current;
  const origin=documentPreviewOriginRef.current;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!panel||!origin||reduced){
   setDocumentPreviewOpen(false);
   setDocumentPreviewClosing(false);
   return;
  }
  const current=panel.getBoundingClientRect();
  setDocumentPreviewClosing(true);
  gsap.to(panel,{
   x:origin.left-current.left,
   y:origin.top-current.top,
   scaleX:Math.max(.02,origin.width/current.width),
   scaleY:Math.max(.02,origin.height/current.height),
   borderRadius:18,
   duration:.38,
   ease:'power3.inOut',
   transformOrigin:'0 0',
   onComplete:()=>{
    setDocumentPreviewOpen(false);
    setDocumentPreviewClosing(false);
   }
  });
 },[documentPreviewOpen,documentPreviewClosing]);

 useLayoutEffect(()=>{
  if(!documentPreviewOpen||!documentPreviewPanelRef.current)return;
  const panel=documentPreviewPanelRef.current;
  const origin=documentPreviewOriginRef.current;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!origin||reduced)return;
  const current=panel.getBoundingClientRect();
  const context=gsap.context(()=>{
   gsap.fromTo(panel,{
    x:origin.left-current.left,
    y:origin.top-current.top,
    scaleX:Math.max(.02,origin.width/current.width),
    scaleY:Math.max(.02,origin.height/current.height),
    borderRadius:18,
    transformOrigin:'0 0'
   },{
    x:0,y:0,scaleX:1,scaleY:1,borderRadius:0,
    duration:.46,ease:'power3.inOut',clearProps:'transform,borderRadius'
   });
  },panel);
  return()=>context.revert();
 },[documentPreviewOpen]);

 useEffect(()=>{
  if(!documentPreviewOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')closeDocumentPreview()};
  window.addEventListener('keydown',onKey);
  return()=>{
   document.body.style.overflow=previous;
   window.removeEventListener('keydown',onKey);
  };
 },[documentPreviewOpen,closeDocumentPreview]);

 const handleStoryArtifactReady=useCallback(()=>setStoryArtifactReady(true),[]);

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
 const groundedActions=useMemo(()=>{
  const unique=new Map<string,Claim>();
  requestedActions.filter(claimReliable).forEach(claim=>{
   const key=actionDisplayKey(claim);
   if(key&&!unique.has(key))unique.set(key,claim);
  });
  return [...unique.values()];
 },[requestedActions]);
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
 const caseRealityCopy=caseReality
  ?caseReality.status==='NO_IDENTIFIER'
   ?{title:resultUi('caseNoIdentifierTitle'),detail:resultUi('caseNoIdentifierDetail')}
   :caseReality.status==='FOUND'
    ?{title:resultUi('caseFoundTitle'),detail:resultUi('caseFoundDetail')}
    :caseReality.status==='CONFLICT'
     ?{title:resultUi('caseConflictTitle'),detail:resultUi('caseConflictDetail')}
     :{title:resultUi('caseUnconfirmedTitle'),detail:resultUi('caseUnconfirmedDetail')}
  :null;
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
  ?(translatedResult.decisionTitle||decision.title)
  :verification?.safe_action&&primaryActionKind==='pay'
   ?resultUi('decisionPayTitle')
   :verification?.safe_action&&primaryActionKind==='contact'
    ?resultUi('decisionContactTitle')
    :verification?.safe_action&&primaryActionKind==='navigate'
     ?resultUi('decisionNavigateTitle')
     :verification?.safe_action&&primaryActionKind==='disclose'
      ?resultUi('decisionDiscloseTitle')
      :verification?.safe_action&&primaryActionKind==='appear'
       ?resultUi('decisionAppearTitle')
       :verification?.safe_action
        ?resultUi('decisionActTitle')
        :decision.title;
 const humanDecisionSummary=file?.sample
  ?resultUi('decisionSampleSummary')
  :curatedAuthorityMatch
   ?(translatedResult.decisionSummary||decision.summary)
   :decisionRelationshipConflict
    ?resultUi('decisionConflictSummary')
    :verification?.safe_action&&hasPaymentAction
     ?resultUi('decisionPaymentSummary')
     :verification?.safe_action
      ?resultUi('decisionGuidanceSummary')
      :directCourtUnavailable
       ?resultUi('decisionUnverifiedSummary')
       :decision.summary;
 const resultStatusLabel=file?.sample
  ?resultUi('statusExampleDocument')
  :curatedAuthorityMatch
   ?resultUi('statusOfficialWarning')
   :decisionRelationshipConflict
    ?resultUi('statusConflict')
    :directCourtUnavailable
     ?resultUi('statusUnconfirmedNotice')
     :verification?.results.some(result=>result.verdict==='MATCH')
      ?resultUi('statusSomeDetails')
      :resultUi('statusCheckFinished');
 const instructionStatus=file?.sample
  ?resultUi('instructionExample')
  :curatedAuthorityMatch
   ?resultUi('instructionDoNotUse')
   :verification?.results.some(result=>result.verdict==='MISMATCH'&&claims.find(claim=>claim.id===result.claim_id)?.action)
    ?resultUi('instructionMismatch')
    :verification?.results.some(result=>result.verdict==='MATCH'&&claims.find(claim=>claim.id===result.claim_id)?.action)
     ?resultUi('instructionSomeMatch')
     :resultUi('notConfirmed');
 const matterStatus=file?.sample
  ?resultUi('matterNoAction')
  :caseReality?.status==='FOUND'
   ?resultUi('matterCaseFound')
   :caseReality?.status==='CONFLICT'
    ?resultUi('instructionMismatch')
    :resultUi('notConfirmed');
 const safeActionCopy=verification?.safe_action
  ?/ezpassnh\.com/i.test(verification.safe_action.primary_url)
   ?{
     title:resultUi('nhSafeTitle'),
     summary:resultUi('nhSafeSummary'),
     primaryLabel:resultUi('nhSafePrimary'),
     steps:[resultUi('nhSafeStep1'),resultUi('nhSafeStep2'),resultUi('nhSafeStep3')]
    }
   :{
     title:translatedResult.safeTitle||verification.safe_action.title,
     summary:translatedResult.safeSummary||verification.safe_action.summary,
     primaryLabel:translatedResult.safePrimary||verification.safe_action.primary_label,
     steps:verification.safe_action.steps.map((step,index)=>translatedResult[`safeStep${index}`]||step)
    }
  :null;
 const primaryRoute=file?.sample
  ?null
  :verification?.safe_action?.primary_url
   ?{url:verification.safe_action.primary_url,label:safeActionCopy?.primaryLabel||verification.safe_action.primary_label}
   :verification?.contact?.website
    ?{url:verification.contact.website,label:translatedResult.openCourtWebsite||'Open official court website'}
    :officialLookup
     ?{url:officialLookup.url,label:officialLookup.label}
     :officialDirectory
      ?{url:officialDirectory.url,label:officialDirectory.label}
      :null;

 function toggleResultSpeech(){
  if(!verification||!voiceSupported)return;
  const synthesis=window.speechSynthesis;
  if(resultSpeaking){
   synthesis.cancel();
   setResultSpeaking(false);
   return;
  }

  synthesis.cancel();
  const parts:string[]=[];

  if(activeResultSection==='summary'){
   const title=translatedResult.decisionTitle||(file?.sample?'This is a sample form.':conciseDecisionTitle);
   const summary=translatedResult.decisionSummary||humanDecisionSummary;
   parts.push(
    translatedResult.resultStatus||resultStatusLabel,
    title,
    summary
   );
   if(primaryRoute)parts.push((resultUi('nextStep')||'Next step')+'. '+primaryRoute.label);
   if(riskSummary&&!file?.sample&&instructionStatus!==matterStatus){
    parts.push(
     (resultUi('thisMessage'))+'. '+(translatedResult.instructionStatus||instructionStatus)+'.',
     (resultUi('theCase'))+'. '+(translatedResult.matterStatus||matterStatus)+'.'
    );
   }
  }else if(activeResultSection==='message'){
   parts.push(resultUi('originalMessage'),cleanDisplayText(text).slice(0,5000));
  }else if(activeResultSection==='evidence'){
   parts.push(resultUi('independentEvidence'));
   (verification.signals||[]).forEach((signal,index)=>{
    parts.push(
     translatedResult['signalTitle'+index]||signal.title,
     translatedResult['signalSummary'+index]||signal.summary
    );
   });
   verification.results.slice(0,8).forEach((result,index)=>{
    const claim=claims.find(candidate=>candidate.id===result.claim_id);
    const label=translatedResult['resultLabel'+index]||claim?.label||'Checked detail';
    const explanation=translatedResult['resultExplain'+index]||result.explanation;
    parts.push(label+'. '+stateWord(result.verdict)+'. '+explanation);
   });
  }else{
   parts.push(resultUi('whatToDoNext'));
   if(verification.safe_action){
    parts.push(
     safeActionCopy?.title||verification.safe_action.title,
     safeActionCopy?.summary||verification.safe_action.summary,
     ...(safeActionCopy?.steps||verification.safe_action.steps)
    );
   }else if(caseReality){
    parts.push(
     caseRealityCopy?.title||caseReality.title,
     caseRealityCopy?.detail||caseReality.detail
    );
   }
   obligations.slice(0,6).forEach((item,index)=>{
    parts.push(cleanDisplayText(item.text)+'. '+(item.status==='MATCH'?resultUi('obligationMatches'):item.status==='MISMATCH'?resultUi('obligationConflicts'):resultUi('obligationMessageOnly'))+'.');
   });
  }

  const speech=parts.filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  if(!speech)return;
  const utterance=new SpeechSynthesisUtterance(speech);
  const localizedSpeech=displayLocale!=='en'&&(resultTranslationState==='translated'||activeResultSection==='summary'||activeResultSection==='next');
  utterance.lang=activeResultSection==='message'
   ?(documentLanguage?.code||'en')
   :(localizedSpeech?displayLocale:'en');
  utterance.rate=.96;
  utterance.pitch=1;
  utterance.onend=()=>setResultSpeaking(false);
  utterance.onerror=()=>setResultSpeaking(false);
  setResultSpeaking(true);
  synthesis.speak(utterance);
 }
 const resultTranslationSource=useMemo(()=>{
  if(!verification)return {};
  const strings:Record<string,string>={
   decisionTitle:file?.sample?'This is a sample form.':conciseDecisionTitle,
   decisionSummary:humanDecisionSummary,
   resultStatus:resultStatusLabel,
   instructionStatus,
   matterStatus,
   openServiceNote:'Opens an independently sourced official service.',
   openCourtWebsite:'Open official court website',
   messageStatusLabel:'This message',
   caseStatusLabel:'The case',
   whyResult:'Why this result',
   voiceListen:'Listen',
   voiceStop:'Stop',
   resolutionDisclaimer:curatedSignal?'This finding is about this published example only. It does not label other messages.':'These sources help with the check, but they still cannot tell us who sent the message.',
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
   handoffNote:'The saved record includes verification states, source links, and source-check timestamps. It does not include a legal opinion.',
   emptyEvidenceTitleDirect:'This court is not in SEAL’s direct-check network yet.',
   emptyEvidenceTitle:'No independent source evidence was available for this result.',
   emptyEvidenceCopyDirect:'SEAL can still show exactly what the message asks you to do, but it will not guess whether the case or sender is genuine.',
   emptyEvidenceCopy:'The inspection below shows what SEAL could and could not establish from its supported sources.',
   checkContext:'Check context',
   checkContextHint:'Provenance for this result',
   notResolved:'Not resolved',
   livePublicSources:'Live public sources',
   sourceSnapshot:'Source snapshot',
   checkedLabel:'Checked',
   recordPrivacy:'Original files stay in this browser. Source quotations remain attached to the check so the result can be inspected later.',
   whatWasChecked:'What was checked',
   hideList:'Hide list',
   showList:'Show list',
   inMessage:'In the message',
   officialSourceEvidence:'Official source evidence',
   whatCanEstablish:'What we can establish',
   liveOfficialSource:'Live official source',
   moreSourceExcerpt:'more source excerpt',
   moreSourceExcerpts:'more source excerpts',
   notWrongFallback:'This does not mean the detail is wrong.',
   originalSource:'Original source',
   unsupportedNextEyebrow:'What to do next',
   unsupportedNextTitle:'Check this with the court directly.',
   locationNamed:'Location named',
   detailsUnconfirmed:'Those details come from the message itself. They do not confirm that the case exists or that the sender is connected to the court.',
   avoidMessageRoutes:'Do not use a payment link, QR code, phone number, or reply address from the message until you reach the court independently.',
   startHere:'Start here',
   notVerified:'Not verified',
   timeDateStated:'Time/date stated',
   obligationNote:'Dates and instructions here come from the message unless a row explicitly says it matches a public source.',
   explanationLanguagePrefix:'Explanation follows display language',
   detectedDocumentLanguage:'detected document language',
   unknownLanguage:'Unknown',
   lowConfidence:'low confidence',
   explanationDisclaimer:'This explains what SEAL extracted and verified. It is not legal advice.',
   noLegalAid:'No reviewed legal-aid directory is linked for this jurisdiction yet.',
   courtContactHeading:'Court contact from an official source',
   courtContactFallback:'Court contact',
   contactSourcePrefix:'This contact came from the court source, not from the message.',
   snapshotChecked:'Source snapshot checked',
   liveChecked:'Live source checked',
   pdfLabel:'PDF',
   imageLabel:'Image',
   textLabel:'Text'
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
  obligations.forEach((item,index)=>{strings['obligationStatus'+index]=item.statusLabel});
  if(verification.safe_action){
   strings.safeTitle=verification.safe_action.title;
   strings.safeSummary=verification.safe_action.summary;
   verification.safe_action.steps.forEach((step,index)=>{strings[`safeStep${index}`]=step});
   strings.safePrimary=verification.safe_action.primary_label;
  }
  strings.affiliationNote='Independent tool · Not affiliated with any court.';
  strings.obligationMessageOnly='Message only — not confirmed';
  strings.obligationMatches='Matches a public source';
  strings.obligationConflicts='Conflicts with a public source';
  strings.obligationDatesNote='Dates and instructions here come from the message unless a row explicitly says it matches a public source.';
  strings.fileTypeImage='Image';
  strings.fileTypeText='Text';
  strings.directCourtUnavailableTitle='This court is not in SEAL’s direct-check network yet.';
  strings.directCourtUnavailableBody='SEAL can still show exactly what the message asks you to do, but it will not guess whether the case or sender is genuine.';
  strings.noEvidenceTitle='No independent source evidence was available for this result.';
  strings.noEvidenceBody='The inspection below shows what SEAL could and could not establish from its supported sources.';
  return strings;
 },[verification,claims,file?.sample,conciseDecisionTitle,humanDecisionSummary,decisionRelationship,plainExplanation,riskSummary,caseReality,courtQuestionScript,resultStatusLabel,instructionStatus,matterStatus,curatedSignal,obligations]);

 const resultTranslationSectionSource=useMemo(()=>{
  if(!verification||displayLocale==='en')return {};
  const source:Record<string,string>={};
  const take=(key:string)=>{
   const value=resultTranslationSource[key];
   if(typeof value==='string'&&value.trim())source[key]=value;
  };
  const takeIndexed=(prefix:string,max:number)=>{
   Object.keys(resultTranslationSource).forEach(key=>{
    if(!key.startsWith(prefix))return;
    const index=Number(key.slice(prefix.length));
    if(Number.isFinite(index)&&index<max)take(key);
   });
  };

  if(activeResultSection==='summary'){
   ['relationship','riskInstructionsTitle','riskInstructionsDetail','riskMatterTitle','riskMatterDetail'].forEach(take);
   if(curatedAuthorityMatch)['decisionTitle','decisionSummary'].forEach(take);
  }else if(activeResultSection==='evidence'){
   ['emptyEvidenceTitleDirect','emptyEvidenceTitle','emptyEvidenceCopyDirect','emptyEvidenceCopy'].forEach(take);
   takeIndexed('signalTitle',6);
   takeIndexed('signalSummary',6);
   takeIndexed('resultExplain',8);
   takeIndexed('resultLabel',8);
  }else if(activeResultSection==='next'){
   [
    'plainTitle','plainSummary','safeTitle','safeSummary','safePrimary'
   ].forEach(take);
   takeIndexed('safeStep',5);
   takeIndexed('obligationStatus',6);
  }

  return source;
 },[verification,displayLocale,activeResultSection,resultTranslationSource,curatedAuthorityMatch]);

 useEffect(()=>{
  if(!verification||displayLocale==='en'){
   const timer=window.setTimeout(()=>setResultTranslationState('idle'),0);
   return()=>window.clearTimeout(timer);
  }

  const entries=Object.entries(resultTranslationSectionSource);
  if(!entries.length){
   const timer=window.setTimeout(()=>setResultTranslationState('translated'),0);
   return()=>window.clearTimeout(timer);
  }

  const alreadyTranslated=entries.every(([key])=>Object.prototype.hasOwnProperty.call(translatedResultData,key));
  if(alreadyTranslated){
   const timer=window.setTimeout(()=>setResultTranslationState('translated'),0);
   return()=>window.clearTimeout(timer);
  }

  const sourceKey=JSON.stringify(resultTranslationSectionSource);
  const cacheKey=displayLocale+'|'+activeResultSection+'|'+sourceKey;
  const cached=translationCacheRef.current.get(cacheKey);
  if(cached){
   const timer=window.setTimeout(()=>{
    setTranslatedResult(previous=>({...previous,...cached}));
    setResultTranslationState('translated');
   },0);
   return()=>window.clearTimeout(timer);
  }

  const controller=new AbortController();
  const stateTimer=window.setTimeout(()=>setResultTranslationState('translating'),0);

  void (async()=>{
   try{
    const nativeStrings=await translateRecordWithBrowser(resultTranslationSectionSource,displayLocale,controller.signal,400);
    if(nativeStrings&&!controller.signal.aborted){
     translationCacheRef.current.set(cacheKey,nativeStrings);
     setTranslatedResult(previous=>({...previous,...nativeStrings}));
     setResultTranslationState('translated');
     return;
    }
   }catch(error){
    if(controller.signal.aborted)return;
    if(error instanceof DOMException&&error.name==='AbortError')return;
   }

   if(controller.signal.aborted)return;
   try{
    const request=fetch('/api/translate',{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({locale:displayLocale,strings:resultTranslationSectionSource}),
     signal:controller.signal
    });
    const response=await Promise.race([
     request,
     new Promise<Response>((_,reject)=>window.setTimeout(()=>reject(new Error('Translation timed out')),9000))
    ]);
    if(!response.ok){
     if(!controller.signal.aborted)setResultTranslationState('unavailable');
     return;
    }
    const payload=await response.json() as {strings?:Record<string,string>;mode?:string};
    if(payload.mode!=='TRANSLATED'||!payload.strings){
     if(!controller.signal.aborted)setResultTranslationState('unavailable');
     return;
    }
    if(controller.signal.aborted)return;
    translationCacheRef.current.set(cacheKey,payload.strings);
    setTranslatedResult(previous=>({...previous,...payload.strings}));
    setResultTranslationState('translated');
   }catch{
    if(!controller.signal.aborted)setResultTranslationState('unavailable');
   }
  })();

  return()=>{
   window.clearTimeout(stateTimer);
   controller.abort();
  };
 },[
  verification,displayLocale,activeResultSection,resultTranslationSectionSource,
  translatedResultData,translationRetry
 ]);

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

 const reliableCourtTitle=claims.find(claim=>claim.type==='court'&&claimReliable(claim)&&cleanDisplayText(claim.value))?.value;
 const plausibleCourtTitle=reliableCourtTitle&&/[A-Za-zÀ-ÿ]{4}/.test(reliableCourtTitle)&&!/[^A-Za-zÀ-ÿ0-9\s.,'’&()\-]/.test(reliableCourtTitle)
  ?reliableCourtTitle
  :'';
 const checkObjectTitle=cleanDisplayText(plausibleCourtTitle||workspaceTitle||'Court message');
 const checkObjectDisplayTitle=humanizeDisplayName(checkObjectTitle)
  .replace(/^United States District Court\s*/i,'U.S. District Court · ')
  .replace(/\s{2,}/g,' ')
  .replace(/·\s*·/g,'·')
  .replace(/·\s*$/,'');
 const checkObjectReference=caseReality?.reference||'';
 const jurisdictionLooksLikeAddress=/\d|\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?)\b/i.test(jurisdiction);
 const documentJurisdictionLabel=jurisdictionLooksLikeAddress
  ?(/\bnew hampshire\b/i.test(text)?'United States · New Hampshire'
    :/\bconnecticut\b/i.test(text)?'United States · Connecticut'
     :/\b(?:dallas|texas)\b/i.test(text)?'United States · Texas'
      :/\b(?:riverside|california)\b/i.test(text)?'United States · California'
       :'')
  :jurisdiction;
 const checkSourceCount=technicalEvidence.length;
 const latestCheckTimestamp=technicalEvidence.reduce((latest,evidence)=>{
  const value=Date.parse(evidence.checked_at);
  return Number.isFinite(value)&&value>latest?value:latest;
 },0);
 const checkDateLabel=latestCheckTimestamp
  ?new Date(latestCheckTimestamp).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
  :'';
 const checkInputLabel=file?(file.kind==='pdf'?(translatedResult.pdfLabel||'PDF'):(translatedResult.imageLabel||'Image')):(translatedResult.textLabel||'Text');
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
     const restoredContext=detectDocumentContext(restored.text);
     const restoredCourt=restored.claims.find(claim=>claim.type==='court'&&cleanDisplayText(claim.value))?.value;
     const registryTitle=workspaces.find(item=>item.id===workspaceId)?.title||'';
     setText(restored.text);
     setClaims(restored.claims);
     setVerification(restored.verification);
     setMode(restored.mode);
     setExtractionMode(restored.extractionMode);
     setSelected(restored.selected||restored.claims[0]?.id||'');
     setRevealed(restored.claims.length);
     setDocumentLanguage(restoredContext.language);
     setJurisdiction(restoredContext.jurisdiction);
     setWorkspaceTitle(cleanDisplayText(restoredCourt||registryTitle||'Court message'));
     setFile(restored.browserFile);
     sourceBlobRef.current=restored.sourceBlob;
     setStoryArtifactReady(!restored.browserFile);
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
  let preferred=displayLocaleFor(browserLocale);
  try{preferred=displayLocaleFor(window.localStorage.getItem(DISPLAY_LOCALE_KEY)||browserLocale)}catch{}
  setDisplayLocale(preferred);
  setOcrLanguage(ocrLanguageForLocale(preferred));
 },[hydrated]);

 useEffect(()=>{
  if(!hydrated||busy||verification||deferIdleOcr)return;
  const timer=window.setTimeout(()=>{
   void warmOcr(ocrLanguage).catch(()=>{});
  },350);
  return()=>window.clearTimeout(timer);
 },[hydrated,busy,verification,ocrLanguage,deferIdleOcr]);

 useEffect(()=>{
  if(!hydrated||initialRunStarted.current||!workspaceActive)return;
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
  // Consume the query immediately so refresh/back-to-home never re-runs a case.
  window.history.replaceState(null,'',window.location.pathname);
  initialRunStarted.current=true;
  void (async()=>{
   const controller=new AbortController();
   activeReadRef.current?.abort();
   activeReadRef.current=controller;
   const handoffId=runId.current;
   const busyStartedAt=performance.now();
   let browsePreview='';
   try{
    setBusy(true);
    setError('');
    setStatus('Opening the source document');

    const [caseResponse,thumbnailResponse]=await Promise.all([
     fetch(`/api/browse-case?id=${encodeURIComponent(caseId)}`,{signal:controller.signal}),
     fetch(`/browse-assets/${encodeURIComponent(caseId)}.jpg`,{signal:controller.signal})
    ]);
    if(controller.signal.aborted||runId.current!==handoffId)return;
    if(!caseResponse.ok)throw new Error('Case unavailable');

    const payload=await caseResponse.json() as {
     runText?:string;
     assetType?:'pdf'|'image';
     ocrLanguage?:OcrLanguage;
     title?:string;
    };
    const seededText=payload.runText?.trim()||'';

    // Curated Browse cases should never depend on the authority server during
    // the demo path. Use the cached authority thumbnail as the visible document
    // and the source-checked transcript as the analysis input.
    if(seededText){
     let doc:BrowserDocument|null=null;

     if(thumbnailResponse.ok){
      const thumbnailBlob=await thumbnailResponse.blob();
      const thumbnailFile=new File([thumbnailBlob],`${caseId}.jpg`,{type:'image/jpeg'});
      sourceBlobRef.current=thumbnailFile;

      browsePreview=URL.createObjectURL(thumbnailFile);
      uploadPreviewRef.current=browsePreview;
      setUploadPreview({
       url:browsePreview,
       name:payload.title||`${caseId}.jpg`,
       kind:'image'
      });

      doc={
       text:seededText,
       tokens:[],
       preview:URL.createObjectURL(thumbnailFile),
       kind:'image',
       uncertain:false,
       sample:false,
       unreadableFields:[]
      };
      setFile(doc);
      setStoryArtifactReady(false);
     }else{
      sourceBlobRef.current=null;
      setFile(null);
      setStoryArtifactReady(true);
     }

     setWorkspaceTitle(payload.title||'Court message');
     setText(seededText);
     setStatus('Reading requested actions');

     const openingWait=Math.max(0,180-(performance.now()-busyStartedAt));
     if(openingWait)await new Promise(resolve=>window.setTimeout(resolve,openingWait));

     await run('SNAPSHOT',{
      text:seededText,
      file:doc,
      curated:true,
      curatedCaseId:caseId,
      browse:true
     });
     return;
    }

    // Non-curated entries may need the original asset so OCR can establish the
    // requested action. Keep the cached thumbnail visible while that happens.
    if(thumbnailResponse.ok){
     const thumbnailBlob=await thumbnailResponse.blob();
     const thumbnailFile=new File([thumbnailBlob],`${caseId}.jpg`,{type:'image/jpeg'});
     browsePreview=URL.createObjectURL(thumbnailFile);
     uploadPreviewRef.current=browsePreview;
     setUploadPreview({
      url:browsePreview,
      name:payload.title||`${caseId}.jpg`,
      kind:'image'
     });
    }

    const assetResponse=await fetch(`/api/browse-asset?id=${encodeURIComponent(caseId)}`,{signal:controller.signal});
    if(controller.signal.aborted||runId.current!==handoffId)return;
    if(!assetResponse.ok||!payload.assetType)throw new Error('Case asset unavailable');

    const blob=await assetResponse.blob();
    const isPdf=payload.assetType==='pdf';
    const type=isPdf?'application/pdf':blob.type.startsWith('image/')?blob.type:'image/jpeg';
    const extension=isPdf?'pdf':type.includes('png')?'png':'jpg';
    const sourceFile=new File([blob],`${caseId}.${extension}`,{type});
    sourceBlobRef.current=sourceFile;

    const doc=await readInBrowser(
     sourceFile,
     next=>{if(!controller.signal.aborted&&runId.current===handoffId)setStatus(next)},
     payload.ocrLanguage||ocrLanguage,
     controller.signal
    );
    if(controller.signal.aborted||runId.current!==handoffId){
     URL.revokeObjectURL(doc.preview);
     return;
    }

    if(!doc.text.trim())throw new Error('Case text unavailable');
    setFile(doc);
    setStoryArtifactReady(false);
    setText(doc.text);
    await run('SNAPSHOT',{text:doc.text,file:doc,curatedCaseId:caseId,browse:true});
   }catch{
    if(controller.signal.aborted||runId.current!==handoffId)return;
    const openingWait=Math.max(0,180-(performance.now()-busyStartedAt));
    if(openingWait)await new Promise(resolve=>window.setTimeout(resolve,openingWait));
    setBusy(false);
    setStatus('');
    initialRunStarted.current=false;
    setError('This browse case could not be opened. You can still upload or paste a message.');
   }finally{
    if(activeReadRef.current===controller)activeReadRef.current=null;
    if(browsePreview&&uploadPreviewRef.current===browsePreview){
     URL.revokeObjectURL(browsePreview);
     uploadPreviewRef.current=null;
     setUploadPreview(null);
    }
   }
  })();
 // This is a one-shot URL handoff. Adding run/ocrLanguage would replay the
 // case after the effect itself mutates result state.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[hydrated,initialRun,initialText,workspaceActive]);

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
  if(!storyArtifactReady&&file?.kind!=='pdf')return;
  if(file?.kind==='pdf'&&!storyArtifactReady){
   setStoryPlaying(false);
   setStoryClosing(false);
   setStoryOpen(true);
   return;
  }
  if(storyCloseTimer.current){window.clearTimeout(storyCloseTimer.current);storyCloseTimer.current=undefined}
  storyTimelineRef.current?.kill();
  storyTimelineTime.current=0;
  storyPhaseRef.current=0;
  setStoryStep(0);
  setStoryPlaying(true);
  setStoryClosing(false);
  setStoryOpen(true);
  window.requestAnimationFrame(()=>storyPauseButton.current?.focus());
 }
 function closeStory(){
  if(storyClosing)return;
  if(storyCloseTimer.current)window.clearTimeout(storyCloseTimer.current);
  storyTimelineRef.current?.pause();
  setStoryClosing(true);
  setStoryPlaying(false);
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
  // Start browser-native translation while this click still has user activation.
  // Unsupported browsers/language pairs simply fall through to the existing API.
  if(locale!=='en')void primeBrowserTranslator(locale);
  setTranslatedResult({});
  setResultTranslationState(locale==='en'?'idle':'translating');
  setTranslationRetry(0);
  setDisplayLocale(locale);
  persistUiLocale(locale);
  setLanguageMenuOpen(false);
  setResultLanguageMenuOpen(false);
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
  setDocumentPreviewOpen(false);
  setDocumentPreviewClosing(false);
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
  setFile(null);setText('');setDraft('');setPasteMode(false);setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setActiveResultSection('summary');setTechnicalOpen(false);setHandoffCopied(false);setQuestionCopied(false);setStoryArtifactReady(true);setMode('SNAPSHOT');setStoryOpen(false);setStoryStep(0);setStoryPlaying(true);setStoryClosing(false);
 }

 function submitPaste(){const value=draft.trim();if(!value)return;clear();setText(value);void run('SNAPSHOT',{text:value,file:null})}

 function runEntryExample(key:keyof typeof fixtures){
  const example=fixtures[key];
  clear();
  setWorkspaceTitle(example.title);
  setText(example.text);
  setPasteMode(false);
  void run('SNAPSHOT',{text:example.text,file:null});
 }

async function upload(uploaded:File){
  const origin=processingIntakeRef.current?.getBoundingClientRect();
  uploadOriginRectRef.current=origin?{left:origin.left,top:origin.top,width:origin.width,height:origin.height}:null;
  clear();
  setWorkspaceTitle(uploaded.name.replace(/\.[^.]+$/,'')||'New check');
  const selectedPreview=URL.createObjectURL(uploaded);
  uploadPreviewRef.current=selectedPreview;
  setUploadPreview({url:selectedPreview,name:uploaded.name,kind:uploaded.type==='application/pdf'?'pdf':'image'});
  sourceBlobRef.current=uploaded;
  const controller=new AbortController();
  activeReadRef.current=controller;
  const uploadId=runId.current;
  const busyStartedAt=performance.now();
  setBusy(true);setStatus('Preparing your file');
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
   const remaining=Math.max(0,300-(performance.now()-busyStartedAt));
   if(remaining)await new Promise(resolve=>window.setTimeout(resolve,remaining));
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
  const busyStartedAt=performance.now();
  storyTimelineRef.current?.kill();
  storyTimelineTime.current=0;
  storyPhaseRef.current=0;
  setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setTechnicalOpen(false);
  setActiveResultSection('summary');
  setStoryOpen(false);setStoryStep(0);setStoryPlaying(false);setStoryClosing(false);
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
   const remaining=Math.max(0,300-(performance.now()-busyStartedAt));
   if(remaining)await new Promise(resolve=>window.setTimeout(resolve,remaining));
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
  if(!hydrated)return;
  const courtTitle=claims.find(claim=>claim.type==='court'&&claimReliable(claim))?.value;
  const title=cleanDisplayText(courtTitle||workspaceTitle||'New check');
  const firstAction=claims.find(claim=>Boolean(claim.action)&&claimReliable(claim));
  const firstUsefulLine=text.split(/\n+/).map(cleanDisplayText).find(line=>line.length>=12&&!/^new check$/i.test(line));
  const preview=cleanDisplayText(firstAction?.action?.source_text||firstAction?.value||firstUsefulLine||'').slice(0,84);
  const state:WorkspaceRunStatus=error?'error':verification?'done':busy?(status==='Checking independent sources'?'verifying':'reading'):'idle';
  onWorkspaceMeta(workspaceId,{title,status:state,language:documentLanguage?.label,jurisdiction,preview});
 },[hydrated,workspaceId,workspaceTitle,claims,text,error,verification,busy,status,documentLanguage?.label,jurisdiction,onWorkspaceMeta]);

 const processingStage=status==='Checking independent sources'?2:status==='Reading requested actions'?1:0;
 const processingTitle=processingStage===2?'Checking public sources':processingStage===1?'Finding the instructions':'Reading your document';
 const processingTextRegionsVisible=useMemo(()=>file?.tokens?processingTextRegions(file.tokens):[],[file]);
 const processingRegionCount=processingTextRegionsVisible.length;
 const processingMeta=[documentLanguage?.label,jurisdiction].filter(Boolean).join(' · ');
 const processingFileName=uploadPreview?.name&&uploadPreview.name.length<=56&&/[A-Za-z]{3}/.test(uploadPreview.name)?uploadPreview.name:'';
 const processingStages=[
  {
   label:'Read document',
   detail:processingRegionCount?`${processingRegionCount} text regions recovered`:'Reading locally from the selected file'
  },
  {
   label:'Find instructions',
   detail:claims.length?`${claims.length} checkable detail${claims.length===1?'':'s'} found`:(processingStage>=1?'Identifying the actions that matter':'Waiting for document text')
  },
  {
   label:'Check public sources',
   detail:processingStage===2?'Comparing the extracted details with independent sources':'Starts after the message is understood'
  }
 ] as const;

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
  <aside className="workspace-rail" aria-label={ui('workspace')}>
   <div className="rail-topbar">
    <Link href="/" className="rail-brand" aria-label={ui('sealHome')} onClick={event=>{if(verification||busy||file||text||draft){event.preventDefault();clear()}}}><img src="/brand/seal-mark-black.svg" alt=""/><span className="rail-brand-word">SEAL</span><span className="rail-brand-reg">®</span></Link>
    <button className="icon-control rail-icon-control rail-new-check" type="button" aria-label={ui('newCheck')} title={ui('newCheck')} data-tooltip={ui('newCheck')} onClick={onNewWorkspace}><SealUiIcon name="add"/></button>
   </div>
   <nav className="rail-primary-nav" aria-label={ui('primary')}>
    <Link className="rail-nav-item" href="/browse"><span>{ui('browse')}</span></Link>
   </nav>
   <div className="rail-section-head"><span>{ui('checks')}</span><small>{workspaces.length}</small></div>
   <div className="rail-check-list" aria-label="Open checks">
    {workspaces.map((item,index)=>{
     const rawTitle=cleanDisplayText(item.title||'');
     const blankTitle=!rawTitle||/^new check(?: \d+)?$/i.test(rawTitle);
     const title=blankTitle?(workspaces.length===1?'New check':`Check ${index+1}`):(rawTitle.length>=3?rawTitle:`Check ${index+1}`);
     const usefulPreview=cleanDisplayText(item.preview||'');
     const statusLabel=item.status==='verifying'?'Checking sources':item.status==='reading'?'Reading':item.status==='done'?'Checked':item.status==='error'?'Needs attention':'';
     const secondary=item.status==='reading'||item.status==='verifying'||item.status==='error'
      ?[item.jurisdiction||item.language,statusLabel].filter(Boolean).join(' · ')
      :(usefulPreview.length>=8?usefulPreview:[item.jurisdiction||item.language,item.status==='done'?'Checked':''].filter(Boolean).join(' · '));
     return <div className={`rail-check-row ${item.id===workspaceId?'is-current':''}`} key={item.id}>
      <button
       type="button"
       className={`rail-check ${item.id===workspaceId?'is-current':''}`}
       onClick={()=>onSelectWorkspace(item.id)}
       aria-current={item.id===workspaceId?'page':undefined}
      >
       <span className={`rail-check-state is-${item.status}`} aria-hidden="true"/>
       <span className="rail-check-copy"><strong>{title}</strong>{secondary&&<small>{secondary}</small>}</span>
      </button>
      <button className="rail-check-delete icon-control" type="button" aria-label={`Delete check ${index+1}: ${title}`} title={`Delete ${title}`} onClick={()=>onDeleteWorkspace(item.id)}><SealUiIcon name="delete"/></button>
     </div>;
    })}
   </div>
   <div className="rail-spacer"/>
   <div className="rail-bottom">
    <div className="rail-language">
     <div className="rail-language-menu">
      <button
       type="button"
       className="rail-language-trigger"
       aria-label={ui('displayLanguage')}
       aria-haspopup="listbox"
       aria-expanded={languageMenuOpen}
       onClick={()=>{setWorkspaceDrawerOpen(false);setResultLanguageMenuOpen(false);setLanguageMenuOpen(open=>!open)}}
      >
       <SealUiIcon name="globe"/>
       <span>{displayLocale.toUpperCase()}</span>
       <SealGuideIcon/>
      </button>
      {languageMenuOpen&&<div className="rail-language-popover" role="listbox" aria-label={ui('displayLanguage')}>
       <div className="rail-language-popover-head">
        <strong>{ui('displayLanguage')}</strong>
       </div>
       {Object.entries(DISPLAY_LANGUAGES).map(([code,label])=><button
        type="button"
        role="option"
        aria-selected={code===displayLocale}
        className={code===displayLocale?'is-selected':''}
        key={code}
        onClick={()=>{changeDisplayLanguage(code as DisplayLocale);setLanguageMenuOpen(false)}}
       ><span>{label}</span><small>{code.toUpperCase()}</small></button>)}
      </div>}
     </div>
    </div>
   </div>
  </aside>
  <header className="seal-nav mobile-only-nav">
   <Link href="/" className="mobile-brand" aria-label={ui('sealHome')} onClick={event=>{if(verification||busy||file||text||draft){event.preventDefault();clear()}}}><img src="/brand/seal-mark-black.svg" alt=""/></Link>
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
    <button className="icon-control mobile-nav-icon mobile-workspace-trigger" type="button" aria-label={`${ui('openChecks')}, ${workspaces.length}`} title={ui('openChecks')} aria-haspopup="dialog" aria-expanded={workspaceDrawerOpen} onClick={()=>{setLanguageMenuOpen(false);setWorkspaceDrawerOpen(true)}}>
     <SealUiIcon name="workspaces"/>
    </button>
    <button className="icon-control mobile-nav-icon mobile-new-check" type="button" aria-label={ui('newCheck')} title={ui('newCheck')} onClick={()=>{setWorkspaceDrawerOpen(false);onNewWorkspace()}}><SealUiIcon name="add"/></button>
   </div>
  </header>

  <div className={`workspace-drawer-layer ${workspaceDrawerOpen?'is-open':''}`} data-testid="workspace-drawer-layer" aria-hidden={!workspaceDrawerOpen}>
   <button className="workspace-drawer-backdrop" type="button" aria-label={ui('closeChecks')} onClick={()=>setWorkspaceDrawerOpen(false)}/>
   <aside className="workspace-drawer" role={workspaceDrawerOpen?'dialog':undefined} aria-modal={workspaceDrawerOpen?'true':undefined} aria-label={workspaceDrawerOpen?'Checks':undefined}>
    <div className="workspace-drawer-head">
     <div className="workspace-drawer-title"><strong>Checks</strong><span>{workspaces.length}</span></div>
     <div className="workspace-drawer-head-actions">
      <button className="icon-control drawer-icon-button" type="button" aria-label={ui('newCheck')} title={ui('newCheck')} onClick={()=>{
       setWorkspaceDrawerOpen(false);
       window.setTimeout(()=>onNewWorkspace(),340);
      }}><SealUiIcon name="add"/></button>
      <button className="icon-control drawer-icon-button" type="button" aria-label={ui('closeChecks')} title={ui('closeChecks')} onClick={()=>setWorkspaceDrawerOpen(false)}><SealUiIcon name="close"/></button>
     </div>
    </div>
    <div className="workspace-drawer-list" aria-label="Open checks">
     {workspaces.map((item,index)=>{
      const rawTitle=cleanDisplayText(item.title||'');
      const title=!rawTitle||/^new check(?: \d+)?$/i.test(rawTitle)?(workspaces.length===1?'New check':`Check ${index+1}`):rawTitle;
      const statusLabel=item.status==='verifying'?'Checking sources':item.status==='reading'?'Reading':item.status==='done'?'Checked':item.status==='error'?'Needs attention':'';
      return <div className={`workspace-drawer-row ${item.id===workspaceId?'is-current':''}`} key={item.id}>
       <button className="workspace-drawer-select" type="button" aria-current={item.id===workspaceId?'page':undefined} onClick={()=>{
        setWorkspaceDrawerOpen(false);
        window.setTimeout(()=>onSelectWorkspace(item.id),340);
       }}>
        <span className={`rail-check-state is-${item.status}`} aria-hidden="true"/>
        <span className="workspace-drawer-copy"><strong>{title}</strong>{(item.preview||[item.jurisdiction||item.language,statusLabel].filter(Boolean).join(' · '))&&<small>{item.preview||[item.jurisdiction||item.language,statusLabel].filter(Boolean).join(' · ')}</small>}</span>
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

  {!hydrated?
   <section className="workspace-restore-shell" aria-live="polite">
    <span>{ui('openingCheck')}</span>
   </section>
   :busy||!verification?
   <section className={`entry-shell ${busy?'is-processing':''}`} data-testid="entry-shell">
   <div className="entry-copy">
     {busy&&<span className="processing-entry-kicker">Independent check</span>}
     <h1>{busy?'Checking this message':ui('checkCourtMessage')}</h1>
     <p>{busy?'SEAL is separating what the message asks you to do from what independent public sources can actually establish.':ui('entrySummary')}</p>
    </div>

    {!busy&&<div className="entry-intake-heading">
     <span>What did you receive?</span>
     <small>Upload the message or paste it exactly as you received it.</small>
    </div>}

    <div ref={processingIntakeRef} className={`intake ${pasteMode?'is-paste-mode':'is-upload-mode'} ${busy?'is-processing-intake':''}`}>
     {!pasteMode?
      <>
       <button className={`upload-row ${dragging?'is-dragging':''} ${busy?'is-busy':''}`} data-testid="upload-file" type="button" disabled={!hydrated} aria-busy={busy} onClick={event=>{
         if(busy){openDocumentPreview(event.currentTarget.querySelector<HTMLElement>('.upload-process-media'));return}
         filePickerArmed.current=true;input.current?.click()
        }}
        onDragOver={event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();setDragging(true)}}}
        onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false)}}
        onDrop={event=>{event.preventDefault();setDragging(false);if(event.dataTransfer.files[0])upload(event.dataTransfer.files[0])}}>
        {busy?
         <span className="upload-process" role="status" aria-live="polite" aria-label={processingTitle}>
          <span className={`upload-process-media ${processingPreview?.kind==='pdf'?'is-pdf':''}`} data-testid="processing-preview" aria-label={ui('openFullDocumentPreview')}>
           {processingPreview?.kind==='image'
            ?<img src={processingPreview.url} alt="Selected court message"/>
            :processingPreview?.kind==='pdf'
             ?<StoryPdfPage url={processingPreview.url}/>
             :<span className="upload-pdf-preview" aria-hidden="true"><b>PDF</b><i/></span>}
           <span className="processing-scanner" aria-hidden="true"><i/></span>
           <span className="processing-scan-label" aria-hidden="true"><i/>Scanning</span>
          </span>
          <span className="upload-process-body">
           <strong>{processingTitle}</strong>
           {processingMeta&&<span className="process-live-meta">{processingMeta}</span>}
           <span className="process-stage-list" aria-label={ui('checkProgress')}>
            {processingStages.map((stage,index)=>{
             const state=index<processingStage?'done':index===processingStage?'current':'pending';
             return <span className={`process-stage-row is-${state}`} key={stage.label} aria-current={state==='current'?'step':undefined}>
              <span><b>{stage.label}</b><small>{stage.detail}</small></span>
              <em>{state==='done'?'Done':state==='current'?'Now':''}</em>
             </span>;
            })}
           </span>
           <span className="process-wait-note" aria-live="polite">
            <small>While we check</small>
            <span key={processingTipIndex}>{PROCESSING_WAIT_NOTES[processingTipIndex]}</span>
           </span>
           {processingFileName&&<span className="upload-file-name" title={processingFileName}>{processingFileName}</span>}
           <span className="process-device-note"><span>{ui('originalStays')}</span><small>Extracted text may be sent for checking</small></span>
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
       {!busy&&<div className="intake-secondary-actions">
        <button className="paste-mode-switch" type="button" onClick={()=>setPasteMode(true)}>{ui('pasteInstead')} <SealGuideIcon direction="right"/></button>
        <p className="privacy-note">{ui('privacyNote')}</p>
       </div>}
      </>
      :
      <div className="paste-mode-panel">
       <button className="paste-mode-switch paste-mode-back" type="button" onClick={()=>setPasteMode(false)}><SealGuideIcon direction="left"/> {ui('uploadInstead')}</button>
       <label className="paste-field">
        <span className="field-label">{ui('messageText')}</span>
        <textarea autoFocus aria-label={ui('pasteCourtMessage')} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={ui('messagePlaceholder')}/>
       </label>
       <div className="intake-actions">
        <button className="check-message" type="button" disabled={!draft.trim()||!hydrated} onClick={submitPaste}>{ui('checkMessage')}</button>
       </div>
       <p className="privacy-note">{ui('privacyNote')}</p>
      </div>}

     {error&&<div role="alert" className="inspection-error">{error}</div>}
    </div>

    {!busy&&<aside className="entry-context-rail entry-demo-rail" aria-label={ui('trySealExample')}>
     <div className="entry-demo-head">
      <span>{ui('tryExample')}</span>
      <small>{ui('noUploadNeeded')}</small>
     </div>

     <button className="entry-demo-feature" type="button" onClick={()=>runEntryExample('action-message-demo')}>
      <span className="entry-demo-preview">
       <small>Text message</small>
       <strong>“To avoid arrest, pay $750 today using Cash App.”</strong>
      </span>
      <span className="entry-demo-feature-copy">
       <span>Jury-duty payment demand</span>
       <small>Connecticut · synthetic</small>
       <b>Run this check <SealGuideIcon direction="right"/></b>
      </span>
     </button>

     <div className="entry-demo-list">
      <button type="button" onClick={()=>runEntryExample('riverside-mismatch-demo')}>
       <span><strong>Mixed court notice</strong><small>California · payment route</small></span>
       <SealGuideIcon direction="right"/>
      </button>
      <button type="button" onClick={()=>runEntryExample('unsupported-court-demo')}>
       <span><strong>Coverage boundary</strong><small>India · safe abstention</small></span>
       <SealGuideIcon direction="right"/>
      </button>
     </div>

     <p className="entry-demo-note">Examples use fictional personal details and published scam patterns.</p>
    </aside>}

   </section>
   :
   <section className="review-shell" data-testid="result-shell"
    onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault()}}
    onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();upload(event.dataTransfer.files[0])}}}>
    <header className="result-masthead" id={sectionId('result-top')} data-testid="check-object-header">
     <div className="result-masthead-row">
      <div className="check-object-identity">
       <h1>{checkObjectDisplayTitle}</h1>
       <div className="check-object-meta">
        <div className={`result-language-control is-${resultTranslationState}`}>
         <button type="button" className="result-language-trigger" aria-label={`Display language: ${DISPLAY_LANGUAGES[displayLocale]}`} aria-haspopup="listbox" aria-expanded={resultLanguageMenuOpen} onClick={()=>{setLanguageMenuOpen(false);setResultLanguageMenuOpen(open=>!open)}}>
          <SealUiIcon name="globe"/>
          <span className="result-language-label">{DISPLAY_LANGUAGES[displayLocale]}</span>
          {displayLocale!=='en'&&<span className="result-language-state" aria-hidden="true"/>}
          <SealGuideIcon/>
         </button>
         {resultLanguageMenuOpen&&<div className="result-language-popover" role="listbox" aria-label={resultUi('displayLanguage')}>
          <div className="result-language-popover-head">
           <strong>{resultUi('displayLanguage')}</strong>
           <small>{documentLanguage?.label?`Original: ${documentLanguage.label}`:'Original preserved'}</small>
          </div>
          {Object.entries(DISPLAY_LANGUAGES).map(([code,label])=><button type="button" role="option" aria-selected={code===displayLocale} className={code===displayLocale?'is-selected':''} key={code} onClick={()=>changeDisplayLanguage(code as DisplayLocale)}><span>{label}</span><small>{code.toUpperCase()}</small></button>)}
          {displayLocale!=='en'&&resultTranslationState==='unavailable'&&<button type="button" className="result-translation-retry" onClick={()=>{setResultTranslationState('translating');setTranslationRetry(value=>value+1)}}><span>{resultUi('retryTranslation')}</span><small>{resultUi('tryAgain')}</small></button>}
         </div>}
        </div>
        {voiceSupported&&<button
         type="button"
         className={`result-voice-trigger${resultSpeaking?' is-speaking':''}`}
         aria-pressed={resultSpeaking}
         aria-label={resultSpeaking?'Stop reading result aloud':`Read ${activeResultSection==='next'?'Resolve':activeResultSection==='message'?'Original':activeResultSection.charAt(0).toUpperCase()+activeResultSection.slice(1)} aloud`}
         title={resultSpeaking?'Stop reading result aloud':`Read ${activeResultSection==='next'?'Resolve':activeResultSection==='message'?'Original':activeResultSection.charAt(0).toUpperCase()+activeResultSection.slice(1)} aloud`}
         onClick={toggleResultSpeech}
        ><SealUiIcon name="voice"/><span>{resultSpeaking?resultUi('stopReading'):resultUi('listen')}</span></button>}
        {documentJurisdictionLabel&&<span className="meta-jurisdiction" data-testid="document-jurisdiction">{documentJurisdictionLabel}</span>}
       </div>
      </div>
      <div className="check-object-actions" aria-label={resultUi('checkActions')}>
       <button type="button" className="icon-control result-icon-action" aria-label={resultUi('checkAgain')} data-tooltip={resultUi('checkAgain')} onClick={()=>run('LIVE')} disabled={busy}><SealUiIcon name="refresh"/></button>
      </div>
     </div>

     <nav className="result-chapters" role="tablist" aria-label={resultUi('jumpResultSection')}>
      <button id={sectionId('tab-summary')} type="button" role="tab" aria-selected={activeResultSection==='summary'} aria-controls={sectionId('review-summary')} className={activeResultSection==='summary'?'is-current':''} onClick={()=>jumpToResultSection('summary')}>{resultUi('summary')}</button>
      <button id={sectionId('tab-original')} type="button" role="tab" aria-selected={activeResultSection==='message'} aria-controls={sectionId('original-message')} className={activeResultSection==='message'?'is-current':''} onClick={()=>jumpToResultSection('message')}>{resultUi('original')}</button>
      <button id={sectionId('tab-evidence')} type="button" role="tab" aria-selected={activeResultSection==='evidence'} aria-controls={sectionId('source-checks-panel')} className={activeResultSection==='evidence'?'is-current':''} onClick={()=>jumpToResultSection('evidence')}>{resultUi('evidence')}</button>
      <button id={sectionId('tab-resolve')} type="button" role="tab" aria-selected={activeResultSection==='next'} aria-controls={sectionId('user-actions-panel')} className={activeResultSection==='next'?'is-current':''} onClick={()=>jumpToResultSection('next')}>{resultUi('resolve')}</button>
     </nav>
    </header>

    {liveFailed&&<div className="source-retry-status" role="status"><span><strong>Live source unavailable</strong><small>The current result is preserved; claims that needed the live court page remain unverified.</small></span><button type="button" onClick={()=>run('LIVE')} disabled={busy}>{busy?'Checking…':resultUi('checkLiveSources')}</button></div>}


    {verification&&ready&&storyOpen&&createPortal(<div className={`story-overlay ${storyClosing?'is-closing':''}`} data-testid="evidence-review" role="dialog" aria-modal="true" aria-label={resultUi('sealVerificationReview')}>
     <div ref={storyPlayerRef} className={`story-player ${storyPlaying?'is-playing':'is-paused'} ${storyFocusBox?'has-story-focus':'no-story-focus'}`}>
      <div className="story-topbar">
       <span className="story-brand"><img src="/brand/seal-mark-white.svg" alt=""/><span>SEAL</span></span>
       <span className="story-chapter-label" aria-live="polite">{STORY_CHAPTERS[storyStep].label}</span>
       <button className="story-exit-button" type="button" onClick={closeStory} aria-label={resultUi('backToResult')}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 5.5 8 10l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span>Result</span>
       </button>
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
            <span>{resultUi('pastedMessage')}</span>
            <p>{cleanDisplayText(text.slice(0,900))}</p>
           </div>}
         </div>

         <div className="story-source-region">
          <div className="story-source-panel" aria-hidden={storyStep<2||storyStep>3}>
           <span>{storySourceLabel}</span>
           <strong>{storyEvidence?.title||'No supported public source available'}</strong>
           <p>{storySourceDisplay}</p>
           {storyEvidence&&<a href={storyEvidence.url} target="_blank" rel="noopener noreferrer" tabIndex={storyStep>=2&&storyStep<=3?0:-1}>{resultUi('openSource')}</a>}
          </div>
         </div>
        </div>

        <div className="story-claim-anchor" aria-hidden={storyStep<1||storyStep>2}>
         <span>{resultUi('fromMessage')}</span>
         <strong>{storyClaimDisplay||storyClaimHeading}</strong>
        </div>

        <div className="story-verdict-scrim" aria-hidden="true"/>
        <div className={`story-verdict-panel ${storyResult?.verdict==='MISMATCH'||storySignal?.kind==='SOURCE_CONFLICT'?'is-conflict':''}`} aria-hidden={storyStep!==3}>
         <strong>{storyVerdict}</strong>
        </div>

        <div className="story-action-panel" aria-hidden={storyStep!==4}>
         <span>{resultUi('safestNextStep')}</span>
         <strong>{storyFinalTitle}</strong>
         <p>{storyFinalSummary}</p>
         {verification.contact?.name&&<small>{verification.contact.name}{verification.contact.phone?` · ${verification.contact.phone}`:''}</small>}
         <div className="story-final-actions">
          {verification.contact?.website&&<a href={verification.contact.website} target="_blank" rel="noopener noreferrer" tabIndex={storyStep===4?0:-1}>{resultUi('openOfficialCourtWebsite')}</a>}
          {!verification.contact?.website&&verification.safe_action&&<a href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer" tabIndex={storyStep===4?0:-1}>{safeActionCopy?.primaryLabel||verification.safe_action.primary_label}</a>}
         </div>
        </div>
       </div>
      </div>

      <div className="story-transport" aria-label={resultUi('reviewPlaybackControls')}>
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
         aria-label={resultUi('reviewTimeline')}
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
         />)}
        </div>
       </div>

       <span className="story-timecode" aria-label={resultUi('reviewTime')}>
        <span ref={storyTimeLabelRef}>0:00</span>
        <span aria-hidden="true"> / </span>
        <span>{formatStoryTime(STORY_TOTAL)}</span>
       </span>
      </div>
     </div>
    </div>,document.body)}

    <div className="result-tabs-stage" data-testid="result-tabs-stage">
     <div className="review-hero">
     <div className="decision-pane result-screen result-screen-summary result-slide result-slide-summary" data-result-section="summary" id={sectionId('review-summary')} role="tabpanel" aria-labelledby={sectionId('tab-summary')} hidden={activeResultSection!=='summary'}>
      {!verification?
       <div className={`precheck ${error?'has-error':''}`}>
        <h1>{busy?'Checking this message':error?(file?'We couldn’t check this image.':'We couldn’t check this message.'):'Ready to check this message.'}</h1>
        <p>{busy?(status||'Working through the message…'):error?error:'Keep the original beside the result while SEAL checks independently sourced information.'}</p>
        {busy?
         <div className="check-status" role="status" aria-live="polite" aria-label={status||'Checking the message'}>
          <span>{status||'Checking the message'}</span>
          <small>{status==='Reading text from the image'?resultUi('readingLocal'):resultUi('keepTabOpen')}</small>
         </div>
         :error?
         <div className="precheck-actions">
          <button type="button" className="run-button" onClick={clear}>{file?resultUi('chooseAnotherFile'):resultUi('startAgain')}</button>
          {text.trim()&&<button type="button" className="replay-button" onClick={()=>run()}>{resultUi('tryAgain')}</button>}
         </div>
         :
         <button type="button" className="run-button" disabled={busy||!text.trim()||!hydrated} onClick={()=>run()}>{resultUi('checkMessage')}</button>}
        <p className="precheck-note">{file?resultUi('filePrivacy'):resultUi('pastePrivacy')}</p>
       </div>
       :
       <div className="decision">
        <div className="decision-overview">
         <div className="decision-copy">
        <p className="decision-status" data-testid="result-status">{translatedResult.resultStatus||resultStatusLabel}</p>
        <h1>{translatedResult.decisionTitle||(file?.sample?'This is a sample form.':conciseDecisionTitle)}</h1>
        <p className="decision-summary">{translatedResult.decisionSummary||humanDecisionSummary}</p>
        {displayLocale!=='en'&&resultTranslationState==='translated'&&<p className="translation-note">{resultUi('translatedNote')}</p>}
         </div>

         <div className="decision-summary-side">
          {primaryRoute&&<div className="decision-primary-route" data-testid="primary-next-step">
           <span>{resultUi('nextStep')}</span>
           <a href={primaryRoute.url} target="_blank" rel="noopener noreferrer">{primaryRoute.label}</a>
           <small>{resultUi('openServiceNote')}</small>
          </div>}

          {riskSummary&&!file?.sample&&instructionStatus!==matterStatus&&<div className="decision-at-a-glance" data-testid="two-risk-result">
           <div><span>{resultUi('thisMessage')}</span><strong>{translatedResult.instructionStatus||instructionStatus}</strong></div>
           <div><span>{resultUi('theCase')}</span><strong>{translatedResult.matterStatus||matterStatus}</strong></div>
          </div>}
         </div>

        </div>

        <details className="decision-details">
         <summary><span>{translatedResult.whyResult||resultUi('whyResult')}</span><SealGuideIcon/></summary>
         <div className="decision-details-body">
          {riskSummary&&<div className="decision-risks">
           <div className="decision-risk-row"><span>{resultUi('messageInstructions')}</span><div><strong>{translatedResult.riskInstructionsTitle||riskSummary.instructions.title}</strong><small>{translatedResult.riskInstructionsDetail||riskSummary.instructions.detail}</small></div></div>
           <div className="decision-risk-row"><span>{resultUi('underlyingMatter')}</span><div><strong>{translatedResult.riskMatterTitle||riskSummary.matter.title}</strong><small>{translatedResult.riskMatterDetail||riskSummary.matter.detail}</small></div></div>
          </div>}

          {directCourtUnavailable&&groundedActions.length>0?<div className="decision-claim">
           <span>{resultUi('messageAsks')}</span>
           <ul className="message-action-list">{groundedActions.map(claim=><li key={claim.id}>{cleanDisplayText(claim.action?.source_text||claim.exact_source_text||claim.value)}</li>)}</ul>
          </div>:decisionClaim&&<div className="decision-claim">
           <span>{resultUi('fromMessage')}</span>
           <p>{decisionClaimDisplay||cleanDisplayText(decisionClaim.value)}</p>
          </div>}

          <div className={`decision-evidence decision-relationship-block ${decisionRelationshipConflict?'is-conflict':''}`}>
           <span>{resultUi('publicSourcesSay')}</span>
           <strong>{translatedResult.relationship||decisionRelationship}</strong>
           {storyEvidence&&<a className="decision-source-link" href={storyEvidence.url} target="_blank" rel="noopener noreferrer">{resultUi('openPublicSource')}</a>}
           {directCheckSummary&&!storySignal&&<small className="decision-direct-check">{directCheckSummary}</small>}
          </div>

         </div>
        </details>
        <p className="result-affiliation-note">{resultUi('independentToolNote')}</p>
       </div>}
     </div>

     <div className="document-zone result-screen result-screen-original result-slide result-slide-original" data-result-section="message" id={sectionId('original-message')} role="tabpanel" aria-labelledby={sectionId('tab-original')} hidden={activeResultSection!=='message'}>
      <div className="document-heading"><span>{resultUi('originalMessage')}</span><span>{file?.kind==='pdf'?'PDF':file?'Image':'Text'}</span></div>
      <div className={`document-paper ${!file?'is-text-document':''}`}>
       {isActionDemo?
        <div className="message-card">
         <div className="message-card-head"><span>{resultUi('demoSynthetic')}</span><span>{resultUi('notRealPerson')}</span></div>
         <div className="message-sender"><span>{resultUi('unknownSender')}</span><strong>{resultUi('claimsFederalCourt')}</strong></div>
         {renderTextLines(text.split('\n').slice(1))}
         <div className="notice-end">Synthetic engineering example based on published jury-scam patterns. It does not prove real-world accuracy or demand. SEAL is not affiliated with any court.</div>
        </div>
        :isDemo?
        <div className="message-card">
         <div className="message-card-head"><span>{resultUi('fictionalNotice')}</span><span>Product demonstration only</span></div>
         {renderTextLines(text.split('\n').slice(1))}
         <div className="notice-end">This example uses fictional personal details. SEAL is not affiliated with any court.</div>
        </div>
        :!file?
        <div className="message-card pasted-message">
         <div className="message-card-head"><span>{resultUi('pastedMessage')}</span><span>{resultUi('originalText')}</span></div>
         {renderTextLines(text.split('\n'))}
        </div>
        :file.kind==='image'?
        <div className="preview-box is-expandable" role="button" tabIndex={0} aria-label={resultUi('openFullDocumentPreview')}
         onClick={event=>openDocumentPreview(event.currentTarget)}
         onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openDocumentPreview(event.currentTarget)}}}>
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

    <section className="result-slide result-slide-evidence" data-result-section="evidence" id={sectionId('source-checks-panel')} role="tabpanel" aria-labelledby={sectionId('tab-evidence')} aria-label={resultUi('evidencePanel')} hidden={activeResultSection!=='evidence'}>
     {reviewWorthWatching&&!storyOpen&&<button ref={replayButton} type="button" className="evidence-review-entry" data-testid="evidence-review-entry" onClick={replayStory} disabled={!storyArtifactReady&&file?.kind!=='pdf'}>
      <span className="evidence-review-icon" aria-hidden="true"><DesignPlayIcon/></span>
      <span><strong>{resultUi('seeHowChecked')}</strong><small>{resultUi('evidenceReviewHint')}</small></span>
     </button>}
     {ready&&verification&&<section className="source-resolution" id={sectionId('source-checks')} aria-label={resultUi('whatSealFound')}>
     <div className="section-heading evidence-heading">
      <h2>{resultUi('independentEvidence')}</h2>
     </div>

     {verification.signals&&verification.signals.length>0?
      <div className="source-signals">
       {verification.signals.map((signal,signalIndex)=>{
        const primary=signal.id===storySignal?.id;
        const evidenceTitles=signal.evidence.map(evidence=>evidence.title);
        return <article className={`source-signal ${primary?'is-primary':'is-secondary'}`} key={signal.id}>
         <p className="signal-kind">{signal.kind==='OFFICIAL_PROCESS'?resultUi('officialProcess'):signal.kind==='OFFICIAL_DIRECTORY'?resultUi('officialDirectory'):signal.kind==='SOURCE_CONFLICT'?resultUi('sourceConflict'):signal.kind==='KNOWN_PATTERN'?resultUi('knownPattern'):resultUi('officialWarning')}</p>
         <h3>{signal.id==='nh-toll-process'?resultUi('nhSignalTitle'):signal.id==='reused-case-pattern'?resultUi('reusedCaseSignalTitle'):(translatedResult['signalTitle'+signalIndex]||signal.title)}</h3>
         <p>{signal.id==='nh-toll-process'?resultUi('nhSignalSummary'):signal.id==='reused-case-pattern'?resultUi('reusedCaseSignalSummary'):(translatedResult['signalSummary'+signalIndex]||signal.summary)}</p>
         {signal.evidence.length>0&&<div className="signal-links">
          {signal.evidence.length>1&&<span className="signal-links-label">{resultUi('sources')}</span>}
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
         <p className="signal-kind">{result.verdict==='MATCH'?resultUi('officialSourceMatch'):result.verdict==='MISMATCH'?resultUi('officialSourceConflict'):resultUi('sourceEvidence')}</p>
         <h3>{translatedResult['resultLabel'+resultIndex]||claim.label}{claim.value?`: ${cleanDisplayText(claim.value)}`:''}</h3>
         <p>{translatedResult['resultExplain'+resultIndex]||result.explanation}</p>
         <div className="signal-links">
          {result.evidence.length>1&&<span className="signal-links-label">{resultUi('sources')}</span>}
          {result.evidence.map((evidence,index)=><a href={evidence.url} target="_blank" rel="noopener noreferrer" key={`${claim.id}-${index}`}>{compactEvidenceTitle(evidence.title,index,evidenceTitles)}</a>)}
         </div>
        </article>;
       })}
      </div>
      :<div className="source-signals source-evidence-empty">
       <article className="source-signal is-primary">
        <p className="signal-kind">{resultUi('independentCheck')}</p>
        <h3>{directCourtUnavailable?(translatedResult.emptyEvidenceTitleDirect||'This court is not in SEAL’s direct-check network yet.'):(translatedResult.emptyEvidenceTitle||'No independent source evidence was available for this result.')}</h3>
        <p>{directCourtUnavailable?(translatedResult.emptyEvidenceCopyDirect||'SEAL can still show exactly what the message asks you to do, but it will not guess whether the case or sender is genuine.'):(translatedResult.emptyEvidenceCopy||'The inspection below shows what SEAL could and could not establish from its supported sources.')}</p>
       </article>
      </div>}

     <p className="resolution-disclaimer">{translatedResult.resolutionDisclaimer||(curatedSignal?'This finding is about this published example only. It does not label other messages.':'These sources help with the check, but they still cannot tell us who sent the message.')}</p>
    </section>}
     <details className="record-disclosure" aria-label={resultUi('evidenceRecord')}>
      <summary><span>{resultUi('evidenceRecord')}</span><small>{resultUi('evidenceRecordHint')}</small><SealGuideIcon/></summary>
      <div className="record-disclosure-body">
       {ready&&verification&&<section className="check-metadata-section" aria-label={translatedResult.checkContext||'Check context'}>
     <div className="check-record-details" data-testid="check-details">
      <div className="record-subheading"><span>{translatedResult.checkContext||'Check context'}</span><small>{translatedResult.checkContextHint||'Provenance for this result'}</small></div>
      <dl>
       <div><dt>{resultUi('input')}</dt><dd>{checkInputLabel}</dd></div>
       <div><dt>{resultUi('documentLanguage')}</dt><dd>{documentLanguage?.label||(translatedResult.notResolved||'Not resolved')}</dd></div>
       <div><dt>{resultUi('jurisdiction')}</dt><dd>{jurisdiction||(translatedResult.notResolved||'Not resolved')}</dd></div>
       <div><dt>{resultUi('sourceMode')}</dt><dd>{mode==='LIVE'?(translatedResult.livePublicSources||'Live public sources'):(translatedResult.sourceSnapshot||'Source snapshot')}</dd></div>
       <div><dt>{resultUi('sourcesAttached')}</dt><dd>{String(checkSourceCount)}</dd></div>
       {checkDateLabel&&<div><dt>{translatedResult.checkedLabel||'Checked'}</dt><dd>{checkDateLabel}</dd></div>}
      </dl>
      <p>{translatedResult.recordPrivacy||'Original files stay in this browser. Source quotations remain attached to the check so the result can be inspected later.'}</p>
     </div>
    </section>}
       {ready&&!directCourtUnavailable&&<section className="record-section" id={sectionId('checked-details')}>
     <div className="section-heading record-heading">
      <h2>{translatedResult.whatWasChecked||'What was checked'}</h2>
      <p>{resultUi('inspectEachDetail')}</p>
     </div>

     <div className="record-layout">
      <div className="claim-index">
       <div className="index-title">
        <span>Checked details</span>
        <button type="button" className="mobile-index-toggle" onClick={()=>setShowIndex(value=>!value)}>{showIndex?(translatedResult.hideList||'Hide list'):(translatedResult.showList||'Show list')}</button>
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
       <div className="from-label">{translatedResult.inMessage||'In the message'}</div>
       <div className="claim-value">{cleanDisplayText(current.value)}</div>
       {cleanDisplayText(current.exact_source_text)!==cleanDisplayText(current.value)&&<p className="exact-source">“{cleanDisplayText(current.exact_source_text)}”</p>}
       <div className="focus-rule"/>
       <div className="source-label">{currentResult.evidence.length?(translatedResult.officialSourceEvidence||'Official source evidence'):(translatedResult.whatCanEstablish||'What we can establish')}</div>
       {currentResult.evidence.length?<>
        {(currentResult.explanation==='Official sources currently disagree.'?currentResult.evidence:currentResult.evidence.slice(0,1)).map((evidence,index)=><div className="evidence-excerpt" key={`${evidence.url}-${index}`}>
         <div className="source-name">{evidence.title}</div>
         <div className="source-quote">“{evidence.excerpt}”</div>
         <a className="official-link" href={evidence.url} target="_blank" rel="noopener noreferrer">{resultUi('openOfficialSource')}</a>
         <div className="source-timestamp">{evidence.source_mode==='LIVE'?(translatedResult.liveOfficialSource||'Live official source'):(translatedResult.sourceSnapshot||'Source snapshot')} · {new Date(evidence.checked_at).toLocaleDateString(displayLocale,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div>
        </div>)}
        {currentResult.evidence.length>1&&currentResult.explanation!=='Official sources currently disagree.'&&<details className="additional-sources">
         <summary><span>{currentResult.evidence.length-1} {currentResult.evidence.length>2?(translatedResult.moreSourceExcerpts||'more source excerpts'):(translatedResult.moreSourceExcerpt||'more source excerpt')}</span><SealGuideIcon/></summary>
         {currentResult.evidence.slice(1).map((evidence,index)=><div key={index}>
          <div>{evidence.title}</div>
          <blockquote>{evidence.excerpt}</blockquote>
          <a href={evidence.url} target="_blank" rel="noopener noreferrer">{resultUi('openSource')}</a>
          <div className="source-timestamp">{evidence.source_mode} · {new Date(evidence.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div>
         </div>)}
        </details>}
       </>:<div className="no-source">{currentResult.explanation}</div>}
       <div className="why-line">{currentResult.evidence.length?currentResult.explanation:(translatedResult.notWrongFallback||'This does not mean the detail is wrong.')}</div>
      </div>}
     </div>

     <details className="technical-record" open={technicalOpen} onToggle={event=>setTechnicalOpen(event.currentTarget.open)}>
      <summary><span>{resultUi('technicalRecord')}</span><SealGuideIcon/></summary>
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
      {technicalEvidence.map((evidence,index)=><p key={evidence.url||index}>{evidence.title} · {evidence.source_mode} · {evidence.checked_at} · <a href={evidence.url} target="_blank" rel="noopener noreferrer">{translatedResult.originalSource||'Original source'}</a></p>)}
     </details>

     {isDemo&&<button className="replay-button" onClick={()=>run('SNAPSHOT')}>{resultUi('replayCheck')}</button>}
    </section>}
      </div>
     </details>
    </section>

    <section className="result-slide result-slide-resolve" data-result-section="next" id={sectionId('user-actions-panel')} role="tabpanel" aria-labelledby={sectionId('tab-resolve')} aria-label={resultUi('resolvePanel')} hidden={activeResultSection!=='next'}>
     {ready&&verification&&<div className="resolve-primary" data-testid="resolve-primary">
     {verification&&!verification.safe_action&&decisionClaim?.action&&!verification.contact&&<div className="unsupported-next-step" id={sectionId('next-step')}>
      <span>{translatedResult.unsupportedNextEyebrow||'What to do next'}</span>
      <h2>{translatedResult.unsupportedNextTitle||'Check this with the court directly.'}</h2>
      {messageDetails.length>0||scheduleQuote||noPaymentQuote?<dl className="message-detail-list">{messageDetails.map(claim=><div key={claim.id}><dt>{claim.type==='location'?(translatedResult.locationNamed||'Location named'):claim.label}</dt><dd>{cleanDisplayText(claim.value)}</dd></div>)}{scheduleQuote&&<div><dt>{resultUi('scheduleStated')}</dt><dd>{cleanDisplayText(scheduleQuote)}</dd></div>}{noPaymentQuote&&<div><dt>{resultUi('paymentStatement')}</dt><dd>{cleanDisplayText(noPaymentQuote)}</dd></div>}</dl>:<p>{resultUi('noCourtDetails')}</p>}
      <p>{translatedResult.detailsUnconfirmed||'Those details come from the message itself. They do not confirm that the case exists or that the sender is connected to the court.'}</p>
      <p>{translatedResult.avoidMessageRoutes||'Do not use a payment link, QR code, phone number, or reply address from the message until you reach the court independently.'}</p>
      {officialDirectory&&<div className="official-directory-route">
       <span>{translatedResult.startHere||'Start here'}</span>
       <a href={officialDirectory.url} target="_blank" rel="noopener noreferrer">{officialDirectory.label}</a>
       <p>{officialDirectory.note}</p>
      </div>}
     </div>}
     {verification?.safe_action&&<div className="safe-route" id={sectionId('next-step')}>
      <div>
       <h2>{safeActionCopy?.title||verification.safe_action.title}</h2>
       <p>{safeActionCopy?.summary||verification.safe_action.summary}</p>
      </div>
      <div>
       <ol className="safe-steps">{(safeActionCopy?.steps||verification.safe_action.steps).map((step,index)=><li key={index}>{step}</li>)}</ol>
       <div className="safe-route-actions">
        {verification.contact?.website&&<a className="safe-primary" href={verification.contact.website} target="_blank" rel="noopener noreferrer">{resultUi('openOfficialCourtWebsite')}</a>}
        {verification.safe_action.primary_url&&verification.safe_action.primary_url!==verification.contact?.website&&<a className="safe-source-link" href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{translatedResult.safePrimary||verification.safe_action.primary_label}</a>}
       </div>
      </div>
     </div>}

     </div>}
     {ready&&verification&&caseReality&&<section className="user-actions" id={sectionId('user-actions')} aria-label="What to do next">
     <div className="user-actions-heading"><h2>{resultUi('whatToDoNext')}</h2><p>{resultUi('nextHelpCopy')}</p></div>
     <div className="journey-block case-reality-block" data-testid="case-reality-check">
      <div className="journey-label">{resultUi('theCase')}</div>
      <div className="journey-content">
       <h3>{caseRealityCopy?.title||caseReality.title}</h3><p>{caseRealityCopy?.detail||caseReality.detail}</p>
       <dl className="case-reality-facts"><div><dt>{resultUi('courtClaimed')}</dt><dd>{caseReality.court}</dd></div><div><dt>{resultUi('caseReference')}</dt><dd>{caseReality.reference||(translatedResult.notVerified||'Not verified')}</dd></div></dl>
       {verification.contact?.website?<a className="journey-link" href={verification.contact.website} target="_blank" rel="noopener noreferrer">{resultUi('openCourtWebsiteIndependently')}</a>:officialLookup&&<a className="journey-link" href={officialLookup.url} target="_blank" rel="noopener noreferrer">{officialLookup.label}</a>}
       {officialLookup&&<small className="journey-note">{officialLookup.note}</small>}
      </div>
     </div>
     {obligations.length>0&&<div className="journey-block obligation-block" data-testid="obligation-map">
      <div className="journey-label">{resultUi('whatMessageAsks')}</div>
      <div className="journey-content"><div className="obligation-list">{obligations.map((item,index)=><div className="obligation-row" key={item.id}><div><strong>{cleanDisplayText(item.text)}</strong>{item.deadline&&<small>{translatedResult.timeDateStated||'Time/date stated'}: {item.deadline}</small>}</div><span className={item.status==='MISMATCH'?'is-conflict':item.status==='MATCH'?'is-match':''}>{item.status==='MATCH'?resultUi('obligationMatches'):item.status==='MISMATCH'?resultUi('obligationConflicts'):resultUi('obligationMessageOnly')}</span></div>)}</div><p className="journey-note">{resultUi('obligationDatesNote')}</p></div>
     </div>}
     <details className="journey-details" data-testid="plain-language-explanation">
      <summary><span>{resultUi('explainNotice')}</span><small>{resultUi('plainLanguageTranslation')}</small><SealGuideIcon/></summary>
      <div className="journey-details-body">
       <div className="explanation-controls"><small>{translatedResult.explanationLanguagePrefix||'Explanation follows display language'}: {DISPLAY_LANGUAGES[displayLocale]} · {translatedResult.detectedDocumentLanguage||'detected document language'}: {documentLanguage?.label||(translatedResult.unknownLanguage||'Unknown')}{documentLanguage?.confidence==='low'?` · ${translatedResult.lowConfidence||'low confidence'}`:''}</small></div>
       {displayedExplanation&&<div className="plain-explanation" aria-live="polite"><h3>{displayedExplanation.title}</h3><p>{displayedExplanation.summary}</p></div>}
       <p className="journey-note">{translatedResult.explanationDisclaimer||'This explains what SEAL extracted and verified. It is not legal advice.'}</p>
      </div>
     </details>
     <details className="journey-details" data-testid="resolution-help">
      <summary><span>{resultUi('getHelpResolving')}</span><small>{resultUi('courtRecoveryLegalAid')}</small><SealGuideIcon/></summary>
      <div className="journey-details-body support-paths">
       <div className="support-path"><strong>{translatedResult.supportHaventTitle||'I haven’t acted yet'}</strong><p>{translatedResult.supportHaventCopy||'Use the independently sourced court route above before calling, paying, scanning, replying, or appearing because of this message.'}</p></div>
       <div className="support-path"><strong>{translatedResult.supportPaidTitle||'I already paid'}</strong><p>{translatedResult.supportPaidCopy||'Contact your bank or payment provider through its official app, card, or website and report the transaction immediately.'}</p>{justiceSupport?.recovery&&<a className="journey-link" href={justiceSupport.recovery.url} target="_blank" rel="noopener noreferrer">{justiceSupport.recovery.label}</a>}</div>
       <div className="support-path"><strong>{translatedResult.supportSharedTitle||'I shared personal information'}</strong><p>{translatedResult.supportSharedCopy||'Do not send anything else through the message. Use an official recovery service if one is available for this jurisdiction.'}</p>{justiceSupport?.recovery&&<a className="journey-link" href={justiceSupport.recovery.url} target="_blank" rel="noopener noreferrer">{justiceSupport.recovery.label}</a>}</div>
       <div className="support-path"><strong>{translatedResult.supportLegalTitle||'I need legal help'}</strong><p>{translatedResult.supportLegalCopy||'Use an official legal-aid service to understand your options for a real legal matter.'}</p>{justiceSupport?.legalAid?<a className="journey-link" href={justiceSupport.legalAid.url} target="_blank" rel="noopener noreferrer">{justiceSupport.legalAid.label}</a>:<span className="support-unavailable">{translatedResult.noLegalAid||'No reviewed legal-aid directory is linked for this jurisdiction yet.'}</span>}</div>
       <div className="handoff-pack" data-testid="handoff-pack">
        <span>{translatedResult.handoffEyebrow||'Take this with you'}</span>
        <strong>{translatedResult.handoffTitle||'Ask the court without relying on the message'}</strong>
        <p>{translatedResult.handoffCopy||'Use this wording with an independently sourced court channel. It carries the case reference and the exact instructions SEAL recovered without treating them as genuine.'}</p>
        <blockquote>{translatedResult.courtQuestionScript||courtQuestionScript}</blockquote>
        <div className="handoff-actions" aria-label={resultUi('verificationRecordActions')}>
         <button type="button" className="icon-control" aria-label={translatedResult.copyQuestion||'Copy what to ask'} title={translatedResult.copyQuestion||'Copy what to ask'} data-tooltip={translatedResult.copyQuestion||'Copy what to ask'} onClick={()=>void copyCourtQuestion()}><SealUiIcon name="message"/></button>
         <button type="button" className="icon-control" aria-label={translatedResult.copyRecord||'Copy verification record'} title={translatedResult.copyRecord||'Copy verification record'} data-tooltip={translatedResult.copyRecord||'Copy verification record'} onClick={()=>void copyHandoff()}><SealUiIcon name="copy"/></button>
         <button type="button" className="icon-control" aria-label={translatedResult.saveRecord||'Save verification record'} title={translatedResult.saveRecord||'Save verification record'} data-tooltip={translatedResult.saveRecord||'Save verification record'} onClick={saveHandoff}><SealUiIcon name="download"/></button>
        </div>
        <small>{translatedResult.handoffNote||'The saved record includes verification states, source links, and source-check timestamps. It does not include a legal opinion.'}</small>
       </div>
      </div>
     </details>
    </section>}
     {ready&&verification?.contact&&<section className="contact-section" id={verification.safe_action?undefined:sectionId('next-step')} aria-label={translatedResult.courtContactHeading||'Court contact from an official source'}>
     <div className="court-contact">
      <div>
       <h3>{translatedResult.courtContactHeading||'Court contact from an official source'}</h3>
       <p>{verification.contact.name||(verification.resolver_id==='connecticut'?'District of Connecticut Jury Office':(translatedResult.courtContactFallback||'Court contact'))}</p>
      </div>
      <div>
       <a className="contact-phone" href={`tel:${verification.contact.phone}`}>{verification.contact.phone}</a>
       <div className="contact-actions">
        <a href={verification.contact.website} target="_blank" rel="noopener noreferrer">{resultUi('openCourtWebsite')}</a>
        <button onClick={()=>run('LIVE')} disabled={busy}>{resultUi('checkLiveSources')}</button>
       </div>
       <p className="contact-source">{translatedResult.contactSourcePrefix||'This contact came from the court source, not from the message.'} {verification.contact.source.source_mode==='SNAPSHOT'?(translatedResult.snapshotChecked||'Source snapshot checked')+' '+new Date(verification.contact.source.checked_at).toLocaleDateString(displayLocale,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.':(translatedResult.liveChecked||'Live source checked')+' '+new Date(verification.contact.source.checked_at).toLocaleDateString(displayLocale,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.'}</p>
      </div>
     </div>
    </section>}
    </section>
    </div>
   </section>}

  {documentPreviewOpen&&documentPreviewAsset&&createPortal(<div className={`document-preview-layer ${documentPreviewClosing?'is-closing':''}`} data-testid="document-preview" role="dialog" aria-modal="true" aria-label={resultUi('fullDocumentPreview')}>
   <button className="document-preview-backdrop" type="button" aria-label={resultUi('closeDocumentPreview')} onClick={closeDocumentPreview}/>
   <div ref={documentPreviewPanelRef} className={`document-preview-panel is-${documentPreviewAsset.kind}`}>
    <header className="document-preview-topbar">
     <div><span>Document</span><strong>{documentPreviewAsset.name}</strong></div>
     <button type="button" className="document-preview-close" aria-label={resultUi('closeDocumentPreview')} onClick={closeDocumentPreview}><SealUiIcon name="close"/></button>
    </header>
    <div className="document-preview-stage">
     {documentPreviewAsset.kind==='image'
      ?<img src={documentPreviewAsset.url} alt="Full uploaded court message"/>
      :<StoryPdfPage url={documentPreviewAsset.url}/>}
    </div>
   </div>
  </div>,document.body)}

  <input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>{
   const armed=filePickerArmed.current;
   filePickerArmed.current=false;
   const next=event.target.files?.[0];
   event.target.value='';
   if(armed&&next)upload(next);
  }}/>

 </main>;
}

const WORKSPACE_LIST_KEY='seal:workspace-list:v1';
const ONBOARDING_KEY='seal:onboarding:v2';
const DISPLAY_LOCALE_KEY='seal:display-locale:v1';
const checkRoute=(id:string)=>`/check/${encodeURIComponent(id==='primary'?'primary':id.replace(/^check-/,''))}`;
const isDisposableBlankWorkspace=(item:WorkspaceMeta)=>item.status==='idle'
 &&/^new check(?: \d+)?$/i.test(cleanDisplayText(item.title||'')||'New check')
 &&!cleanDisplayText(item.preview||'')
 &&!item.language
 &&!item.jurisdiction;

const workspaceIdFromPath=(pathname:string)=>{
 const match=pathname.match(/^\/check\/([^/?#]+)/);
 if(!match)return '';
 try{
  const slug=decodeURIComponent(match[1]);
  return slug==='primary'?'primary':slug.startsWith('check-')?slug:`check-${slug}`;
 }catch{return ''}
};

export default function SealApp({initialDemo=false,initialText='',initialRun=false,initialWorkspaceId,suppressOnboarding=false,deferIdleOcr=false}:{initialDemo?:boolean;initialText?:string;initialRun?:boolean;initialWorkspaceId?:string;suppressOnboarding?:boolean;deferIdleOcr?:boolean}){
 const [workspaces,setWorkspaces]=useState<WorkspaceMeta[]>([{id:'primary',title:'New check',status:'idle'}]);
 const [activeWorkspace,setActiveWorkspace]=useState('primary');
 const [registryReady,setRegistryReady]=useState(false);
 const [onboardingOpen,setOnboardingOpen]=useState(false);
 const [shellLocale]=useStoredUiLocale();
 const shellUi=useUiText(shellLocale);
 const [onboardingStep,setOnboardingStep]=useState(0);
 const [workspaceTransition,setWorkspaceTransition]=useState<{from:string;to:string;direction:'forward'|'backward';snapshot:WorkspaceMeta[]}|null>(null);
 const workspaceTransitionTimer=useRef<number|null>(null);
 const onboardingTouchStart=useRef<number|null>(null);

 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   try{
    const raw=window.sessionStorage.getItem(WORKSPACE_LIST_KEY);
    if(raw){
     const parsed=JSON.parse(raw) as {active?:string;items?:WorkspaceMeta[]};
     const rawItems=Array.isArray(parsed.items)?parsed.items.filter(item=>item&&typeof item.id==='string').slice(0,8):[];
     const deduped=rawItems.filter((item,index,all)=>all.findIndex(candidate=>candidate.id===item.id)===index);
     const requestedMissing=!!initialWorkspaceId&&!deduped.some(item=>item.id===initialWorkspaceId);
     const withRequested=requestedMissing
      ?[...deduped.slice(0,7),{id:initialWorkspaceId!,title:'New check',status:'idle' as WorkspaceRunStatus}]
      :deduped;
     const preservedActive=initialWorkspaceId||(withRequested.some(item=>item.id===parsed.active)?parsed.active:undefined);
     const cleaned=withRequested.filter(item=>item.id===preservedActive||!isDisposableBlankWorkspace(item));
     const items=(cleaned.length?cleaned:(preservedActive?withRequested.filter(item=>item.id===preservedActive):withRequested.slice(0,1))).slice(0,8);
     if(items.length){
      setWorkspaces(items.map(item=>({...item,status:(item.status==='reading'||item.status==='verifying'?'idle':item.status) as WorkspaceRunStatus})));
      const nextActive=(preservedActive&&items.some(item=>item.id===preservedActive)?preservedActive:items[0].id);
      setActiveWorkspace(nextActive);
      if(initialWorkspaceId&&initialWorkspaceId!==nextActive){
       window.history.replaceState({workspaceId:nextActive},'',checkRoute(nextActive));
      }
     }
    }else if(initialWorkspaceId){
     setWorkspaces([{id:initialWorkspaceId,title:'New check',status:'idle' as WorkspaceRunStatus}]);
     setActiveWorkspace(initialWorkspaceId);
    }
   }catch{}
   setRegistryReady(true);
  },0);
  return()=>window.clearTimeout(timer);
 },[initialWorkspaceId]);

 useEffect(()=>{
  if(!registryReady)return;
  try{window.sessionStorage.setItem(WORKSPACE_LIST_KEY,JSON.stringify({active:activeWorkspace,items:workspaces}))}catch{}
 },[registryReady,activeWorkspace,workspaces]);

 useEffect(()=>{
  if(!registryReady)return;
  const onPopState=()=>{
   const routedId=workspaceIdFromPath(window.location.pathname);
   if(!routedId)return;
   setWorkspaces(items=>{
    if(!items.some(item=>item.id===routedId))return items;
    setActiveWorkspace(routedId);
    return items;
   });
   window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
  };
  window.addEventListener('popstate',onPopState);
  return()=>window.removeEventListener('popstate',onPopState);
 },[registryReady]);

 useEffect(()=>{
  if(!registryReady||initialDemo||initialText||initialRun||suppressOnboarding)return;
  const timer=window.setTimeout(()=>{
   try{
    if(!window.localStorage.getItem(ONBOARDING_KEY)){
     setOnboardingStep(0);
     setOnboardingOpen(true);
    }
   }catch{}
  },0);
  return()=>window.clearTimeout(timer);
 },[registryReady,initialDemo,initialText,initialRun,suppressOnboarding]);

 useEffect(()=>()=>{if(workspaceTransitionTimer.current!==null)window.clearTimeout(workspaceTransitionTimer.current)},[]);

 useEffect(()=>{
  if(!onboardingOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous};
 },[onboardingOpen]);

 const dismissOnboarding=useCallback((focusEntry=false)=>{
  try{window.localStorage.setItem(ONBOARDING_KEY,'seen')}catch{}
  setOnboardingOpen(false);
  if(focusEntry)window.requestAnimationFrame(()=>{
   const button=document.querySelector<HTMLButtonElement>('.seal-workspace-instance[aria-hidden="false"] [data-testid="upload-file"]');
   button?.scrollIntoView({block:'center',behavior:'smooth'});
   window.setTimeout(()=>button?.focus(),260);
  });
 },[]);

 const advanceOnboarding=useCallback(()=>{
  setOnboardingStep(step=>step>=2?step:step+1);
 },[]);
 const retreatOnboarding=useCallback(()=>{
  setOnboardingStep(step=>step<=0?0:step-1);
 },[]);
 const finishOnboarding=useCallback(()=>{
  dismissOnboarding(true);
 },[dismissOnboarding]);

 const animateWorkspaceTo=useCallback((id:string)=>{
  if(id===activeWorkspace)return;
  const mobile=window.matchMedia('(max-width: 900px)').matches;
  if(mobile){
   const fromIndex=workspaces.findIndex(item=>item.id===activeWorkspace);
   const toIndex=workspaces.findIndex(item=>item.id===id);
   const direction: 'forward'|'backward'=toIndex>=fromIndex?'forward':'backward';
   if(workspaceTransitionTimer.current!==null)window.clearTimeout(workspaceTransitionTimer.current);
   setWorkspaceTransition({from:activeWorkspace,to:id,direction,snapshot:workspaces.map(item=>({...item}))});
   setActiveWorkspace(id);
   workspaceTransitionTimer.current=window.setTimeout(()=>{
    setWorkspaceTransition(null);
    workspaceTransitionTimer.current=null;
   },720);
  }else{
   setWorkspaceTransition(null);
   setActiveWorkspace(id);
  }
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
 },[activeWorkspace,workspaces]);

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
  const mobile=window.matchMedia('(max-width: 900px)').matches;
  setWorkspaces(items=>{
   const number=items.filter(item=>/^New check(?: \\d+)?$/.test(item.title)).length+1;
   const title=number===1?'New check':`New check ${number}`;
   return [...items,{id,title,status:'idle' as WorkspaceRunStatus}].slice(-8);
  });
  if(mobile){
   if(workspaceTransitionTimer.current!==null)window.clearTimeout(workspaceTransitionTimer.current);
   setWorkspaceTransition({from:activeWorkspace,to:id,direction:'forward',snapshot:workspaces.map(item=>({...item}))});
   workspaceTransitionTimer.current=window.setTimeout(()=>{
    setWorkspaceTransition(null);
    workspaceTransitionTimer.current=null;
   },720);
  }else{
   setWorkspaceTransition(null);
  }
  setActiveWorkspace(id);
  window.history.pushState({workspaceId:id},'',checkRoute(id));
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
 },[activeWorkspace,workspaces]);

 const selectWorkspace=useCallback((id:string)=>{
  if(id===activeWorkspace)return;
  animateWorkspaceTo(id);
  window.history.pushState({workspaceId:id},'',checkRoute(id));
 },[activeWorkspace,animateWorkspaceTo]);

 const deleteWorkspace=useCallback((id:string)=>{
  const index=workspaces.findIndex(item=>item.id===id);
  if(index<0)return;
  clearResultSession(id);
  const remaining=workspaces.filter(item=>item.id!==id);
  if(!remaining.length){
   const replacementId=`check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
   setWorkspaces([{id:replacementId,title:'New check',status:'idle' as WorkspaceRunStatus}]);
   setActiveWorkspace(replacementId);
   window.history.replaceState({workspaceId:replacementId},'',checkRoute(replacementId));
  }else{
   setWorkspaces(remaining);
   if(activeWorkspace===id){
    const next=remaining[Math.min(index,remaining.length-1)];
    setActiveWorkspace(next.id);
    window.history.replaceState({workspaceId:next.id},'',checkRoute(next.id));
   }
  }
  toast.success('Check removed');
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
 },[workspaces,activeWorkspace]);

 return <>
  {onboardingOpen&&<div
   className="first-run-layer"
   data-testid="first-run-onboarding"
   data-step={onboardingStep}
   onTouchStart={event=>{onboardingTouchStart.current=event.changedTouches[0]?.clientX??null}}
   onTouchEnd={event=>{
    const start=onboardingTouchStart.current;
    onboardingTouchStart.current=null;
    const end=event.changedTouches[0]?.clientX;
    if(start==null||end==null)return;
    const delta=end-start;
    if(delta<-48)advanceOnboarding();
    if(delta>48)retreatOnboarding();
   }}
  >
   <div className="onboarding-shell" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
    <header className="onboarding-topbar">
     <div className="onboarding-brand"><img src="/brand/seal-mark-black.svg" alt=""/><span>SEAL</span></div>
     <span className="onboarding-step-count" aria-hidden="true">{onboardingStep+1} / 3</span>
     {onboardingStep<2
      ?<button type="button" className="onboarding-skip" onClick={()=>dismissOnboarding(false)}>{shellUi('skip')}</button>
      :<span className="onboarding-skip-spacer" aria-hidden="true"/>}
    </header>

    <div className="onboarding-progress" aria-label={`Step ${onboardingStep+1} of 3`}>
     {[0,1,2].map(step=><span className={step===onboardingStep?'is-active':step<onboardingStep?'is-complete':''} key={step}/>)}
    </div>

    <div className="onboarding-stage" key={onboardingStep}>
     {onboardingStep===0&&<>
      <div className="onboarding-visual onboarding-visual-input" aria-hidden="true">
       <div className="onboarding-upload-card">
        <div className="onboarding-file-sheet">
         <span/>
         <span/>
         <span/>
         <strong>{shellUi('courtNotice')}</strong>
         <small>{shellUi('paymentRequestedToday')}</small>
        </div>
        <div className="onboarding-input-dock">
         <div><span>{shellUi('screenshot')}</span><small>PNG · JPG</small></div>
         <div><span>{shellUi('document')}</span><small>PDF</small></div>
         <div><span>{shellUi('pasteText')}</span><small>{shellUi('message')}</small></div>
        </div>
       </div>
      </div>
      <div className="onboarding-copy">
       <span className="onboarding-kicker">{shellUi('startWithMessage')}</span>
       <h1 id="onboarding-title">{shellUi('bringNotice')}</h1>
       <p>{shellUi('onboardingUploadCopy')}</p>
      </div>
     </>}

     {onboardingStep===1&&<>
      <div className="onboarding-visual onboarding-visual-evidence" aria-hidden="true">
       <div className="onboarding-claim-card">
        <span>{shellUi('messageSays')}</span>
        <strong>{shellUi('payTodayExample')}</strong>
        <small>{shellUi('instructionFound')}</small>
       </div>
       <div className="onboarding-source-card">
        <div className="onboarding-source-head"><span>{shellUi('publicSource')}</span><em>{shellUi('official')}</em></div>
        <strong>{shellUi('courtsNoDemand')}</strong>
        <small>{shellUi('independentGuidance')}</small>
       </div>
       <div className="onboarding-match-line"><span>{shellUi('comparedIndependently')}</span></div>
      </div>
      <div className="onboarding-copy">
       <span className="onboarding-kicker">{shellUi('independentEvidence')}</span>
       <h1 id="onboarding-title">{shellUi('realCourtNameNotEnough')}</h1>
       <p>{shellUi('onboardingEvidenceCopy')}</p>
      </div>
     </>}

     {onboardingStep===2&&<>
      <div className="onboarding-visual onboarding-visual-result" aria-hidden="true">
       <div className="onboarding-result-card">
        <span>{shellUi('resultTitle')}</span>
        <h2>Check it independently before you pay.</h2>
        <p>We found an official process, but not enough to confirm this notice or the case.</p>
        <div className="onboarding-result-action">
         <small>{shellUi('nextStep')}</small>
         <strong>{shellUi('openOfficialCourtService')}</strong>
        </div>
       </div>
      </div>
      <div className="onboarding-copy">
       <span className="onboarding-kicker">{shellUi('leaveNextStep')}</span>
       <h1 id="onboarding-title">{shellUi('knowNext')}</h1>
       <p>{shellUi('onboardingResultCopy')}</p>
      </div>
     </>}
    </div>

    <footer className="onboarding-controls">
     <button type="button" className="onboarding-back" onClick={retreatOnboarding} disabled={onboardingStep===0}>{shellUi('back')}</button>
     {onboardingStep<2
      ?<button type="button" className="onboarding-next" onClick={advanceOnboarding}>{shellUi('next')}</button>
      :<div className="onboarding-final-actions">
        <Link href="/browse" onClick={()=>dismissOnboarding(false)}>{shellUi('browseExamples')}</Link>
        <button type="button" className="onboarding-next" onClick={finishOnboarding}>{shellUi('startCheck')}</button>
       </div>}
    </footer>
   </div>
  </div>}
  <div className={`seal-workspace-stack ${workspaces.length>1?'has-multiple':''}`} data-workspace-count={workspaces.length}>
   {workspaces.length>1&&<div className="workspace-page-edges" aria-hidden="true"><span/><span/></div>}
   {registryReady&&workspaces.map((workspace,index)=>{
    const active=workspace.id===activeWorkspace;
    const leaving=workspaceTransition?.from===workspace.id;
    const entering=workspaceTransition?.to===workspace.id;
    const transitionClass=leaving
     ?'is-leaving'
     :entering
      ?workspaceTransition?.direction==='backward'?'is-entering-backward':'is-entering-forward'
      :'';
    const visible=active||leaving;
    return <div
     className={`seal-workspace-instance ${active?'is-active':''} ${transitionClass}`}
     data-workspace-id={workspace.id}
     key={workspace.id}
     aria-hidden={active?'false':'true'}
     hidden={!visible}
    >
     <SealWorkspace
      initialDemo={index===0?initialDemo:false}
      initialText={index===0?initialText:''}
      initialRun={index===0?initialRun:false}
      deferIdleOcr={deferIdleOcr}
      workspaceId={workspace.id}
      workspaceActive={active}
      workspaces={leaving&&workspaceTransition?.snapshot?workspaceTransition.snapshot:workspaces}
      onNewWorkspace={createWorkspace}
      onSelectWorkspace={selectWorkspace}
      onDeleteWorkspace={deleteWorkspace}
      onWorkspaceMeta={updateWorkspace}
     />
    </div>;
   })}
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
