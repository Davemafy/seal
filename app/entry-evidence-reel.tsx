'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {browseCases} from '@/lib/browse-cases';

type PlayState='idle'|'playing'|'paused'|'ended';

const caseItem=browseCases.find(item=>item.featured)||browseCases[0];
const instructionFrom=(value:string)=>{
 const lines=value.split(/\n/).map(line=>line.trim()).filter(Boolean);
 return lines.find(line=>/\bscan\b[^.]{0,120}\bqr\b/i.test(line))
  ||lines.find(line=>/\b(?:remit|pay|payment)\b/i.test(line))
  ||lines.find(line=>/\bappear\b/i.test(line))
  ||'Review the instruction before you act.';
};

export default function EntryEvidenceReel(){
 const [previewReady,setPreviewReady]=useState(false);
 const [previewFailed,setPreviewFailed]=useState(false);
 const [imageUrl,setImageUrl]=useState('');
 const [playState,setPlayState]=useState<PlayState>('idle');
 const host=useRef<HTMLDivElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null);
 const documentRef=useRef<HTMLDivElement>(null);
 const claimRef=useRef<HTMLDivElement>(null);
 const evidenceRef=useRef<HTMLDivElement>(null);
 const limitationRef=useRef<HTMLDivElement>(null);
 const actionRef=useRef<HTMLDivElement>(null);
 const progressRef=useRef<HTMLSpanElement>(null);
 const timelineRef=useRef<ReturnType<typeof gsap.timeline>|null>(null);

 const instruction=instructionFrom(caseItem.runText);

 useEffect(()=>{
  let cancelled=false;
  let timeout=0;
  let loadingTask:{destroy:()=>Promise<void>}|undefined;
  let pdf:{destroy:()=>Promise<void>}|undefined;
  let renderTask:{promise:Promise<void>;cancel:()=>void}|undefined;
  let objectUrl='';

  const render=async()=>{
   try{
    const response=await fetch(`/api/browse-asset?id=${encodeURIComponent(caseItem.id)}`);
    if(!response.ok)throw new Error('Preview unavailable');
    const blob=await response.blob();
    if(cancelled)return;

    if(caseItem.preview.type==='image'){
     objectUrl=URL.createObjectURL(blob);
     setImageUrl(objectUrl);
     setPreviewReady(true);
     return;
    }

    const bytes=await blob.arrayBuffer();
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    const task=pdfjs.getDocument({data:bytes});
    loadingTask=task;
    const loaded=await task.promise;
    pdf=loaded;
    const page=await loaded.getPage(1);
    if(cancelled)return;
    const base=page.getViewport({scale:1});
    const width=Math.max(260,Math.min(390,host.current?.clientWidth||340));
    const dpr=Math.min(1.6,window.devicePixelRatio||1);
    const viewport=page.getViewport({scale:(width/base.width)*dpr});
    const target=canvas.current;
    if(!target)throw new Error('Canvas unavailable');
    target.width=Math.round(viewport.width);
    target.height=Math.round(viewport.height);
    target.style.width=`${width}px`;
    target.style.height=`${viewport.height/dpr}px`;
    const context=target.getContext('2d');
    if(!context)throw new Error('Canvas unavailable');
    const activeRender=page.render({canvas:target,canvasContext:context,viewport});
    renderTask=activeRender;
    await activeRender.promise;
    if(!cancelled)setPreviewReady(true);
    await loaded.destroy().catch(()=>{});
    pdf=undefined;
    loadingTask=undefined;
   }catch{
    if(!cancelled)setPreviewFailed(true);
   }
  };

  timeout=window.setTimeout(()=>{void render()},120);
  return()=>{
   cancelled=true;
   window.clearTimeout(timeout);
   try{renderTask?.cancel()}catch{}
   if(objectUrl)URL.revokeObjectURL(objectUrl);
   void pdf?.destroy().catch(()=>{});
   if(!pdf)void loadingTask?.destroy().catch(()=>{});
  };
 },[]);

 useEffect(()=>()=>timelineRef.current?.kill(),[]);

 const showStatic=useCallback(()=>{
  const targets=[claimRef.current,evidenceRef.current,limitationRef.current,actionRef.current].filter(Boolean);
  gsap.set(documentRef.current,{xPercent:0,scale:1,opacity:1});
  gsap.set(targets,{opacity:1,y:0});
  gsap.set(progressRef.current,{scaleX:0,transformOrigin:'left center'});
 },[]);

 const start=useCallback(()=>{
  if(!previewReady)return;
  timelineRef.current?.kill();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const claim=claimRef.current,evidence=evidenceRef.current,limit=limitationRef.current,action=actionRef.current;
  const document=documentRef.current,progress=progressRef.current;
  if(!claim||!evidence||!limit||!action||!document||!progress)return;

  const tl=gsap.timeline({
   paused:true,
   defaults:{ease:'expo.out',overwrite:'auto'},
   onStart:()=>setPlayState('playing'),
   onComplete:()=>setPlayState('ended')
  });
  timelineRef.current=tl;

  gsap.set(document,{xPercent:0,scale:1,opacity:1,transformOrigin:'50% 50%'});
  gsap.set([claim,evidence,limit,action],{opacity:0,y:reduced?0:7});
  gsap.set(progress,{scaleX:0,transformOrigin:'left center'});

  tl.to(progress,{scaleX:1,duration:13,ease:'none'},0);
  if(!reduced)tl.to(document,{xPercent:-1.5,scale:1.025,duration:2.1},1.55);
  tl.to(claim,{opacity:1,y:0,duration:reduced?.16:.42},2.0);
  tl.to(evidence,{opacity:1,y:0,duration:reduced?.16:.44},4.45);
  tl.to(limit,{opacity:1,y:0,duration:reduced?.16:.42},7.35);
  tl.to(action,{opacity:1,y:0,duration:reduced?.16:.46},9.9);
  if(!reduced)tl.to(document,{xPercent:-.5,scale:1.012,duration:.72},9.75);

  tl.play(0);
 },[previewReady]);

 const togglePlayback=()=>{
  const timeline=timelineRef.current;
  if(playState==='playing'&&timeline){
   timeline.pause();
   setPlayState('paused');
   return;
  }
  if(playState==='paused'&&timeline){
   timeline.play();
   setPlayState('playing');
   return;
  }
  start();
 };

 useEffect(()=>{
  if(playState==='idle')showStatic();
 },[playState,showStatic]);

 if(previewFailed)return null;

 return <section className="entry-evidence-reel" aria-labelledby="entry-evidence-title">
  <div className="entry-evidence-head">
   <div>
    <span className="entry-evidence-kicker">Real source artifact</span>
    <h2 id="entry-evidence-title">See SEAL check a real notice</h2>
   </div>
   <span className="entry-evidence-runtime">13 sec</span>
  </div>

  <div className="entry-evidence-stage">
   <div className="entry-evidence-document-shell" ref={documentRef}>
    <div className="entry-evidence-document" ref={host}>
     {!previewReady&&<div className="entry-evidence-skeleton" aria-hidden="true">
      <span/><span/><span/><span/><span/>
     </div>}
     {caseItem.preview.type==='pdf'
      ?<canvas ref={canvas} className={previewReady?'is-ready':''} role="img" aria-label={caseItem.preview.alt}/>
      :imageUrl&&<img className={previewReady?'is-ready':''} src={imageUrl} alt={caseItem.preview.alt}/>}
    </div>
   </div>

   <div className="entry-evidence-copy">
    <div className="entry-evidence-row entry-evidence-claim" ref={claimRef}>
     <span>From the message</span>
     <strong>{instruction}</strong>
    </div>

    <div className="entry-evidence-row" ref={evidenceRef}>
     <span>Official pattern evidence</span>
     <strong>{caseItem.sourceTitle}</strong>
     <small>{caseItem.issuer} · {caseItem.classification}</small>
    </div>

    <div className="entry-evidence-row entry-evidence-limit" ref={limitationRef}>
     <span>Direct case confirmation</span>
     <strong>Not established by this source artifact.</strong>
    </div>

    <div className="entry-evidence-row entry-evidence-action" ref={actionRef}>
     <span>Safest next step</span>
     <strong>Verify independently before paying.</strong>
    </div>
   </div>
  </div>

  <div className="entry-evidence-controls">
   <div className="entry-evidence-control-actions">
    <button type="button" onClick={togglePlayback} disabled={!previewReady}>
     {playState==='playing'?'Pause':playState==='paused'?'Resume':playState==='ended'?'Replay':'Play 13s example'}
    </button>
    <a href={`/?case=${encodeURIComponent(caseItem.id)}`}>Run this case <span aria-hidden="true">→</span></a>
   </div>
   <div className="entry-evidence-progress" aria-hidden="true"><span ref={progressRef}/></div>
  </div>
 </section>;
}
