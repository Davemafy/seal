'use client';

import {useEffect,useRef,useState} from 'react';

export default function PdfThumb({id,alt}:{id:string;alt:string}){
 const host=useRef<HTMLDivElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null);
 const [failed,setFailed]=useState(false);

 useEffect(()=>{
  let cancelled=false;
  let task:{destroy:()=>Promise<void>}|undefined;

  async function render(){
   try{
    const response=await fetch(`/api/browse-asset?id=${encodeURIComponent(id)}`);
    if(!response.ok)throw new Error('Preview unavailable');
    const bytes=await response.arrayBuffer();
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    const loading=pdfjs.getDocument({data:bytes});
    const pdf=await loading.promise;
    task={destroy:()=>pdf.destroy()};
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
    await page.render({canvas:target,canvasContext:context,viewport}).promise;
   }catch{
    if(!cancelled)setFailed(true);
   }
  }

  void render();
  return()=>{cancelled=true;void task?.destroy()};
 },[id]);

 return <div className={`pdf-thumb ${failed?'has-failed':''}`} ref={host}>
  <canvas ref={canvas} role="img" aria-label={alt}/>
  {failed&&<div className="pdf-thumb-fallback"><span>Preview unavailable</span><small>The original source is still available.</small></div>}
 </div>;
}
