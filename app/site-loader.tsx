'use client';

import {useEffect,useState} from 'react';

type LoaderPhase='visible'|'exiting'|'gone';

export default function SiteLoader(){
 const [phase,setPhase]=useState<LoaderPhase>('visible');

 useEffect(()=>{
  const started=performance.now();
  let exitTimer:number|undefined;
  let removeTimer:number|undefined;
  let cancelled=false;

  const pageReady=new Promise<void>(resolve=>{
   if(document.readyState==='complete'){resolve();return}
   window.addEventListener('load',()=>resolve(),{once:true});
  });
  const fontsReady=document.fonts?.ready?.then(()=>undefined).catch(()=>undefined)??Promise.resolve();

  Promise.all([pageReady,fontsReady]).then(()=>{
   if(cancelled)return;
   const remaining=Math.max(0,420-(performance.now()-started));
   exitTimer=window.setTimeout(()=>{
    if(cancelled)return;
    setPhase('exiting');
    removeTimer=window.setTimeout(()=>{if(!cancelled)setPhase('gone')},280);
   },remaining);
  });

  return()=>{
   cancelled=true;
   if(exitTimer!==undefined)window.clearTimeout(exitTimer);
   if(removeTimer!==undefined)window.clearTimeout(removeTimer);
  };
 },[]);

 if(phase==='gone')return null;

 return <div className={`site-loader ${phase==='exiting'?'is-exiting':''}`} role="status" aria-live="polite" aria-label="Loading SEAL">
  <div className="site-loader-lockup" aria-hidden="true">
   <div className="site-loader-brand">
    <img src="/brand/seal-mark-black.svg" alt=""/>
    <span>SEAL</span>
   </div>
   <div className="site-loader-track"><span/></div>
  </div>
 </div>;
}
