'use client';

import {useEffect,useRef,useState} from 'react';
import type {Claim} from '@/lib/types';

type PdfModule=typeof import('pdfjs-dist');
type LoadingTask=ReturnType<PdfModule['getDocument']>;
type PdfDocument=Awaited<LoadingTask['promise']>;
type PdfPage=Awaited<ReturnType<PdfDocument['getPage']>>;
type RenderTask=ReturnType<PdfPage['render']>;

async function restoreInvisibleText(page:PdfPage,context:CanvasRenderingContext2D,scale:number){
 const content=await page.getTextContent();
 const horizontal=content.items.filter((item):item is Extract<(typeof content.items)[number],{str:string}>=>'str' in item&&/[A-Za-z0-9]/.test(item.str)&&Math.abs(item.transform[1])<.01&&item.height>5);
 const first=horizontal.slice(0,10);
 let ink=0;
 for(const item of first){
  const x=Math.max(0,Math.floor(item.transform[4]*scale));
  const y=Math.max(0,Math.floor((page.view[3]-item.transform[5]-item.height)*scale));
  const width=Math.min(context.canvas.width-x,Math.max(1,Math.ceil(item.width*scale)));
  const height=Math.min(context.canvas.height-y,Math.max(1,Math.ceil(item.height*scale)));
  if(width<1||height<1)continue;
  const pixels=context.getImageData(x,y,width,height).data;
  for(let i=0;i<pixels.length;i+=4){
   if(pixels[i]<110&&pixels[i+1]<110&&pixels[i+2]<110&&pixels[i+3]>200)ink++;
  }
 }
 if(ink>40||!first.length)return;
 context.save();
 context.fillStyle='#242424';
 context.textBaseline='alphabetic';
 for(const item of horizontal){
  if(item.str.length>10&&item.str.replace(/[IiLl|1 ,.'r]/g,'').length<item.str.length*.15)continue;
  const fontSize=Math.hypot(item.transform[0],item.transform[1])*scale;
  if(fontSize<4||fontSize>80)continue;
  context.font=`${fontSize}px Arial, sans-serif`;
  context.fillText(item.str,item.transform[4]*scale,(page.view[3]-item.transform[5])*scale,Math.max(1,item.width*scale));
 }
 context.restore();
}

type Props={
 url:string;
 claims:Claim[];
 active:string;
 anchors:React.RefObject<Record<string,HTMLElement|null>>;
 onSelect:(id:string)=>void;
};

export default function PDFPreview({url,claims,active,anchors,onSelect}:Props){
 const canvas=useRef<HTMLCanvasElement>(null);
 const documentRef=useRef<PdfDocument|null>(null);
 const loadingTaskRef=useRef<LoadingTask|null>(null);
 const renderTaskRef=useRef<RenderTask|null>(null);
 const [documentVersion,setDocumentVersion]=useState(0);
 const [page,setPage]=useState(1);
 const [total,setTotal]=useState(1);
 const [error,setError]=useState('');
 const [rendering,setRendering]=useState(true);

 useEffect(()=>{
  let cancelled=false;
  documentRef.current=null;

  void (async()=>{
   let localTask:LoadingTask|null=null;
   let localDocument:PdfDocument|null=null;
   try{
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    localTask=pdfjs.getDocument({url,standardFontDataUrl:'/standard_fonts/',disableFontFace:true});
    loadingTaskRef.current=localTask;
    localDocument=await localTask.promise;

    if(cancelled){
     await localDocument.destroy().catch(()=>{});
     return;
    }

    documentRef.current=localDocument;
    loadingTaskRef.current=null;
    setTotal(localDocument.numPages);
    setDocumentVersion(version=>version+1);
   }catch(error){
    if(cancelled)return;
    const name=error&&typeof error==='object'&&'name' in error?String((error as {name?:unknown}).name):'';
    setError(name==='PasswordException'
     ?'This PDF is password protected and cannot be previewed here.'
     :'Could not open this PDF. Extracted text is still available in claim rows.');
    setRendering(false);
   }
  })();

  return()=>{
   cancelled=true;
   try{renderTaskRef.current?.cancel()}catch{}
   renderTaskRef.current=null;

   const doc=documentRef.current;
   documentRef.current=null;
   if(doc){
    void doc.destroy().catch(()=>{});
   }else{
    const task=loadingTaskRef.current;
    loadingTaskRef.current=null;
    if(task)void task.destroy().catch(()=>{});
   }
  };
 },[url]);

 useEffect(()=>{
  const doc=documentRef.current;
  if(!documentVersion||!doc)return;

  let cancelled=false;
  void (async()=>{
   let pdfPage:PdfPage|null=null;
   try{
    const requestedPage=Math.max(1,Math.min(page,doc.numPages));
    pdfPage=await doc.getPage(requestedPage);
    if(cancelled||documentRef.current!==doc)return;

    const c=canvas.current;
    if(!c)return;

    const base=pdfPage.getViewport({scale:1});
    const cssWidth=Math.max(280,c.parentElement?.clientWidth||base.width);
    const dpr=Math.min(1.5,window.devicePixelRatio||1);
    const desiredScale=Math.max(.85,(cssWidth/base.width)*dpr);
    const mobile=window.matchMedia('(max-width: 599px)').matches;
    const maxPixels=mobile?1_250_000:2_000_000;
    const pixelCap=Math.sqrt(maxPixels/(base.width*base.height));
    const renderScale=Math.min(1.55,desiredScale,pixelCap);
    const viewport=pdfPage.getViewport({scale:renderScale});

    c.width=Math.max(1,Math.round(viewport.width));
    c.height=Math.max(1,Math.round(viewport.height));
    const context=c.getContext('2d');
    if(!context)throw new Error('Canvas unavailable');

    const task=pdfPage.render({canvas:c,canvasContext:context,viewport});
    renderTaskRef.current=task;
    await task.promise;

    if(cancelled||documentRef.current!==doc)return;
    await restoreInvisibleText(pdfPage,context,renderScale);
    if(!cancelled&&documentRef.current===doc)setRendering(false);
   }catch(error){
    if(cancelled)return;
    const name=error&&typeof error==='object'&&'name' in error?String((error as {name?:unknown}).name):'';
    if(name==='RenderingCancelledException')return;
    setRendering(false);
    setError('Could not render this PDF page. Extracted text is still available in claim rows.');
   }finally{
    pdfPage?.cleanup();
    renderTaskRef.current=null;
   }
  })();

  return()=>{
   cancelled=true;
   try{renderTaskRef.current?.cancel()}catch{}
   renderTaskRef.current=null;
  };
 },[page,documentVersion]);

 useEffect(()=>()=> {
  const c=canvas.current;
  if(c){c.width=1;c.height=1}
 },[]);

 const changePage=(next:number)=>{
  const bounded=Math.max(1,Math.min(total,next));
  if(bounded===page)return;
  setRendering(true);
  setError('');
  setPage(bounded);
 };

 return <>
  {total>1&&<div className="pdf-toolbar">
   <button type="button" disabled={page<=1||rendering} onClick={()=>changePage(page-1)}>Previous</button>
   <span>Page {page} of {total}</span>
   <button type="button" disabled={page>=total||rendering} onClick={()=>changePage(page+1)}>Next</button>
  </div>}
  <div className="preview-box">
   {rendering&&<span className="pdf-rendering-note" role="status">Preparing document preview…</span>}
   <canvas ref={canvas} style={{width:'100%',height:'auto',display:'block'}} aria-label={`Uploaded PDF page ${page}`}/>
   {!rendering&&claims.filter(claim=>claim.source_bbox&&claim.page===page).map(claim=><button
    type="button"
    aria-label={`Select ${claim.label}`}
    onClick={()=>onSelect(claim.id)}
    key={claim.id}
    className={`bbox ${active===claim.id?'focused':''}`}
    style={{left:`${claim.source_bbox!.x*100}%`,top:`${claim.source_bbox!.y*100}%`,width:`${claim.source_bbox!.width*100}%`,height:`${claim.source_bbox!.height*100}%`}}
    ref={element=>{anchors.current[claim.id]=element}}
   />)}
  </div>
  {error&&<p role="alert">{error}</p>}
 </>;
}
