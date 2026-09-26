'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import PDFPreview from './pdf-preview';
import {fixtures,type FixtureKey} from '@/lib/fixtures';
import {fallbackExtract,claimsFromExtraction,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '@/lib/extract';
import {readInBrowser,warmOcr,type BrowserDocument} from '@/lib/browser-file';
import type {Claim,Extraction,Result,Verification} from '@/lib/types';
import './workspace.css';

type Mode='SNAPSHOT'|'LIVE';

const verdictLabel=(value:Result['verdict'])=>value==='MATCH'?'Matches':value==='MISMATCH'?'Conflicts':'Unverified';
const stateWord=verdictLabel;
const cleanDisplayText=(value:string)=>value
 .replace(/\[\s*=\s*\]/g,' ')
 .replace(/(?:^|\s)[*•]+\s*/g,' ')
 .replace(/\s*\/\s*/g,' · ')
 .replace(/\s+,/g,',')
 .replace(/,\s*,+/g,', ')
 .replace(/\s+/g,' ')
 .replace(/^(?:[·|:;,.\-–—]\s*)+|(?:\s*[·|:;,.\-–—])+$/g,'')
 .trim();

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

function decisionCopy(verification:Verification|null){
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
 const [storyOpen,setStoryOpen]=useState(false);
 const [storyStep,setStoryStep]=useState(0);
 const [storyPlaying,setStoryPlaying]=useState(true);
 const [storyClosing,setStoryClosing]=useState(false);
 const storyKey=useRef('');
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
 const storySignal=verification?.signals?.find(signal=>signal.id==='traffic-qr-warning')
  ||verification?.signals?.find(signal=>signal.kind==='SOURCE_CONFLICT');
 const signalAction=storySignal?.id==='traffic-qr-warning'
  ?requestedActions.find(claim=>claim.action?.kind==='pay')
   ||requestedActions.find(claim=>claim.action?.verb==='scan')
   ||requestedActions.find(claim=>claim.action?.kind==='appear')
  :undefined;
 const storyClaim=verification
  ?signalAction
   ||claims.find(claim=>Boolean(claim.action)&&resultById.get(claim.id)?.verdict==='MISMATCH'&&Boolean(resultById.get(claim.id)?.evidence?.length))
   ||claims.find(claim=>Boolean(claim.action)&&Boolean(resultById.get(claim.id)?.evidence?.length))
   ||claims.find(claim=>resultById.get(claim.id)?.verdict==='MISMATCH'&&Boolean(resultById.get(claim.id)?.evidence?.length))
   ||claims.find(claim=>Boolean(resultById.get(claim.id)?.evidence?.length))
   ||claims.find(claim=>resultById.get(claim.id)?.verdict==='MISMATCH')
   ||primaryAction
   ||claims[0]
  :undefined;
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
 const storyFocusBox=storyClaim?.source_bbox
  &&storyClaim.page===1
  &&storyClaim.source_bbox.width>=.015
  &&storyClaim.source_bbox.width<=.72
  &&storyClaim.source_bbox.height>=.014
  &&storyClaim.source_bbox.height<=.18
   ?storyClaim.source_bbox
   :undefined;
 const storySourceCopy=storySignal?.summary||storyEvidence?.excerpt||storyResult?.explanation||'SEAL could not establish this detail from a supported source.';
 const storyVerdict=storySignal?.id==='traffic-qr-warning'
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
   :verification?.safe_action?.title||'Verify independently before you respond.';
 const storyFinalSummary=storySignal?.id==='traffic-qr-warning'
  ?verification?.safe_action?.summary||'Do not use the payment route in this message until the case is independently verified.'
  :storyClaim?.type==='authority'&&verification?.safe_action
   ?'The cited law does not match the printed toll claim. Search the case independently before relying on the notice.'
   :verification?.safe_action?.summary||'Use the court’s own website or independently sourced contact information before responding.';
 const storyDurations=[2800,3600,5000,3200,0];
 const decisionEvidence=storySignal?.evidence?.[0]||storyEvidence;
 const decisionEvidenceTitle=storySignal?.title||decisionEvidence?.title||'Independent source';
 const decisionEvidenceSummary=storySignal?.summary||decisionEvidence?.excerpt||storyResult?.explanation||'No supported public source independently confirms this detail.';
 const decisionRelationship=storySignal?.kind==='SOURCE_CONFLICT'
  ?'Conflicts with the printed claim.'
  :storySignal
   ?'Matches an official warning pattern.'
   :storyResult?.verdict==='MATCH'
    ?'Matches the independent source.'
    :storyResult?.verdict==='MISMATCH'
     ?'Conflicts with the independent source.'
     :'Could not be confirmed independently.';
 const current=claims.find(claim=>claim.id===selected)||claims[0];
 const currentResult=current&&resultById.get(current.id);
 const active=hovered||selected;
 const ready=Boolean(verification)&&revealed>=claims.length;
 const count=(value:Result['verdict'])=>verification?.results.filter(result=>result.verdict===value).length||0;
 const decision=decisionCopy(verification);
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

 useEffect(()=>{const timer=window.setTimeout(()=>setHydrated(true),0);return()=>clearTimeout(timer)},[]);

 useEffect(()=>{
  if(!hydrated||initialRunStarted.current)return;
  if(initialRun&&initialText){
   initialRunStarted.current=true;
   void run('SNAPSHOT',{text:initialText,file:null});
   return;
  }
  const caseId=typeof window!=='undefined'?new URLSearchParams(window.location.search).get('case'):null;
  if(!caseId)return;
  initialRunStarted.current=true;
  void (async()=>{
   try{
    const response=await fetch(`/api/browse-case?id=${encodeURIComponent(caseId)}`);
    if(!response.ok)throw new Error('Case unavailable');
    const payload=await response.json() as {runText?:string};
    const seededText=payload.runText?.trim()||'';
    if(!seededText)throw new Error('Case text unavailable');
    setText(seededText);
    await run('SNAPSHOT',{text:seededText,file:null});
   }catch{
    initialRunStarted.current=false;
    setError('This browse case could not be opened. You can still upload or paste a message.');
   }
  })();
 },[hydrated,initialRun,initialText]);

 useEffect(()=>{
  if(!verification||!ready)return;
  const key=`${text.slice(0,96)}:${claims.length}:${verification.resolver_id}`;
  if(storyKey.current===key)return;
  storyKey.current=key;
  setStoryStep(0);
  setStoryPlaying(true);
  setStoryClosing(false);
  setStoryOpen(true);
 },[verification,ready,text,claims.length]);

 useEffect(()=>{
  if(!storyOpen||!storyPlaying||!verification||storyStep>=4)return;
  const timer=window.setTimeout(()=>{
   setStoryStep(step=>{
    if(step>=3){setStoryPlaying(false);return 4}
    return step+1;
   });
  },storyDurations[storyStep]||4000);
  return()=>window.clearTimeout(timer);
 },[storyOpen,storyPlaying,storyStep,verification]);

 useEffect(()=>{
  if(!storyOpen)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape')closeStory();
   if(event.key==='ArrowRight')storyNext();
   if(event.key==='ArrowLeft')storyBack();
   if(event.key===' ')setStoryPlaying(value=>!value);
  };
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)};
 },[storyOpen]);

 function storyNext(){
  setStoryStep(step=>{
   if(step>=4){setStoryPlaying(false);return 4}
   if(step===3)setStoryPlaying(false);
   return step+1;
  });
 }
 function storyBack(){setStoryStep(step=>Math.max(0,step-1))}
 function closeStory(){
  if(storyClosing)return;
  setStoryClosing(true);
  setStoryPlaying(false);
  window.setTimeout(()=>{setStoryOpen(false);setStoryClosing(false)},190);
 }
 function replayStory(){setStoryStep(0);setStoryPlaying(true);setStoryClosing(false);setStoryOpen(true)}

 function clear(){
  runId.current++;
  if(file)URL.revokeObjectURL(file.preview);
  setFile(null);setText('');setDraft('');setPasteMode(false);setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setMode('SNAPSHOT');setStoryOpen(false);setStoryStep(0);setStoryPlaying(true);setStoryClosing(false);storyKey.current='';
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

 async function run(sourceMode:Mode=mode,source?:{text:string;file:BrowserDocument|null}){
  const sourceText=source?.text??text;
  const sourceFile=source?source.file:file;
  const sourceIsDemo=!sourceFile&&/^DEMO \/ (?:FICTIONAL NOTICE|SYNTHETIC MESSAGE)/.test(sourceText);
  const id=++runId.current;
  setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setMode(sourceMode);setStatus('Reading requested actions');
  try{
   if(sourceFile?.uncertain){
    const unclear:Claim={id:'c1',type:'official',label:'Unreadable field',value:'Could not read confidently',exact_source_text:'Unreadable field',page:1};
    setClaims([unclear]);setExtractionMode('OCR / LOW CONFIDENCE');
    setVerification({results:[{claim_id:'c1',verdict:'COULD_NOT_VERIFY',explanation:'We couldn’t read this field confidently.',evidence:[],resolver_id:'ocr'}],resolver_id:'ocr'});
    setRevealed(1);setSelected('c1');return;
   }

   let extraction:Extraction=fallbackExtract(sourceText);
   let extractor='DETERMINISTIC';

   if(!sourceIsDemo){
    try{
     const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:sourceText})});
     if(response.ok){
      const data=await response.json();
      extraction=data.extraction;
      extractor=data.mode;
     }
    }catch{}
   }

   if(sourceFile?.kind==='pdf'){
    const juror=recoverLabeledJurorNumber(sourceFile.tokens);
    const date=recoverLabeledReportingDate(sourceFile.tokens);
    extraction={...extraction,juror_or_reference_number:juror||extraction.juror_or_reference_number,reporting_date:date||extraction.reporting_date};
   }

   if(runId.current!==id)return;
   setExtractionMode(extractor);

   const found=claimsFromExtraction(extraction,sourceText,sourceFile?.tokens||[]);
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
    body:JSON.stringify({claims:verifiable,court_name:routingCourt,jurisdiction_hint:'',mode:sourceMode,text:sourceText})
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

   const requested=
    found.find(claim=>claim.action&&checked.results.find(result=>result.claim_id===claim.id)?.verdict==='MISMATCH')||
    found.find(claim=>checked.results.find(result=>result.claim_id===claim.id)?.verdict==='MISMATCH')||
    found.find(claim=>claim.action)||
    found[0];
   setSelected(requested.id);
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
   <a href="/" className="rail-brand">SEAL<span>®</span></a>
   <div className="rail-group-label">WORKSPACE</div>
   <button className={`rail-item ${!text?'is-current':''}`} type="button" onClick={clear}>Check a message</button>
   <a className="rail-item" href="/browse">Browse real cases</a>
   <div className="rail-spacer"/>
   <div className="rail-foot"><strong>Public sources only</strong><span>Every item links back to the issuing court or agency.</span></div>
  </aside>
  <header className="seal-nav mobile-only-nav">
   <a href="/" className="mobile-brand">SEAL</a>
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
         <span className="upload-copy"><strong>{busy?status:'Upload a notice or screenshot'}</strong><small>{busy?'This can take a little longer the first time.':'PDF, PNG, or JPG · up to 16 MB'}</small></span>
         {!busy&&<span className="upload-browse">Browse files</span>}
        </span>
        {busy&&<span className="upload-progress" aria-hidden="true"><span/></span>}
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
   <section className="review-shell" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault()}} onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();upload(event.dataTransfer.files[0])}}}>
    {file?.sample&&<div className="source-failure" role="status">This document is marked SAMPLE. It is an example form, not a summons to act on. Claim checks below do not authenticate an individual notice.</div>}
    {liveFailed&&<div className="source-failure" role="status"><span>The court’s live pages didn’t respond. Affected claims remain unverified.</span><button onClick={()=>run('LIVE')} disabled={busy}>Check live sources</button></div>}

    {verification&&ready&&storyOpen&&<div className={`story-overlay ${storyClosing?'is-closing':''}`} role="dialog" aria-modal="true" aria-label="SEAL review presentation">
     <div className={`story-player story-step-${storyStep} ${storyPlaying?'is-playing':'is-paused'} ${storyFocusBox?'has-story-focus':'no-story-focus'}`}>
      <div className="story-topbar">
       <span className="story-brand">SEAL</span>
       <div className="story-top-actions">
        <button type="button" className="story-pause" onClick={()=>setStoryPlaying(value=>!value)}>{storyPlaying?'Pause':'Play'}</button>
        <button type="button" onClick={closeStory}>Details</button>
       </div>
      </div>

      <div className="story-progress" aria-label={`Frame ${storyStep+1} of 5`}>
       {[0,1,2,3,4].map(step=><span key={step} className={step<storyStep?'is-done':step===storyStep?'is-active':''}><i style={step===storyStep&&storyDurations[storyStep]?{animationDuration:`${storyDurations[storyStep]}ms`}:undefined}/></span>)}
      </div>

      <div className="story-stage">
       <div className="story-document-stage">
        {file?.kind==='image'?<div
          className="story-image-wrap"
          style={{transformOrigin:storyFocusBox?`${(storyFocusBox.x+storyFocusBox.width/2)*100}% ${(storyFocusBox.y+storyFocusBox.height/2)*100}%`:'50% 50%'}}
         >
          <img src={file.preview} alt="Your uploaded notice"/>
          {storyFocusBox&&<span className="story-highlight" style={{left:`${storyFocusBox.x*100}%`,top:`${storyFocusBox.y*100}%`,width:`${storyFocusBox.width*100}%`,height:`${storyFocusBox.height*100}%`}}/>}
         </div>
         :<div className="story-text-document">
          <span>{file?.kind==='pdf'?'PDF DOCUMENT':'PASTED MESSAGE'}</span>
          <p>{storyStep>0&&storyClaimDisplay?storyClaimDisplay:cleanDisplayText(text.slice(0,620))}</p>
         </div>}

        <div className="story-claim-anchor" aria-hidden={storyStep!==2}>
         <span>IN THE MESSAGE</span>
         <strong>{storyClaimHeading}</strong>
         <p>{storyClaimDisplay||'This is the detail SEAL is checking.'}</p>
        </div>

        <div className="story-source-panel" aria-hidden={storyStep<2||storyStep>3}>
         <span>{storyEvidence?'INDEPENDENT SOURCE':'SOURCE CHECK'}</span>
         <strong>{storyEvidence?.title||'No supported public source available'}</strong>
         <p>{storySourceCopy}</p>
         {storyEvidence&&<a href={storyEvidence.url} target="_blank" rel="noopener noreferrer">Open source</a>}
        </div>

        <div className="story-verdict-panel" aria-hidden={storyStep!==3}>
         <strong>{storyVerdict}</strong>
         <p>{storyVerdictCopy}</p>
        </div>

        <div className="story-action-panel" aria-hidden={storyStep!==4}>
         <span>BEFORE YOU ACT</span>
         <strong>{storyFinalTitle}</strong>
         <p>{storyFinalSummary}</p>
         {verification.contact?.name&&<small>{verification.contact.name}{verification.contact.phone?` · ${verification.contact.phone}`:''}</small>}
         <div className="story-final-actions">
          {verification.safe_action&&<a href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label}</a>}
          <button type="button" onClick={closeStory}>Full evidence</button>
         </div>
        </div>
       </div>

       <div className={`story-caption ${storyStep>1?'is-hidden':''}`} aria-hidden={storyStep>1}>
        <div className="story-caption-copy" key={storyStep} aria-live="polite">
         {storyStep===0&&<>
          <h2>This is what you sent.</h2>
          <p>SEAL follows one decision-relevant detail from this message to an independent source.</p>
         </>}
         {storyStep===1&&<>
          <h2>{storyClaimHeading}</h2>
          <p>{storyClaimDisplay||'This is the detail SEAL is checking.'}</p>
         </>}
        </div>
       </div>

       <button type="button" className="story-hit story-hit-left" aria-label="Previous frame" onClick={storyBack} disabled={storyStep===0}/>
       <button type="button" className="story-hit story-hit-right" aria-label="Next frame" onClick={storyNext} disabled={storyStep===4}/>
      </div>
     </div>
    </div>}

    <div className="review-hero">
     <div className="decision-pane" id="review-summary">
      <div className="review-tools">
       {isDemo&&<select aria-label="Choose demo fixture" value={fixture} onChange={event=>chooseFixture(event.target.value as FixtureKey)}>
        {Object.entries(fixtures).map(([key,value])=><option value={key} key={key}>{value.title}</option>)}
       </select>}
       {verification&&<button type="button" className="story-replay" onClick={replayStory}>Play review</button>}
       {verification&&<a href="#full-evidence" className="full-evidence-link">Full evidence</a>}
       <button type="button" className="review-new-check" onClick={clear}>Check another message</button>
      </div>

      {!verification?
       <div className={`precheck ${error?'has-error':''}`}>
        <h1>{busy?'Checking this message':error?(file?'We couldn’t check this image.':'We couldn’t check this message.'):'Ready to check this message.'}</h1>
        <p>{busy?(status||'Working through the message…'):error?error:'Keep the original beside the result while SEAL checks independently sourced information.'}</p>
        {busy?
         <div className="check-loader" role="status" aria-live="polite" aria-label={status||'Checking the message'}>
          <div className="check-loader-track"><span/></div>
          <small>{status==='Reading text from the image'?'The first image can take a little longer while the on-device reader starts.':'Keep this tab open while SEAL checks the message.'}</small>
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

        {storyClaim&&<div className="decision-claim">
         <span>From the message</span>
         <p>{storyClaimDisplay||cleanDisplayText(storyClaim.value)}</p>
        </div>}

        <div className="decision-evidence">
         <span>Independent source</span>
         <strong>{decisionEvidenceTitle}</strong>
         <p>{decisionEvidenceSummary}</p>
         {decisionEvidence&&<a href={decisionEvidence.url} target="_blank" rel="noopener noreferrer">Open source</a>}
        </div>

        <p className={`decision-relationship ${storyResult?.verdict==='MISMATCH'||storySignal?'is-conflict':''}`}>{decisionRelationship}</p>

        {verification.safe_action&&<div className="decision-safe">
         <h2>{verification.safe_action.title}</h2>
         <p>{verification.safe_action.summary}</p>
         <a className="safe-primary" href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label}</a>
         <small>{verification.safe_action.evidence[0]?.title||decisionEvidence?.title||'Independent official source'}</small>
        </div>}
       </div>}
     </div>

     <div className="document-zone" id="original-message">
      <div className="document-heading"><span>Original message</span><span>{file?.kind==='pdf'?'PDF':file?'Image':'Text'}</span></div>
      <div className="document-paper">
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
          className={`bbox ${active===claim.id?'focused':''}`}
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

    {ready&&requestedActions.length>0&&<section className={`requested-actions ${requestedActions.length===1?'single-action':''}`} aria-labelledby="requested-actions-title">
     <div className="section-heading">
      <h2 id="requested-actions-title">What the message asks you to do</h2>
      <p>These are extracted requests, not instructions from SEAL.</p>
     </div>
     <div className="action-list">
      {requestedActions.map(claim=>{
       const result=resultById.get(claim.id);
       return <button type="button" className="action-row" key={claim.id} onClick={()=>select(claim.id)}>
        <span className="action-verb">{actionSummaryWord(claim)}</span>
        <span className="action-source">{cleanDisplayText(claim.exact_source_text)}</span>
        <span className={`action-state ${result?.verdict.toLowerCase()||''}`}>{result?stateWord(result.verdict):'Not checked'}</span>
       </button>;
      })}
     </div>
    </section>}

    {ready&&verification?.safe_action&&<section className="source-resolution" id="source-checks" aria-label="Safe next step">
     <div className="section-heading evidence-heading">
      <h2>Independent evidence</h2>
      <p>{verification.safe_action.title}</p>
     </div>

     {verification.signals&&verification.signals.length>0&&<div className="source-signals">
      {verification.signals.map(signal=><article className="source-signal" key={signal.id}>
       <div className="signal-copy">
        <p className="signal-kind">{signal.kind==='SOURCE_CONFLICT'?'Source conflict':signal.kind==='KNOWN_PATTERN'?'Known pattern':'Official warning'}</p>
        <h3>{signal.title}</h3>
        <p>{signal.summary}</p>
       </div>
       <div className="signal-links">
        {signal.evidence.map((evidence,index)=><a href={evidence.url} target="_blank" rel="noopener noreferrer" key={`${signal.id}-${index}`}>{evidence.title}</a>)}
       </div>
      </article>)}
     </div>}

     <div className="safe-route">
      <div>
       <h2>{verification.safe_action.title}</h2>
       <p>{verification.safe_action.summary}</p>
      </div>
      <div>
       <ol className="safe-steps">{verification.safe_action.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>
       <a className="safe-primary" href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label}</a>
      </div>
     </div>

     <p className="resolution-disclaimer">These sources cannot confirm who sent the message.</p>
    </section>}

    {ready&&verification?.contact&&<section className="contact-section" aria-label="Independent court contact">
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

    {ready&&<section className="record-section" id="checked-details">
     <div className="section-heading record-heading">
      <h2>What was checked</h2>
      <p>Choose a detail to see the message text alongside the court source.</p>
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
       <p className="exact-source">“{cleanDisplayText(current.exact_source_text)}”</p>
       <div className="focus-rule"/>
       <div className="source-label">{currentResult.evidence.length?'Independent official source':'What we can establish'}</div>
       {currentResult.evidence.length?<>
        {(currentResult.explanation==='Official sources currently disagree.'?currentResult.evidence:currentResult.evidence.slice(0,1)).map((evidence,index)=><div className="evidence-excerpt" key={`${evidence.url}-${index}`}>
         <div className="source-name">{evidence.title}</div>
         <div className="source-quote">“{evidence.excerpt}”</div>
         <a className="official-link" href={evidence.url} target="_blank" rel="noopener noreferrer">Open official source</a>
         <div className="source-timestamp">{evidence.source_mode==='LIVE'?'LIVE OFFICIAL SOURCE':'SOURCE SNAPSHOT'} · {new Date(evidence.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div>
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
       {!currentResult.evidence.length&&<div className="source-timestamp">NO PUBLIC CONFIRMATION</div>}
      </div>}
     </div>

     <p className="verification-caveat">A matching detail does not authenticate this message or prove that every requested action is legitimate.</p>

     <details className="technical-record">
      <summary>Technical record <span>+</span></summary>
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
