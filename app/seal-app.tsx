'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import PDFPreview from './pdf-preview';
import {fixtures,type FixtureKey} from '@/lib/fixtures';
import {fallbackExtract,claimsFromExtraction} from '@/lib/extract';
import {readInBrowser,type BrowserDocument} from '@/lib/browser-file';
import type {Claim,Extraction,Result,Verification} from '@/lib/types';
import './workspace.css';

type Mode='SNAPSHOT'|'LIVE';
const verdictLabel=(value:Result['verdict'])=>value.replaceAll('_',' ');
const stateWord=(value:Result['verdict'])=>value==='MATCH'?'Matches':value==='MISMATCH'?'Contradicts':'Unverified';

export default function SealApp({initialDemo=false}:{initialDemo?:boolean}){
 const [hydrated,setHydrated]=useState(false);
 const [fixture,setFixture]=useState<FixtureKey>('riverside-mismatch-demo');
 const [text,setText]=useState(initialDemo?fixtures['riverside-mismatch-demo'].text:'');
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
 const isDemo=!file&&text.startsWith('DEMO / FICTIONAL NOTICE');
 const resultById=useMemo(()=>new Map(verification?.results.map(r=>[r.claim_id,r])||[]),[verification]);
 const current=claims.find(c=>c.id===selected)||claims[0];
 const currentResult=current&&resultById.get(current.id);
 const ready=Boolean(verification)&&revealed>=claims.length;
 const count=(v:Result['verdict'])=>verification?.results.filter(r=>r.verdict===v).length||0;
 const liveFailed=mode==='LIVE'&&verification?.resolver_id==='riverside'&&verification.results.some(r=>r.explanation==='Official source could not be reached during this check.');
 useEffect(()=>{const timer=window.setTimeout(()=>setHydrated(true),0);return()=>clearTimeout(timer)},[]);

 function clear(){runId.current++;if(file)URL.revokeObjectURL(file.preview);setFile(null);setText('');setClaims([]);setVerification(null);setStatus('');setError('');setBusy(false);setRevealed(0);setSelected('');setHovered('');setShowIndex(false);setMode('SNAPSHOT')}
 function chooseFixture(key:FixtureKey){clear();setFixture(key);setText(fixtures[key].text)}
 async function upload(uploaded:File){clear();setBusy(true);setStatus('Reading document');try{const doc=await readInBrowser(uploaded);setFile(doc);setText(doc.text);if(!doc.text.trim())setError('We couldn’t read enough of this notice to verify it reliably. Try a clearer copy.')}catch(e){setError(e instanceof Error?e.message:'Could not read this file.')}finally{setBusy(false);setStatus('')}}
 async function run(sourceMode:Mode=mode){
  const id=++runId.current;setBusy(true);setError('');setVerification(null);setRevealed(0);setSelected('');setMode(sourceMode);setStatus('Identifying claims');
  try{
   if(file?.uncertain){const unclear:Claim={id:'c1',type:'official',label:'Unreadable field',value:'Could not read confidently',exact_source_text:'Unreadable field',page:1};setClaims([unclear]);setExtractionMode('OCR / LOW CONFIDENCE');setVerification({results:[{claim_id:'c1',verdict:'COULD_NOT_VERIFY',explanation:'We couldn’t read this field confidently.',evidence:[],resolver_id:'ocr'}],resolver_id:'ocr'});setRevealed(1);setSelected('c1');return}
   let extraction:Extraction=fallbackExtract(text);let extractor='DETERMINISTIC';
   if(file){try{const response=await fetch('/api/extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(response.ok){const data=await response.json();extraction=data.extraction;extractor=data.mode}}catch{}}
   if(runId.current!==id)return;
   setExtractionMode(extractor);
   const found=claimsFromExtraction(extraction,text,file?.tokens||[]);
   if(!found.length)throw new Error('We couldn’t read enough of this notice to verify it reliably. Try a clearer copy.');
   setClaims(found);setStatus('Checking court sources');
   const response=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claims:found,court_name:extraction.court_name,mode:sourceMode})});
   if(!response.ok)throw new Error('The source check could not finish. Try again.');
   const checked=await response.json() as Verification;
   if(runId.current!==id)return;
   setVerification(checked);
   if(isDemo&&sourceMode==='SNAPSHOT'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const order=[0,1,2,4,7,5,3,6,8].filter(i=>i<found.length);
    for(let step=0;step<order.length;step++){await new Promise(resolve=>setTimeout(resolve,step===0?300:420));if(runId.current!==id)return;setSelected(found[order[step]].id);setRevealed(step+1)}
    setRevealed(found.length);setSelected(found[7]?.id||found[0].id);
   }else{setRevealed(found.length);setSelected(found.find(c=>checked.results.find(r=>r.claim_id===c.id)?.verdict==='MISMATCH')?.id||found[0].id)}
  }catch(e){if(runId.current===id)setError(e instanceof Error?e.message:'The source check could not finish.')}finally{if(runId.current===id){setBusy(false);setStatus('')}}
 }
 const select=useCallback((id:string)=>{if(!verification||!resultById.has(id))return;setSelected(id);setShowIndex(false)},[verification,resultById]);
 const active=hovered||selected;
 const positionTrace=useCallback(()=>{const root=stage.current,claim=anchors.current[active],target=evidenceAnchor.current;if(!root||!claim||!target||window.innerWidth<=760){setTrace('');return}const a=claim.getBoundingClientRect(),b=target.getBoundingClientRect(),c=root.getBoundingClientRect();const x=a.right-c.left+5,y=a.top+a.height/2-c.top,endX=b.left-c.left-13,endY=b.top+Math.min(b.height/2,48)-c.top;if(endX<=x){setTrace('');return}setTrace(`M ${x} ${y} C ${x+60} ${y}, ${endX-60} ${endY}, ${endX} ${endY}`)},[active]);
 useEffect(()=>{const observer=new ResizeObserver(positionTrace);if(stage.current)observer.observe(stage.current);window.addEventListener('resize',positionTrace);window.addEventListener('scroll',positionTrace,{passive:true});const timer=setTimeout(positionTrace,70);return()=>{observer.disconnect();window.removeEventListener('resize',positionTrace);window.removeEventListener('scroll',positionTrace);clearTimeout(timer)}},[positionTrace,verification,revealed]);
 useEffect(()=>{if(!verification)return;const onKey=(event:KeyboardEvent)=>{if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLButtonElement||event.target instanceof HTMLAnchorElement)return;if(event.key==='ArrowDown'||event.key==='ArrowRight'||event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();const index=claims.findIndex(c=>c.id===selected);const direction=event.key==='ArrowDown'||event.key==='ArrowRight'?1:-1;const next=Math.max(0,Math.min(claims.length-1,index+direction));select(claims[next].id)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[verification,claims,selected,select]);

 return <main className={text?'seal-has-document':''}>
  <header className="topbar"><Link href="/" className="wordmark">SEAL<span>®</span></Link><span className="topnote">INDEPENDENT NOTICE CHECKING <i/> EST. 2026</span><span className="index">01 / SOURCE FIRST</span></header>
  {!text?<section className="hero"><div className="eyebrow"><span className="dot"/> A DIFFERENT WAY TO READ A NOTICE</div><h1>The seal can be faked.<br/><em>The source can’t.</em></h1><p>Upload a court notice. SEAL checks its claims against independent official sources, one detail at a time.</p><div className="hero-actions"><button className="button primary" disabled={busy||!hydrated} onClick={()=>input.current?.click()}>{busy?status:"Verify a notice"} <span>↗</span></button><button className="button quiet" disabled={!hydrated} onClick={()=>chooseFixture('riverside-mismatch-demo')}>Try the demo notice <span>→</span></button></div>{error&&<div role="alert" className="inspection-error">{error}</div>}<div className="micro">PDF, JPG, PNG <span>·</span> No account. No document storage.</div><details className="privacy"><summary>How your document is handled</summary><p>Your file stays in this browser. When AI extraction is enabled, extracted text is sent to the configured model provider to structure claims. SEAL does not store the document or extracted claims.</p></details><div className="hero-illustration"><div className="paper-small"><span>THE DOCUMENT</span><strong>“Report to court<br/>and pay $50”</strong><span className="underline">A CLAIM IS NOT EVIDENCE</span></div><div className="paper-rule"/><div className="paper-small source-card"><span>THE INDEPENDENT SOURCE</span><strong>What does the<br/>court actually say?</strong><span className="underline">CHECK BEFORE YOU ACT</span></div></div></section>:
  <section className="inspection" onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();upload(e.dataTransfer.files[0])}}}>
   <div className="inspection-top"><div className="case-identity"><span className="case-kicker">SEAL / NOTICE REVIEW</span><h1>{isDemo?'Riverside notice':file?'Uploaded notice':'Notice'}</h1></div><div className="inspection-actions">{isDemo&&<select aria-label="Choose demo fixture" value={fixture} onChange={e=>chooseFixture(e.target.value as FixtureKey)}>{Object.entries(fixtures).map(([key,value])=><option value={key} key={key}>{value.title}</option>)}</select>}<button type="button" onClick={clear}>New notice <span>↗</span></button></div></div>
   <div className="inspection-meta"><span>{isDemo?'DEMO / FICTIONAL NOTICE':file?.kind==='pdf'?'PDF DOCUMENT':'IMAGE DOCUMENT'}</span><span>{mode==='LIVE'?'LIVE SOURCE CHECK':'SOURCE SNAPSHOT · 24 SEP 2026'}</span><span>{ready?`${claims.length} CLAIMS REVIEWED`:busy?status:'NOT YET CHECKED'}</span></div>
   {liveFailed&&<div className="source-failure" role="status"><span>Riverside’s live pages didn’t respond. These claims remain unverified.</span><button onClick={()=>run('LIVE')} disabled={busy}>Try again ↗</button></div>}
   <div className="inspection-stage" ref={stage}>
    <div className="document-zone"><div className="zone-caption"><span>01 / NOTICE</span><span>{isDemo?'FICTIONAL EXAMPLE':file?.kind==='pdf'?'ORIGINAL PDF':'ORIGINAL IMAGE'}</span></div><div className="document-paper">
      {isDemo?<><div className="notice-head"><span>DEMO / FICTIONAL NOTICE</span><span>FOR PRODUCT DEMONSTRATION ONLY</span></div><div className="notice-brand">JURY SERVICE <span>•</span> RESPONSE NOTICE</div><div className="notice-subtitle">Superior Court of California · County of Riverside</div><div className="notice-divider"/><div className="document-body">{text.split('\n').slice(1).map((line,i)=>{const claim=claims.find(c=>c.exact_source_text===line||line.includes(c.value));const result=claim&&resultById.get(claim.id);const shown=claim&&result&&(!isDemo||revealed>=claims.length||[0,1,2,4,7,5,3,6,8].slice(0,revealed).some(n=>claims[n]?.id===claim.id));const value=claim?.value||'';const at=claim?line.indexOf(value):-1;return <div className={`document-line ${claim?'document-has-claim':''}`} key={i}>{claim&&at>=0?<>{line.slice(0,at)}<button type="button" className={`document-claim ${shown?`state-${result!.verdict.toLowerCase()}`:''} ${active===claim.id?'is-active':''}`} aria-label={`${claim.label}: ${claim.value}${result?' — '+verdictLabel(result.verdict):''}`} aria-pressed={selected===claim.id} onClick={()=>select(claim.id)} onMouseEnter={()=>setHovered(claim.id)} onMouseLeave={()=>setHovered('')} ref={el=>{anchors.current[claim.id]=el}}><span className="claim-mark" aria-hidden="true">{shown?result!.verdict==='MATCH'?'✓':result!.verdict==='MISMATCH'?'!':'·':''}</span>{value}</button>{line.slice(at+value.length)}</>:line}</div>})}</div><div className="notice-end">This example uses fictional personal details and a generic visual mark. SEAL is not affiliated with any court.</div></>:
       file?.kind==='image'?<div className="preview-box"><img src={file.preview} alt="Uploaded notice"/>{claims.filter(c=>c.source_bbox&&c.page===1).map(c=><button type="button" key={c.id} aria-label={`Select ${c.label}`} className={`bbox ${active===c.id?'focused':''}`} style={{left:`${c.source_bbox!.x*100}%`,top:`${c.source_bbox!.y*100}%`,width:`${c.source_bbox!.width*100}%`,height:`${c.source_bbox!.height*100}%`}} onClick={()=>select(c.id)} ref={el=>{anchors.current[c.id]=el}}/>)}</div>:
       <PDFPreview url={file?.preview||''} claims={claims} active={active} anchors={anchors} onSelect={select}/>}
     </div></div>
    <svg className="single-trace" aria-hidden="true"><path d={trace}/></svg>
    <div className="evidence-rail"><div className="zone-caption"><span>02 / INDEPENDENT RECORD</span><span>{verification?`${revealed} OF ${claims.length}`:'AWAITING NOTICE CHECK'}</span></div>
     {!verification?<div className="awaiting"><span className="awaiting-symbol" aria-hidden="true">↗</span><h2>{busy?status:'Check what the notice says.'}</h2><p>{busy?'The notice has been read. SEAL is checking each extracted detail against a separate court source.':'The court name on a notice is still just a claim. Check it against the court itself.'}</p><button type="button" className="run-button" disabled={busy||!text.trim()||!hydrated} onClick={()=>run()}>{busy?'Checking sources…':'Check this notice'} <span>↗</span></button><div className="awaiting-note">{isDemo?'Uses a dated source snapshot for a repeatable demonstration.':'The file stays in this browser. Only extracted text is sent for claim structuring.'}</div></div>:
     <div className="evidence-content"><div className="review-progress">{ready?<><span>{claims.length} claims checked</span><div><strong>{count('MISMATCH')}</strong> contradict · <strong>{count('MATCH')}</strong> match · <strong>{count('COULD_NOT_VERIFY')}</strong> unverified</div></>:<span>Checking the notice · {revealed} of {claims.length}</span>}</div>
      {current&&currentResult?<div className="focused-evidence" ref={evidenceAnchor} aria-live="polite"><div className="focus-number"><span>{String(claims.findIndex(c=>c.id===current.id)+1).padStart(2,'0')} / {String(claims.length).padStart(2,'0')} &nbsp; {current.label.toUpperCase()}</span><span className={`state-text ${currentResult.verdict.toLowerCase()}`}>{verdictLabel(currentResult.verdict)}</span></div><div className="from-label">ON THE NOTICE</div><div className="claim-value">{current.value}</div><div className="focus-rule"/><div className="source-label">{currentResult.evidence.length?'INDEPENDENT COURT SOURCE':'WHAT WE CAN ESTABLISH'}</div>{currentResult.evidence.length?<>{currentResult.evidence.slice(0,currentResult.explanation==='Official sources currently disagree.'?undefined:1).map((e,i)=><div className="evidence-excerpt" key={`${e.url}-${i}`}><div className="source-name">{e.title}</div><div className="source-quote">“{e.excerpt}”</div><a className="official-link" href={e.url} target="_blank" rel="noopener noreferrer">Open official source <span>↗</span></a><div className="source-timestamp">{e.source_mode==='LIVE'?'LIVE OFFICIAL SOURCE':'SOURCE SNAPSHOT'} · {new Date(e.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div></div>)}{currentResult.evidence.length>1&&currentResult.explanation!=='Official sources currently disagree.'&&<details className="additional-sources"><summary>{currentResult.evidence.length-1} more source excerpt{currentResult.evidence.length>2?'s':''}</summary>{currentResult.evidence.slice(1).map((e,i)=><div key={i}><div>{e.title}</div><blockquote>{e.excerpt}</blockquote><a href={e.url} target="_blank" rel="noopener noreferrer">Open source ↗</a><div className="source-timestamp">{e.source_mode} · {new Date(e.checked_at).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})}</div></div>)}</details>}</>:<div className="no-source">{currentResult.explanation}</div>}<div className="why-line">{currentResult.evidence.length?currentResult.explanation:'This does not mean the detail is wrong.'}</div>{!currentResult.evidence.length&&<div className="source-timestamp">NO PUBLIC CONFIRMATION</div>}</div>:<div className="focused-evidence"><div className="source-label">CHECKING</div><p>Looking at the next detail in the notice.</p></div>}
      <div className="claim-index"><div className="index-title"><span>ALL DETAILS</span><button type="button" className="mobile-index-toggle" onClick={()=>setShowIndex(v=>!v)}>{showIndex?'Hide':'Show'} list {showIndex?'↑':'↓'}</button><span className="desktop-index-count">{claims.length}</span></div><div className={`claim-index-list ${showIndex?'mobile-open':''}`}>{claims.map((claim,i)=>{const result=resultById.get(claim.id);const shown=ready||[0,1,2,4,7,5,3,6,8].slice(0,revealed).some(n=>claims[n]?.id===claim.id);return <button type="button" key={claim.id} className={`index-item ${selected===claim.id?'selected':''}`} disabled={!result||!shown} onClick={()=>select(claim.id)}><span className="index-ordinal">{String(i+1).padStart(2,'0')}</span><span className="index-claim">{claim.label}</span><span className={`index-state ${result&&shown?result.verdict.toLowerCase():''}`}>{result&&shown?stateWord(result.verdict):'—'}</span></button>})}</div></div>
      {ready&&verification.contact&&<div className="court-contact"><div className="source-label">THE SAFEST NEXT STEP</div><h2>Confirm with the court itself.</h2><div className="contact-name">Riverside Jury Services</div><a className="contact-phone" href={`tel:${verification.contact.phone}`}>{verification.contact.phone} <span>↗</span></a><div className="contact-actions"><a href={verification.contact.website} target="_blank" rel="noopener noreferrer">Open court website ↗</a><button onClick={()=>run('LIVE')} disabled={busy}>Check live sources ↗</button></div><p>These contact details come from the court source, not the notice. {verification.contact.source.source_mode==='SNAPSHOT'?'Source snapshot checked 24 Sep 2026.':'Live source checked '+new Date(verification.contact.source.checked_at).toLocaleDateString('en-US')+'.'}</p></div>}
      {ready&&<details className="technical-record"><summary>Technical record <span>＋</span></summary><p>Extractor: {extractionMode} · Resolver: {verification.resolver_id} · Mode: {mode}</p>{verification.results.flatMap(r=>r.evidence).map((e,i)=><p key={i}>{e.title} · {e.source_mode} · {e.checked_at} · <a href={e.url} target="_blank" rel="noopener noreferrer">Original ↗</a></p>)}</details>}
      {ready&&isDemo&&<button className="replay-button" onClick={()=>run('SNAPSHOT')}>Replay check ↺</button>}
     </div>}
    </div>
   </div>
   {error&&<div role="alert" className="inspection-error">{error} <button type="button" onClick={()=>input.current?.click()}>Choose another file ↗</button></div>}
  </section>}
  <input ref={input} hidden type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);e.target.value=''}}/>
  <footer className="footer"><span>SEAL IS NOT AFFILIATED WITH ANY COURT.</span><span>Specific claims. Independent sources. No final legal judgment.</span></footer>
 </main>
}
