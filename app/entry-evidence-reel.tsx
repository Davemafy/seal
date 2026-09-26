'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {browseCases} from '@/lib/browse-cases';

type PlayState='idle'|'playing'|'paused'|'ended';

const caseItem=
 browseCases.find(item=>item.preview.type==='image'&&/scam/i.test(item.classification))
 ||browseCases.find(item=>item.preview.type==='image')
 ||browseCases[0];

function decisionInstruction(value:string){
 const lines=value.split(/\n/).map(line=>line.trim()).filter(Boolean);
 return lines.find(line=>/\bscan\b[^.]{0,140}\bqr\b/i.test(line))
  ||lines.find(line=>/\b(?:remit|pay|payment)\b/i.test(line))
  ||lines.find(line=>/\bappear\b/i.test(line))
  ||'Review the instruction before you act.';
}

export default function EntryEvidenceReel(){
 const [assetReady,setAssetReady]=useState(false);
 const [assetFailed,setAssetFailed]=useState(false);
 const [playState,setPlayState]=useState<PlayState>('idle');
 const root=useRef<HTMLElement>(null);
 const documentRef=useRef<HTMLDivElement>(null);
 const claimRef=useRef<HTMLDivElement>(null);
 const evidenceRef=useRef<HTMLDivElement>(null);
 const limitationRef=useRef<HTMLDivElement>(null);
 const actionRef=useRef<HTMLDivElement>(null);
 const progressRef=useRef<HTMLSpanElement>(null);
 const timelineRef=useRef<ReturnType<typeof gsap.timeline>|null>(null);

 const instruction=decisionInstruction(caseItem.runText);

 const setStatic=useCallback(()=>{
  const nodes=[claimRef.current,evidenceRef.current,limitationRef.current,actionRef.current].filter(Boolean);
  gsap.set(documentRef.current,{x:0,y:0,scale:1,opacity:1,clearProps:'filter'});
  gsap.set(nodes,{opacity:1,y:0});
  gsap.set(progressRef.current,{scaleX:0,transformOrigin:'left center'});
 },[]);

 useEffect(()=>{
  setStatic();
  return()=>timelineRef.current?.kill();
 },[setStatic]);

 const start=useCallback(()=>{
  if(!assetReady||assetFailed)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const document=documentRef.current;
  const claim=claimRef.current;
  const evidence=evidenceRef.current;
  const limitation=limitationRef.current;
  const action=actionRef.current;
  const progress=progressRef.current;
  if(!document||!claim||!evidence||!limitation||!action||!progress)return;

  timelineRef.current?.kill();
  const tl=gsap.timeline({
   paused:true,
   defaults:{ease:'expo.out',overwrite:'auto'},
   onStart:()=>setPlayState('playing'),
   onComplete:()=>setPlayState('ended')
  });
  timelineRef.current=tl;

  gsap.set(document,{x:0,y:0,scale:1,opacity:1,transformOrigin:'50% 62%'});
  gsap.set([claim,evidence,limitation,action],{opacity:0,y:reduced?0:6});
  gsap.set(progress,{scaleX:0,transformOrigin:'left center'});

  tl.to(progress,{scaleX:1,duration:12.5,ease:'none'},0);
  if(!reduced)tl.to(document,{scale:1.035,y:-2,duration:1.9},1.45);
  tl.to(claim,{opacity:1,y:0,duration:reduced?.15:.38},1.95);
  tl.to(evidence,{opacity:1,y:0,duration:reduced?.15:.4},4.35);
  tl.to(limitation,{opacity:1,y:0,duration:reduced?.15:.4},7.05);
  tl.to(action,{opacity:1,y:0,duration:reduced?.15:.42},9.55);
  if(!reduced)tl.to(document,{scale:1.012,y:0,duration:.65},9.45);

  tl.play(0);
 },[assetReady,assetFailed]);

 const toggle=()=>{
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

 if(assetFailed)return null;

 return <section ref={root} className="entry-evidence-reel" aria-labelledby="entry-evidence-title">
  <div className="entry-evidence-head">
   <div>
    <span>Real source example</span>
    <h2 id="entry-evidence-title">See SEAL check a real notice</h2>
   </div>
   <small>12 sec</small>
  </div>

  <div className="entry-evidence-stage">
   <div className="entry-evidence-document-shell" ref={documentRef}>
    {!assetReady&&<div className="entry-evidence-skeleton" aria-hidden="true"><span/><span/><span/><span/></div>}
    <img
     src={`/api/browse-asset?id=${encodeURIComponent(caseItem.id)}`}
     alt={caseItem.preview.alt}
     onLoad={()=>setAssetReady(true)}
     onError={()=>setAssetFailed(true)}
    />
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

    <div className="entry-evidence-row" ref={limitationRef}>
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
    <button type="button" onClick={toggle} disabled={!assetReady}>
     {playState==='playing'?'Pause':playState==='paused'?'Resume':playState==='ended'?'Replay':'Play 12s example'}
    </button>
    <a href={`/?case=${encodeURIComponent(caseItem.id)}`}>Run this case <span aria-hidden="true">→</span></a>
   </div>
   <div className="entry-evidence-progress" aria-hidden="true"><span ref={progressRef}/></div>
  </div>
 </section>;
}
