'use client';

import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import PDFPreview from './pdf-preview';
import {fixtures,type FixtureKey} from '@/lib/fixtures';
import {fallbackExtract,claimsFromExtraction,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '@/lib/extract';
import {readInBrowser,type BrowserDocument} from '@/lib/browser-file';
import type {Claim,Extraction,Result,Verification} from '@/lib/types';
import './workspace.css';

type Mode='SNAPSHOT'|'LIVE';

const verdictLabel=(value:Result['verdict'])=>value.replaceAll('_',' ');
const stateWord=(value:Result['verdict'])=>value==='MATCH'?'Matches':value==='MISMATCH'?'Contradicts':'Unverified';

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
  title:"Something here doesn't line up.",
  summary:'One or more claims conflict with the independent source SEAL checked.'
 };
 if(matches)return {
  title:'These details match the official source.',
  summary:'That does not authenticate the message. Continue through an independent official route where possible.'
 };
 return {
  title:"We couldn't verify enough to tell you to act.",
  summary:'Use an independent official channel before following the message.'
 };
}

export default function SealApp({initialDemo=false}:{initialDemo?:boolean}){
 const [hydrated,setHydrated]=useState(false);
 const [fixture,setFixture]=useState<FixtureKey>('action-message-demo');
 const [text,setText]=useState(initialDemo?fixtures['action-message-demo'].text:'');
 const [draft,setDraft]=useState('');
 const [file,setFile]=useState<BrowserDocument|null>(null);
 const [claims,setClaims]=useState<Claim[]>([]);
 const [verification,setVerification]=useState<Verification|null>(null);
 const [mode,setMode]=useState<Mode>('SNAPSHOT');
 const [extractionMode,setExtractionMode]=useState('');
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [revealed,setRevealed]=useState(0);
 const [selected,setSelected]=useState('');
 const [hovered,setHovered]=useState('');
 const [showIndex,setShowIndex]=useState(false);
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
 const sourceLabel=verification?.signals?.length?'OFFICIAL SOURCE FINDINGS':verification?.resolver_id==='riverside'?(mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 24 SEP 2026'):verification?.resolver_id==='connecticut'?(mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 25 SEP 2026'):verification?.resolver_id==='courtlistener'?(claims.some(claim=>claim.type==='docket')?'FEDERAL DOCKET INDEX':'NO JURY-SOURCE COVERAGE'):verification?.resolver_id==='ocr'?'LOW CONFIDENCE OCR':verification?'NO SUPPORTED SOURCE':isActionDemo?'SOURCE SNAPSHOT · 25 SEP 2026':isDemo?'SOURCE SNAPSHOT · 24 SEP 2026':'SOURCE CHECK PENDING';

 useEffect(()=>{const timer=window.setTimeout(()=>setHydrated(true),0);return()=>clearTimeout(timer)},[]);

 function clear(){
  runId.current++;
  if(file)URL.revokeObjectURL(file.preview);
  setFile(null);setText('');setDraft('');setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setMode('SNAPSHOT');
 }

 function chooseFixture(key:FixtureKey){clear();setFixture(key);setText(fixtures[key].text)}
 function submitPaste(){const value=draft.trim();if(!value)return;clear();setText(value)}

 async function upload(uploaded:File){
  clear();setBusy(true);setStatus('Reading the document');
  try{
   const doc=await readInBrowser(uploaded);
   setFile(doc);setText(doc.text);
   if(!doc.text.trim())setError('We couldn’t read enough of this notice to verify it reliably. Try a clearer copy.');
  }catch(e){
   setError(e instanceof Error?e.message:'Could not read this file.');
  }finally{
   setBusy(false);setStatus('');
  }
 }

 async function run(sourceMode:Mode=mode){
  const id=++runId.current;
  setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setMode(sourceMode);setStatus('Reading requested actions');
  try{
   if(file?.uncertain){
    const unclear:Claim={id:'c1',type:'official',label:'Unreadable field',value:'Could not read confidently',exact_source_text:'Unreadable field',page:1};
    setClaims([unclear]);setExtractionMode('OCR / LOW CONFIDENCE');
    setVerification({results:[{claim_id:'c1',verdict:'COULD_NOT_VERIFY',explanation:'We couldn’t read this field confidently.',evidence:[],resolver_id:'ocr'}],resolver_id:'ocr'});
    setRevealed(1);setSelected('c1');return;
   }

   let extraction:Extraction=fallbackExtract(text);
   let extractor='DETERMINISTIC';

   if(!isDemo){
    try{
     const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
     if(response.ok){
      const data=await response.json();
      extraction=data.extraction;
      extractor=data.mode;
     }
    }catch{}
   }

   if(file?.kind==='pdf'){
    const juror=recoverLabeledJurorNumber(file.tokens);
    const date=recoverLabeledReportingDate(file.tokens);
    extraction={...extraction,juror_or_reference_number:juror||extraction.juror_or_reference_number,reporting_date:date||extraction.reporting_date};
   }

   if(runId.current!==id)return;
   setExtractionMode(extractor);

   const found=claimsFromExtraction(extraction,text,file?.tokens||[]);
   if(!found.length)throw new Error('We couldn’t read enough of this message to check it reliably. Try a clearer screenshot or paste the message text.');

   setClaims(found);
   setStatus('Checking independent sources');

   const verifiable=found.filter(claim=>claim.verification_eligible!==false);
   const courtClaim=found.find(claim=>claim.type==='court');
   const routingCourt=courtClaim?.verification_eligible===false?'':extraction.court_name;

   const response=await fetch('/api/verify',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({claims:verifiable,court_name:routingCourt,jurisdiction_hint:'',mode:sourceMode,text})
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
  <header className="seal-nav">
   <Link href="/" className="seal-mark">SEAL<span>®</span></Link>
   <div className="seal-nav-note">Independent court message check</div>
   {text?<button className="nav-action" type="button" onClick={clear}>New check</button>:<div className="nav-trust">No authenticity score</div>}
  </header>

  {!text?
   <section className="entry-shell">
    <div className="entry-copy">
     <h1>Before you call, click, pay, scan, or reply.</h1>
     <p>SEAL separates what the message asks you to do from what independent official sources can actually establish before you follow it.</p>
     <p className="entry-principle">A court name, seal, or threatening tone is not proof. The requested action is checked separately.</p>
    </div>

    <div className="intake">
     <button className="upload-row" type="button" disabled={busy||!hydrated} onClick={()=>input.current?.click()}>
      <span className="upload-plus" aria-hidden="true">+</span>
      <span><strong>{busy?status:'Upload a screenshot, image, or PDF'}</strong><small>PNG, JPG, or PDF. The original file stays in this browser.</small></span>
      <span className="upload-browse">Browse</span>
     </button>

     <div className="paste-divider"><span>or paste the message</span></div>
     <label className="paste-field">
      <span className="field-label">Message text</span>
      <textarea aria-label="Paste the court message" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Paste the text, email, or message here. Include the part that asks you to call, click, pay, scan, appear, or provide information."/>
     </label>

     <div className="intake-actions">
      <button className="check-message" type="button" disabled={!draft.trim()||!hydrated} onClick={submitPaste}>Check this message</button>
      <button className="demo-link" type="button" disabled={!hydrated} onClick={()=>chooseFixture('action-message-demo')}>Use a synthetic example</button>
     </div>

     {error&&<div role="alert" className="inspection-error">{error}</div>}

     <details className="privacy">
      <summary>Privacy and processing</summary>
      <p>Your uploaded file does not leave the browser. Extracted text can be sent to the SEAL server and, when configured, to Groq for claim structuring. SEAL does not store the uploaded file or extracted claims.</p>
     </details>
    </div>
   </section>
   :
   <section className="review-shell" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault()}} onDrop={event=>{if(event.dataTransfer.files.length){event.preventDefault();upload(event.dataTransfer.files[0])}}}>
    <div className="review-head">
     <div>
      <p className="review-context">{isActionDemo?'Synthetic test message':isDemo?'Fictional demonstration':file?.kind==='pdf'?'PDF document':file?'Image or screenshot':'Pasted message'}</p>
      <h1>{isActionDemo?'Suspicious jury-duty message':isDemo?'Riverside notice':file?'Uploaded notice':'Pasted message'}</h1>
     </div>
     <div className="review-head-actions">
      {isDemo&&<select aria-label="Choose demo fixture" value={fixture} onChange={event=>chooseFixture(event.target.value as FixtureKey)}>
       {Object.entries(fixtures).map(([key,value])=><option value={key} key={key}>{value.title}</option>)}
      </select>}
      <span className="source-status">{sourceLabel}</span>
     </div>
    </div>

    {file?.sample&&<div className="source-failure" role="status">This document is marked SAMPLE. It is an example form, not a summons to act on. Claim checks below do not authenticate an individual notice.</div>}
    {liveFailed&&<div className="source-failure" role="status"><span>The court’s live pages didn’t respond. Affected claims remain unverified.</span><button onClick={()=>run('LIVE')} disabled={busy}>Check live sources</button></div>}

    <div className="review-hero">
     <div className="decision-pane">
      {!verification?
       <div className="precheck">
        <h2>{busy?'Checking this message.':'Ready to check what this message asks you to do.'}</h2>
        <p>{busy?'SEAL is separating requested actions from surrounding language, then checking the parts that can be reproduced against independent sources.':'The document stays visible while SEAL checks the requested actions and independently verifiable details.'}</p>
        {busy?
         <ol className="processing-list" aria-live="polite">
          <li className={status==='Reading requested actions'?'active':''}>Read requested actions</li>
          <li className={status==='Checking independent sources'?'active':''}>Check independent sources</li>
          <li>Find a safer route</li>
         </ol>
         :
         <button type="button" className="run-button" disabled={busy||!text.trim()||!hydrated} onClick={()=>run()}>Check this message</button>}
        <p className="precheck-note">{file?'The original file stays in this browser. Only extracted text is sent for claim structuring.':'Pasted text can be sent for claim structuring; SEAL does not store it.'}</p>
       </div>
       :
       <div className="decision">
        <p className="decision-label">What to do now</p>
        <h2>{decision.title}</h2>
        <p className="decision-summary">{decision.summary}</p>
        {verification.safe_action&&<a className="safe-primary" href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label}</a>}
        <p className="decision-disclaimer">This check does not authenticate this message. It compares requested actions and claims with independent sources.</p>
        {primaryAction&&<button type="button" className="action-callout" onClick={()=>select(primaryAction.id)}>
         <span>What the message asks</span>
         <strong>{actionSummary}</strong>
        </button>}
        <div className="review-progress"><span>{claims.length} claims checked</span><span>{count('MISMATCH')} contradict · {count('MATCH')} match · {count('COULD_NOT_VERIFY')} unverified</span></div>
       </div>}
     </div>

     <div className="document-zone">
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

    {ready&&requestedActions.length>0&&<section className="requested-actions" aria-labelledby="requested-actions-title">
     <div className="section-heading">
      <h2 id="requested-actions-title">What the message asks you to do</h2>
      <p>These are extracted requests, not instructions from SEAL.</p>
     </div>
     <div className="action-list">
      {requestedActions.map(claim=>{
       const result=resultById.get(claim.id);
       return <button type="button" className="action-row" key={claim.id} onClick={()=>select(claim.id)}>
        <span className="action-verb">{actionSummaryWord(claim)}</span>
        <span className="action-source">{claim.exact_source_text}</span>
        <span className={`action-state ${result?.verdict.toLowerCase()||''}`}>{result?stateWord(result.verdict):'Not checked'}</span>
       </button>;
      })}
     </div>
    </section>}

    {ready&&verification?.safe_action&&<section className="source-resolution" aria-label="Safe next step">
     <div className="section-heading evidence-heading">
      <h2>What the independent sources change</h2>
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

     <p className="resolution-disclaimer">This is not an authenticity ruling. It is a safer route based on independent official sources.</p>
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

    {ready&&<section className="record-section">
     <div className="section-heading record-heading">
      <h2>Full verification record</h2>
      <p>Select a row to inspect the exact source text, result, and supporting evidence.</p>
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
          <span className="index-claim">{claim.label}</span>
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
       <div className="claim-value">{current.value}</div>
       <p className="exact-source">“{current.exact_source_text}”</p>
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

    {error&&<div role="alert" className="inspection-error">{error} <button type="button" onClick={()=>input.current?.click()}>Choose another file</button></div>}
   </section>}

  <input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={event=>{const next=event.target.files?.[0];if(next)upload(next);event.target.value=''}}/>

  <footer className="seal-footer">
   <span>SEAL is not affiliated with any court.</span>
   <span>Requested actions. Independent sources. No authenticity claim.</span>
  </footer>
 </main>;
}
