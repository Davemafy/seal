'use client';

import {useEffect,useRef,useState} from 'react';

function Skeleton(){
 return <div className="case-media-skeleton" aria-hidden="true">
  <span className="skeleton-line is-wide"/>
  <span className="skeleton-line"/>
  <span className="skeleton-line is-short"/>
  <span className="skeleton-block"/>
 </div>;
}

export default function PdfThumb({id,alt,priority=false}:{id:string;alt:string;priority?:boolean}){
 const host=useRef<HTMLDivElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null);
 const [failed,setFailed]=useState(false);
 const [ready,setReady]=useState(false);
 const [visible,setVisible]=useState(priority);

 useEffect(()=>{
  if(priority)return;
  const node=host.current;
  if(!node)return;
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    setVisible(true);
    observer.disconnect();
   }
  },{rootMargin:'480px 0px'});
  observer.observe(node);
  return()=>observer.disconnect();
 },[priority]);

 useEffect(()=>{
  if(!visible)return;
  let cancelled=false;
  let task:{destroy:()=>Promise<void>}|undefined;
  let renderTask:{promise:Promise<void>;cancel?:()=>void}|undefined;

  async function render(){
   setFailed(false);
   setReady(false);
   try{
    const response=await fetch(`/api/browse-asset?id=${encodeURIComponent(id)}`);
    if(!response.ok)throw new Error('Preview unavailable');
    const bytes=await response.arrayBuffer();
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    const loading=pdfjs.getDocument({data:bytes});
    task=loading;
    const pdf=await loading.promise;
    const page=await pdf.getPage(1);
    if(cancelled)return;
    const base=page.getViewport({scale:1});
    const width=Math.max(300,host.current?.clientWidth||560);
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const viewport=page.getViewport({scale:(width/base.width)*dpr});
    const target=canvas.current;
    if(!target)return;
    target.width=Math.round(viewport.width);
    target.height=Math.round(viewport.height);
    target.style.width=`${width}px`;
    target.style.height=`${viewport.height/dpr}px`;
    const context=target.getContext('2d');
    if(!context)throw new Error('Canvas unavailable');
    renderTask=page.render({canvas:target,canvasContext:context,viewport});
    await renderTask.promise;
    if(!cancelled)setReady(true);
   }catch(error){
    if(cancelled)return;
    const name=error&&typeof error==='object'&&'name' in error?String((error as {name?:unknown}).name):'';
    if(name==='RenderingCancelledException')return;
    setFailed(true);
   }
  }

  void render();
  return()=>{
   cancelled=true;
   try{renderTask?.cancel?.()}catch{}
   void task?.destroy();
  };
 },[id,visible]);

 return <div className={`pdf-thumb ${ready?'is-ready':''} ${failed?'has-failed':''}`} ref={host}>
  {!ready&&!failed&&<Skeleton/>}
  <canvas ref={canvas} role="img" aria-label={alt}/>
  {failed&&<div className="pdf-thumb-fallback"><span>Preview unavailable</span><small>The original source is still available.</small></div>}
 </div>;
}
