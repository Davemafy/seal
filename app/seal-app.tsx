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
 const action=claim.action;if(!action)return '';
 if(action.kind==='pay')return action.target_type==='money'&&action.target_value?`Pay ${action.target_value}`:'Pay';
 if(action.kind==='contact')return action.verb==='text'?'Text':/^(?:call|phone)$/.test(action.verb)?'Call':'Contact';
 if(action.kind==='navigate')return action.verb==='scan'?'Scan':action.target_type==='url'?'Open link':'Open';
 if(action.kind==='disclose')return 'Provide information';
 if(action.kind==='appear')return action.verb==='report'?'Report':'Appear';
 return action.verb?action.verb.charAt(0).toUpperCase()+action.verb.slice(1):'Act';
};

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
 const [trace,setTrace]=useState('');
 const [showIndex,setShowIndex]=useState(false);
 const input=useRef<HTMLInputElement>(null);
 const stage=useRef<HTMLDivElement>(null);
 const evidenceAnchor=useRef<HTMLDivElement>(null);
 const anchors=useRef<Record<string,HTMLElement|null>>({});
 const runId=useRef(0);
 const isDemo=!file&&/^DEMO \/ (?:FICTIONAL NOTICE|SYNTHETIC MESSAGE)/.test(text);
 const isActionDemo=isDemo&&text.startsWith('DEMO / SYNTHETIC MESSAGE');
 const resultById=useMemo(()=>new Map(verification?.results.map(r=>[r.claim_id,r])||[]),[verification]);
 const current=claims.find(c=>c.id===selected)||claims[0];
 const currentResult=current&&resultById.get(current.id);
 const requestedActions=useMemo(()=>claims.filter(c=>Boolean(c.action)),[claims]);
 const primaryAction=requestedActions[0];
 const actionSummary=useMemo(()=>{
  const words=[...new Set(requestedActions.map(actionSummaryWord).filter(Boolean))];
  return words.length?`${words.length} action${words.length===1?'':'s'}: ${words.join(' · ')}`:'';
 },[requestedActions]);
 const technicalEvidence=useMemo(()=>{
  if(!verification)return [];
  const all=[...verification.results.flatMap(r=>r.evidence),...(verification.signals||[]).flatMap(signal=>signal.evidence),...(verification.safe_action?.evidence||[])];
  return [...new Map(all.map(e=>[e.url,e])).values()];
 },[verification]);
 const resolverSummary=verification
  ?`Court resolver: ${verification.resolver_id==='unsupported'?'unavailable':verification.resolver_id} · Source intelligence: ${verification.signals?.length||verification.safe_action?'active':'inactive'} · Mode: ${mode}`
  :'';
 const ready=Boolean(verification)&&revealed>=claims.length;
 const count=(v:Result['verdict'])=>verification?.results.filter(r=>r.verdict===v).length||0;
 const liveFailed=mode==='LIVE'&&['riverside','connecticut'].includes(verification?.resolver_id||'')&&verification?.results.some(r=>r.explanation==='Official source could not be reached during this check.');
 const sourceLabel=verification?.signals?.length?'OFFICIAL SOURCE FINDINGS':verification?.resolver_id==='riverside'?(mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 24 SEP 2026'):verification?.resolver_id==='connecticut'?(mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 25 SEP 2026'):verification?.resolver_id==='courtlistener'?(claims.some(c=>c.type==='docket')?'FEDERAL DOCKET INDEX':'NO JURY-SOURCE COVERAGE'):verification?.resolver_id==='ocr'?'LOW CONFIDENCE OCR':verification?'NO SUPPORTED SOURCE':isActionDemo?'SOURCE SNAPSHOT · 25 SEP 2026':isDemo?'SOURCE SNAPSHOT · 24 SEP 2026':'SOURCE CHECK PENDING';
 useEffect(()=>{const timer=window.setTimeout(()=>setHydrated(true),0);return()=>clearTimeout(timer)},[]);

 function clear(){runId.current++;if(file)URL.revokeObjectURL(file.preview);setFile(null);setText('');setDraft('');setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setMode('SNAPSHOT')}
 function chooseFixture(key:FixtureKey){clear();setFixture(key);setText(fixtures[key].text)}
 function submitPaste(){const value=draft.trim();if(!value)return;clear();setText(value)}
 async function upload(uploaded:File){clear();setBusy(true);setStatus('Reading document');try{const doc=await readInBrowser(uploaded);setFile(doc);setText(doc.text);if(!doc.text.trim())setError('We couldn’t read enough of this notice to verify it reliably. Try a clearer copy.')}catch(e){setError(e instanceof Error?e.message:'Could not read this file.')}finally{setBusy(false);setStatus('')}}
 async function run(sourceMode:Mode=mode){
  const id=++runId.current;setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setMode(sourceMode);setStatus('Identifying claims');
  try{
   if(file?.uncertain){const unclear:Claim={id:'c1',type:'official',label:'Unreadable field',value:'Could not read confidently',exact_source_text:'Unreadable field',page:1};setClaims([unclear]);setExtractionMode('OCR / LOW CONFIDENCE');setVerification({results:[{claim_id:'c1',verdict:'COULD_NOT_VERIFY',explanation:'We couldn’t read this field confidently.',evidence:[],resolver_id:'ocr'}],resolver_id:'ocr'});setRevealed(1);setSelected('c1');return}
   let extraction:Extraction=fallbackExtract(text);let extractor='DETERMINISTIC';
   if(!isDemo){try{const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(response.ok){const data=await response.json();extraction=data.extraction;extractor=data.mode}}catch{}}
   if(file?.kind==='pdf'){const juror=recoverLabeledJurorNumber(file.tokens),date=recoverLabeledReportingDate(file.tokens);extraction={...extraction,juror_or_reference_number:juror||extraction.juror_or_reference_number,reporting_date:date||extraction.reporting_date}}
   if(runId.current!==id)return;
   setExtractionMode(extractor);
   const found=claimsFromExtraction(extraction,text,file?.tokens||[]);
   if(!found.length)throw new Error('We couldn’t read enough of this message to check it reliably. Try a clearer screenshot or paste the message text.');
   setClaims(found);setStatus('Checking court sources');
   const verifiable=found.filter(claim=>claim.verification_eligible!==false);
   const courtClaim=found.find(claim=>claim.type==='court');
   const routingCourt=courtClaim?.verification_eligible===false?'':extraction.court_name;
   const response=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claims:verifiable,court_name:routingCourt,jurisdiction_hint:'',mode:sourceMode,text})});
   if(!response.ok)throw new Error('The source check could not finish. Try again.');
   const checkedServer=await response.json() as Verification;
   const checkedById=new Map(checkedServer.results.map(result=>[result.claim_id,result]));
   const checked:Verification={...checkedServer,results:found.map(claim=>claim.verification_eligible===false?{claim_id:claim.id,verdict:'COULD_NOT_VERIFY',explanation:'We couldn’t read this field confidently.',evidence:[],resolver_id:'ocr'}:checkedById.get(claim.id)||{claim_id:claim.id,verdict:'COULD_NOT_VERIFY',explanation:'No supported official-source check applies to this extracted action.',evidence:[],resolver_id:checkedServer.resolver_id})};
   if(runId.current!==id)return;
   setVerification(checked);
   if(isDemo&&!isActionDemo&&sourceMode==='SNAPSHOT'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const order=[0,1,2,4,7,5,3,6,8].filter(i=>i<found.length);
    for(let step=0;step<order.length;step++){await new Promise(resolve=>setTimeout(resolve,step===0?300:420));if(runId.current!==id)return;setSelected(found[order[step]].id);setRevealed(step+1)}
    setRevealed(found.length);setSelected(found[7]?.id||found[0].id);
   }else{setRevealed(found.length);const requested=found.find(c=>c.action&&checked.results.find(r=>r.claim_id===c.id)?.verdict==='MISMATCH')||found.find(c=>checked.results.find(r=>r.claim_id===c.id)?.verdict==='MISMATCH')||found.find(c=>c.action)||found[0];setSelected(requested.id)}
  }catch(e){if(runId.current===id)setError(e instanceof Error?e.message:'The source check could not finish.')}finally{if(runId.current===id){setBusy(false);setStatus('')}}
 }
 const select=useCallback((id:string)=>{if(!verification||!resultById.has(id))return;setSelected(id);setShowIndex(false)},[verification,resultById]);
 const active=hovered||selected;
 const positionTrace=useCallback(()=>{const root=stage.current,claim=anchors.current[active],target=evidenceAnchor.current;if(!root||!claim||!target||window.innerWidth<=760){setTrace('');return}const a=claim.getBoundingClientRect(),b=target.getBoundingClientRect(),c=root.getBoundingClientRect();const x=a.right-c.left+5,y=a.top+a.height/2-c.top,endX=b.left-c.left-13,endY=b.top+Math.min(b.height/2,48)-c.top;if(endX<=x){setTrace('');return}setTrace(`M ${x} ${y} C ${x+60} ${y}, ${endX-60} ${endY}, ${endX} ${endY}`)},[active]);
 useEffect(()=>{const observer=new ResizeObserver(positionTrace);if(stage.current)observer.observe(stage.current);window.addEventListener('resize',positionTrace);window.addEventListener('scroll',positionTrace,{passive:true});const timer=setTimeout(positionTrace,70);return()=>{observer.disconnect();window.removeEventListener('resize',positionTrace);window.removeEventListener('scroll',positionTrace);clearTimeout(timer)}},[positionTrace,verification,revealed]);
 useEffect(()=>{if(!verification)return;const onKey=(event:KeyboardEvent)=>{if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLButtonElement||event.target instanceof HTMLAnchorElement)return;if(event.key==='ArrowDown'||event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();const index=claims.findIndex(c=>c.id===selected);const direction=event.key==='ArrowDown'||event.key==='ArrowRight'?1:-1;const next=Math.max(0,Math.min(claims.length-1,index+direction));select(claims[next].id)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[verification,claims,selected,select]);

 return <main className={text?'seal-has-document':''}>
  <header className="topbar"><Link href="/" className="wordmark">SEAL<span>®</span></Link><span className="topnote">INDEPENDENT COURT MESSAGE CHECK <i/> EST. 2026</span><span className="index">SOURCE FIRST / NO AUTHENTICITY CLAIM</span></header>
  {!text?<section className="action-home">
   <div className="action-copy">
    <div className="eyebrow"><span className="dot"/> COURT MESSAGE CHECK</div>
    <h1>Before you call,<br/>click, pay, <em>or reply.</em></h1>
    <p>Show SEAL the message you received. It separates what the message is asking you to do from what an independent official source can actually establish.</p>
    <div className="home-law"><span>01</span><p>Matching a court name is not proof the message is real. SEAL checks the requested action separately.</p></div>
   </div>
   <div className="intake-card">
    <div className="intake-head"><span>CHECK A MESSAGE</span><span>NO ACCOUNT</span></div>
    <button className="upload-tile" type="button" disabled={busy||!hydrated} onClick={()=>input.current?.click()}>
     <span className="upload-icon">↑</span><strong>{busy?status:'Upload a screenshot, image, or PDF'}</strong><small>PNG, JPG, or PDF · the original file stays in this browser</small>
    </button>
    <div className="intake-or"><span/>OR PASTE THE MESSAGE<span/></div>
    <label className="paste-field"><span>MESSAGE TEXT</span><textarea aria-label="Paste the court message" value={draft} onChange={e=>setDraft(e.target.value)} placeholder={"Paste the text, email, or message here…\n\nInclude the part that asks you to call, click, pay, or provide information."}/></label>
    <div className="intake-actions"><button className="check-message" type="button" disabled={!draft.trim()||!hydrated} onClick={submitPaste}>Check this message <span>↗</span></button><button className="demo-link" type="button" disabled={!hydrated} onClick={()=>chooseFixture('action-message-demo')}>Use a synthetic example →</button></div>
    {error&&<div role="alert" className="inspection-error">{error}</div>}
    <details className="privacy"><summary>What leaves this browser?</summary><p>Your uploaded file does not. Extracted text can be sent to the SEAL server and, when configured, to Groq for claim structuring. SEAL does not store the file or extracted claims.</p></details>
   </div>
   <aside className="action-proof" aria-label="How SEAL checks a message"><div><span>MESSAGE</span><strong>“Pay $750 today…”</strong></div><i>→</i><div><span>REQUESTED ACTION</span><strong>Payment app</strong></div><i>→</i><div><span>OFFICIAL SOURCE</span><strong>What does the court or FTC actually say?</strong></div></aside>
  </section>:
  <section className="inspection" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();upload(e.dataTransfer.files[0])}}}>
   <div className="inspection-top"><div className="case-identity"><span className="case-kicker">SEAL / MESSAGE REVIEW</span><h1>{isActionDemo?'Suspicious jury-duty message':isDemo?'Riverside notice':file?'Uploaded notice':'Pasted message'}</h1></div><div className="inspection-actions">{isDemo&&<select aria-label="Choose demo fixture" value={fixture} onChange={e=>chooseFixture(e.target.value as FixtureKey)}>{Object.entries(fixtures).map(([key,value])=><option value={key} key={key}>{value.title}</option>)}</select>}<button type="button" onClick={clear}>New check <span>↗</span></button></div></div>
   <div className="inspection-meta"><span>{isActionDemo?'DEMO / SYNTHETIC MESSAGE':isDemo?'DEMO / FICTIONAL NOTICE':file?.kind==='pdf'?'PDF DOCUMENT':file?'IMAGE / SCREENSHOT':'PASTED MESSAGE'}</span><span>{sourceLabel}</span><span>{ready?`${claims.length} CLAIMS REVIEWED`:busy?status:'NOT YET CHECKED'}</span></div>
   {file?.sample&&<div className="source-failure" role="status">This document is marked SAMPLE. It is an example form, not a summons to act on. Claim checks below do not authenticate an individual notice.</div>}
   {liveFailed&&<div className="source-failure" role="status"><span>The court’s live pages didn’t respond. Affected claims remain unverified.</span><button onClick={()=>run('LIVE')} disabled={busy}>Try again ↗</button></div>}
   <div className="inspection-stage" ref={stage}>
    <div className="document-zone"><div className="zone-caption"><span>01 / {file?.kind==='pdf'?'DOCUMENT':'MESSAGE'}</span><span>{isActionDemo?'SYNTHETIC EXAMPLE':isDemo?'FICTIONAL EXAMPLE':file?.kind==='pdf'?'ORIGINAL PDF':file?'ORIGINAL IMAGE':'PASTED TEXT'}</span></div><div className="document-paper">
      {isActionDemo?<><div className="message-card">
       <div className="message-card-head"><span>SYNTHETIC TEST MESSAGE</span><span>NOT A REAL PERSON</span></div>
       <div className="message-sender"><span>UNKNOWN SENDER</span><strong>Claims to be a federal court</strong></div>
       <div className="message-lines">{text.split('\n').slice(1).map((line,i)=>{const claim=claims.find(c=>c.exact_source_text===line||line.includes(c.value));const result=claim&&resultById.get(claim.id);const value=claim?.value||'';const pos=claim?line.indexOf(value):-1;return <div className={`message-line ${claim?'document-has-claim':''}`} key={i}>{claim&&pos>=0?<>{line.slice(0,pos)}<button type="button" className={`document-claim ${result?`state-${result.verdict.toLowerCase()}`:''} ${active===claim.id?'is-active':''}`} aria-label={`${claim.label}: ${claim.value}${result?' — '+verdictLabel(result.verdict):''}`} onClick={()=>select(claim.id)} onMouseEnter={()=>setHovered(claim.id)} onMouseLeave={()=>setHovered('')} ref={el=>{anchors.current[claim.id]=el}}><span className="claim-mark" aria-hidden="true">{result?result.verdict==='MATCH'?'✓':result.verdict==='MISMATCH'?'!':'·':''}</span>{value}</button>{line.slice(pos+value.length)}</>:line}</div>})}</div>
       <div className="notice-end">Synthetic engineering example based on published jury-scam patterns. It does not prove real-world accuracy or demand. SEAL is not affiliated with any court.</div>
      </div></>:isDemo?<><div className="notice-head"><span>DEMO / FICTIONAL NOTICE</span><span>FOR PRODUCT DEMONSTRATION ONLY</span></div><div className="notice-brand">JURY SERVICE <span>•</span> RESPONSE NOTICE</div><div className="notice-subtitle">Superior Court of California · County of Riverside</div><div className="notice-divider"/><div className="document-body">{text.split('\n').slice(1).map((line,i)=>{const claim=claims.find(c=>c.exact_source_text===line||line.includes(c.value));const result=claim&&resultById.get(claim.id);const shown=claim&&result&&(!isDemo||revealed>=claims.length||[0,1,2,4,7,5,3,6,8].slice(0,revealed).some(n=>claims[n]?.id===claim.id));const value=claim?.value||'';const at=claim?line.indexOf(value):-1;return <div className={`document-line ${claim?'document-has-claim':''}`} key={i}>{claim&&at>=0?<>{line.slice(0,at)}<button type="button" className={`document-claim ${shown?`state-${result!.verdict.toLowerCase()}`:''} ${active===claim.id?'is-active':''}`} aria-label={`${claim.label}: ${claim.value}${result?' — '+verdictLabel(result.verdict):''}`} aria-pressed={selected===claim.id} onClick={()=>select(claim.id)} onMouseEnter={()=>setHovered(claim.id)} onMouseLeave={()=>setHovered('')} ref={el=>{anchors.current[claim.id]=el}}><span className="claim-mark" aria-hidden="true">{shown?result!.verdict==='MATCH'?'✓':result!.verdict==='MISMATCH'?'!':'·':''}</span>{value}</button>{line.slice(at+value.length)}</>:line}</div>})}</div><div className="notice-end">This example uses fictional personal details and a generic visual mark. SEAL is not affiliated with any court.</div></>:
       !file?<div className="message-card pasted-message"><div className="message-card-head"><span>PASTED MESSAGE</span><span>ORIGINAL TEXT</span></div><div className="message-lines">{text.split('\n').map((line,i)=>{const claim=claims.find(c=>c.exact_source_text===line||line.includes(c.value));const result=claim&&resultById.get(claim.id);const value=claim?.value||'';const pos=claim?line.indexOf(value):-1;return <div className={`message-line ${claim?'document-has-claim':''}`} key={i}>{claim&&pos>=0?<>{line.slice(0,pos)}<button type="button" className={`document-claim ${result?`state-${result.verdict.toLowerCase()}`:''} ${active===claim.id?'is-active':''}`} aria-label={`${claim.label}: ${claim.value}${result?' — '+verdictLabel(result.verdict):''}`} onClick={()=>select(claim.id)} onMouseEnter={()=>setHovered(claim.id)} onMouseLeave={()=>setHovered('')} ref={el=>{anchors.current[claim.id]=el}}><span className="claim-mark" aria-hidden="true">{result?result.verdict==='MATCH'?'✓':result.verdict==='MISMATCH'?'!':'·':''}</span>{value}</button>{line.slice(pos+value.length)}</>:line}</div>})}</div></div>:
       file?.kind==='image'?<div className="preview-box"><img src={file.preview} alt="Uploaded notice"/>{claims.filter(c=>c.source_bbox&&c.page===1).map(c=><button type="button" key={c.id} aria-label={`Select ${c.label}`} className={`bbox ${active===c.id?'focused':''}`} style={{left:`${c.source_bbox!.x*100}%`,top:`${c.source_bbox!.y*100}%`,width:`${c.source_bbox!.width*100}%`,height:`${c.source_bbox!.height*100}%`}} onClick={()=>select(c.id)} ref={el=>{anchors.current[c.id]=el}}/>)}</div>:
       <PDFPreview url={file?.preview||''} claims={claims} active={active} anchors={anchors} onSelect={select}/>}
     </div></div>
    <svg className="single-trace" aria-hidden="true"><path d={trace}/></svg>
    <div className="evidence-rail"><div className="zone-caption"><span>02 / OFFICIAL CHECK</span><span>{verification?`${revealed} OF ${claims.length}`:'AWAITING NOTICE CHECK'}</span></div>
     {!verification?<div className="awaiting"><span className="awaiting-symbol" aria-hidden="true">↗</span><h2>{busy?status:'Check what this message asks you to do.'}</h2><p>{busy?'SEAL has separated the requested actions from the surrounding message. Now it checks them against independent official sources.':'A court name, seal, or threat is not enough. Check the requested action before you act.'}</p><button type="button" className="run-button" disabled={busy||!text.trim()||!hydrated} onClick={()=>run()}>{busy?'Checking sources…':'Check this message'} <span>↗</span></button><div className="awaiting-note">{isDemo?'Uses a dated source snapshot for a repeatable demonstration.':file?'The original file stays in this browser. Only extracted text is sent for claim structuring.':'Pasted text can be sent for claim structuring; SEAL does not store it.'}</div></div>:
     <div className="evidence-content">{ready&&verification.safe_action&&<section className="source-resolution" aria-label="Safe next step"><div className="resolution-kicker">SAFE NEXT STEP · INDEPENDENT SOURCES</div><h2>{verification.safe_action.title}</h2><p className="resolution-summary">{verification.safe_action.summary}</p>{verification.signals&&verification.signals.length>0&&<div className="source-signals">{verification.signals.map(signal=><article className="source-signal" key={signal.id}><div className="signal-kind">{signal.kind==='SOURCE_CONFLICT'?'SOURCE CONFLICT':signal.kind==='KNOWN_PATTERN'?'KNOWN PATTERN':'OFFICIAL WARNING'}</div><h3>{signal.title}</h3><p>{signal.summary}</p><div className="signal-links">{signal.evidence.map((e,i)=><a href={e.url} target="_blank" rel="noopener noreferrer" key={`${signal.id}-${i}`}>{e.title} ↗</a>)}</div></article>)}</div>}<ol className="safe-steps">{verification.safe_action.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><a className="safe-primary" href={verification.safe_action.primary_url} target="_blank" rel="noopener noreferrer">{verification.safe_action.primary_label} <span>↗</span></a><p className="resolution-disclaimer">This is not an authenticity ruling. It is a safer route based on independent official sources.</p></section>}{ready&&primaryAction&&<button type="button" className="action-callout" onClick={()=>select(primaryAction.id)}><span>WHAT THIS MESSAGE ASKS YOU TO DO</span><strong>{actionSummary}</strong><em>{requestedActions.length>1?'Review the actions →':'See the official check →'}</em></button>}<div className="review-progress">{ready?<><span>{claims.length} claims checked</span><div><strong>{count('MISMATCH')}</strong> contradict · <strong>{count('MATCH')}</strong> match · <strong>{count('COULD_NOT_VERIFY')}</strong> unverified</div></>:<span>Checking the notice · {revealed} of {claims.length}</span>}</div>
      {ready&&count('MATCH')>0&&<p className="verification-caveat">A matching court detail does not authenticate this message or confirm anyone’s jury service.</p>}
      {current&&currentResult?<div className="focused-evidence" ref={evidenceAnchor} aria-live="polite"><div className="focus-number"><span>{String(claims.findIndex(c=>c.id===current.id)+1).padStart(2,'0')} / {String(claims.length).padStart(2,'0')} &nbsp; {current.label.toUpperCase()}</span><span className={`state-text ${currentResult.verdict.toLowerCase()}`}>{verdictLabel(currentResult.verdict)}</span></div><div className="from-label">IN THE MESSAGE</div><div className="claim-value">{current.value}</div><div className="focus-rule"/><div className="source-label">{currentResult.evidence.length?'INDEPENDENT OFFICIAL SOURCE':'WHAT WE CAN ESTABLISH'}</div>{currentResult.evidence.length?<>{(currentResult.explanation==='Official sources currently disagree.'?currentResult.evidence:currentResult.evidence.slice(0,1)).map((e,i)=><div className="evidence-excerpt" key={`${e.url}-${i}`}><div className="source-name">{e.title}</div><div className="source-quote">“{e.excerpt}”</div><a className="official-link" href={e.url} target="_blank" rel="noopener noreferrer">Open official source <span>↗</span></a><div className="source-timestamp">{e.source_mode==='LIVE'?'LIVE OFFICIAL SOURCE':'SOURCE SNAPSHOT'} · {new Date(e.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div></div>)}{currentResult.evidence.length>1&&currentResult.explanation!=='Official sources currently disagree.'&&<details className="additional-sources"><summary>{currentResult.evidence.length-1} more source excerpt{currentResult.evidence.length>2?'s':''}</summary>{currentResult.evidence.slice(1).map((e,i)=><div key={i}><div>{e.title}</div><blockquote>{e.excerpt}</blockquote><a href={e.url} target="_blank" rel="noopener noreferrer">Open source ↗</a><div className="source-timestamp">{e.source_mode} · {new Date(e.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div></div>)}</details>}</>:<div className="no-source">{currentResult.explanation}</div>}<div className="why-line">{currentResult.evidence.length?currentResult.explanation:'This does not mean the detail is wrong.'}</div>{!currentResult.evidence.length&&<div className="source-timestamp">NO PUBLIC CONFIRMATION</div>}</div>:<div className="focused-evidence"><div className="source-label">CHECKING</div><p>Looking at the next detail in the notice.</p></div>}
      <div className="claim-index"><div className="index-title"><span>CHECKED DETAILS</span><button type="button" className="mobile-index-toggle" onClick={()=>setShowIndex(v=>!v)}>{showIndex?'Hide':'Show'} list {showIndex?'↑':'↓'}</button><span className="desktop-index-count">{claims.length}</span></div><div className={`claim-index-list ${showIndex?'mobile-open':''}`}>{claims.map((claim,i)=>{const result=resultById.get(claim.id);const shown=ready||[0,1,2,4,7,5,3,6,8].slice(0,revealed).some(n=>claims[n]?.id===claim.id);return <button type="button" key={claim.id} className={`index-item ${selected===claim.id?'selected':''}`} disabled={!result||!shown} onClick={()=>select(claim.id)}><span className="index-ordinal">{String(i+1).padStart(2,'0')}</span><span className="index-claim">{claim.label}</span><span className={`index-state ${result&&shown?result.verdict.toLowerCase():''}`}>{result&&shown?stateWord(result.verdict):'—'}</span></button>})}</div></div>
      {ready&&verification.contact&&<div className="court-contact"><div className="source-label">SAFE COURT CONTACT</div><h2>Contact the court without using the message.</h2><div className="contact-name">{verification.contact.name||(verification.resolver_id==='connecticut'?'District of Connecticut Jury Office':'Riverside Jury Services')}</div><a className="contact-phone" href={`tel:${verification.contact.phone}`}>{verification.contact.phone} <span>↗</span></a><div className="contact-actions"><a href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open court website ↗</a><button onClick={()=>run('LIVE')} disabled={busy}>Check live sources ↗</button></div><p>These contact details come from the court source, not the notice. {verification.contact.source.source_mode==='SNAPSHOT'?'Source snapshot checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.':'Live source checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})+'.'}</p></div>}
      {ready&&<details className="technical-record"><summary>Technical record <span>＋</span></summary><p>Extractor: {extractionMode} · {resolverSummary}</p>{technicalEvidence.map((e,i)=><p key={e.url||i}>{e.title} · {e.source_mode} · {e.checked_at} · <a href={e.url} target="_blank" rel="noopener noreferrer">Original ↗</a></p>)}</details>}
      {ready&&isDemo&&<button className="replay-button" onClick={()=>run('SNAPSHOT')}>Replay check ↺</button>}
     </div>}
    </div>
   </div>
   {error&&<div role="alert" className="inspection-error">{error} <button type="button" onClick={()=>input.current?.click()}>Choose another file ↗</button></div>}
  </section>}
  <input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);e.target.value=''}}/>
  <footer className="footer"><span>SEAL IS NOT AFFILIATED WITH ANY COURT.</span><span>Requested actions. Independent sources. No authenticity claim.</span></footer>
 </main>
}
