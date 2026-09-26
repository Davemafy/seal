'use client';

import {useEffect,useRef,useState} from 'react';
import type {Claim} from '@/lib/types';

async function restoreInvisibleText(page:Awaited<ReturnType<Awaited<ReturnType<typeof import('pdfjs-dist')['getDocument']>['promise']>['getPage']>>,context:CanvasRenderingContext2D,scale:number){
 const content=await page.getTextContent();
 const horizontal=content.items.filter((item):item is Extract<(typeof content.items)[number],{str:string}>=>'str' in item&&/[A-Za-z0-9]/.test(item.str)&&Math.abs(item.transform[1])<.01&&item.height>5);
 const first=horizontal.slice(0,10);
 let ink=0;
 for(const item of first){
  const x=Math.max(0,Math.floor(item.transform[4]*scale)),y=Math.max(0,Math.floor((page.view[3]-item.transform[5]-item.height)*scale));
  const width=Math.min(context.canvas.width-x,Math.max(1,Math.ceil(item.width*scale))),height=Math.min(context.canvas.height-y,Math.max(1,Math.ceil(item.height*scale)));
  if(width<1||height<1)continue;
  const pixels=context.getImageData(x,y,width,height).data;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]<110&&pixels[i+1]<110&&pixels[i+2]<110&&pixels[i+3]>200)ink++;
 }
 if(ink>40||!first.length)return;
 context.save();context.fillStyle='#242424';context.textBaseline='alphabetic';
 for(const item of horizontal){
  if(item.str.length>10&&item.str.replace(/[IiLl|1 ,.'r]/g,'').length<item.str.length*.15)continue;
  const fontSize=Math.hypot(item.transform[0],item.transform[1])*scale;
  if(fontSize<4||fontSize>80)continue;
  context.font=`${fontSize}px Arial, sans-serif`;
  context.fillText(item.str,item.transform[4]*scale,(page.view[3]-item.transform[5])*scale,Math.max(1,item.width*scale));
 }
 context.restore();
}

export default function PDFPreview({url,claims,active,anchors,onSelect}:{url:string;claims:Claim[];active:string;anchors:React.RefObject<Record<string,HTMLElement|null>>;onSelect:(id:string)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const documentRef=useRef<any>(null);
 const loadingTaskRef=useRef<any>(null);
 const renderTaskRef=useRef<any>(null);
 const [documentVersion,setDocumentVersion]=useState(0);
 const [page,setPage]=useState(1);
 const [total,setTotal]=useState(1);
 const [error,setError]=useState('');
 const [rendering,setRendering]=useState(true);

 // Load the PDF document once per URL. Page navigation must not destroy/recreate
 // the document handle; doing that races pdf.js teardown against the next render.
 useEffect(()=>{
  let cancelled=false;
  setPage(1);
  setTotal(1);
  setRendering(true);
  setError('');
  setDocumentVersion(0);
  documentRef.current=null;

  void (async()=>{
   let localTask:any;
   let localDocument:any;
   try{
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    localTask=pdfjs.getDocument({url,standardFontDataUrl:'/standard_fonts/',disableFontFace:true});
    loadingTaskRef.current=localTask;
    localDocument=await localTask.promise;

    if(cancelled){
     try{await localDocument.destroy()}catch{}
     return;
    }

    documentRef.current=localDocument;
    loadingTaskRef.current=null;
    setTotal(localDocument.numPages);
    setDocumentVersion(version=>version+1);
   }catch(error){
    if(cancelled)return;
    const name=error&&typeof error==='object'&&'name' in error?String((error as {name?:unknown}).name):'';
    if(name==='PasswordException'){
     setError('This PDF is password protected and cannot be previewed here.');
    }else{
     setError('Could not open this PDF. Extracted text is still available in claim rows.');
    }
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
    void Promise.resolve(doc.destroy()).catch(()=>{});
   }else{
    const task=loadingTaskRef.current;
    loadingTaskRef.current=null;
    if(task)void Promise.resolve(task.destroy()).catch(()=>{});
   }
  };
 },[url]);

 // Render only the requested page. Changing page cancels the previous page render
 // but deliberately keeps the shared PDF document alive.
 useEffect(()=>{
  if(!documentVersion||!documentRef.current)return;

  let cancelled=false;
  const doc=documentRef.current;
  setRendering(true);
  setError('');

  void (async()=>{
   try{
    const requestedPage=Math.max(1,Math.min(page,doc.numPages));
    const pdfPage=await doc.getPage(requestedPage);
    if(cancelled||documentRef.current!==doc)return;

    const viewport=pdfPage.getViewport({scale:1.8});
    const c=canvas.current;
    if(!c||cancelled)return;

    c.width=viewport.width;
    c.height=viewport.height;
    const context=c.getContext('2d');
    if(!context)throw new Error('Canvas unavailable');

    const renderTask=pdfPage.render({canvas:c,canvasContext:context,viewport});
    renderTaskRef.current=renderTask;
    await renderTask.promise;

    if(cancelled||documentRef.current!==doc)return;
    await restoreInvisibleText(pdfPage,context,1.8);

    if(!cancelled&&documentRef.current===doc)setRendering(false);
   }catch(error){
    if(cancelled)return;
    const name=error&&typeof error==='object'&&'name' in error?String((error as {name?:unknown}).name):'';
    if(name==='RenderingCancelledException')return;
    setRendering(false);
    setError('Could not render this PDF page. Extracted text is still available in claim rows.');
   }finally{
    renderTaskRef.current=null;
   }
  })();

  return()=>{
   cancelled=true;
   try{renderTaskRef.current?.cancel()}catch{}
   renderTaskRef.current=null;
  };
 },[page,documentVersion]);

 return <>
  {total>1&&<div className="pdf-toolbar"><button type="button" disabled={page<=1||rendering} onClick={()=>setPage(current=>Math.max(1,current-1))}>Previous</button><span>Page {page} of {total}</span><button type="button" disabled={page>=total||rendering} onClick={()=>setPage(current=>Math.min(total,current+1))}>Next</button></div>}
  <div className="preview-box">
   {rendering&&<span className="pdf-rendering-note" role="status">Preparing document preview…</span>}
   <canvas ref={canvas} style={{width:'100%',height:'auto',display:'block'}} aria-label={`Uploaded PDF page ${page}`}/>
   {!rendering&&claims.filter(c=>c.source_bbox&&c.page===page).map(c=><button type="button" aria-label={`Select ${c.label}`} onClick={()=>onSelect(c.id)} key={c.id} className={`bbox ${active===c.id?'focused':''}`} style={{left:`${c.source_bbox!.x*100}%`,top:`${c.source_bbox!.y*100}%`,width:`${c.source_bbox!.width*100}%`,height:`${c.source_bbox!.height*100}%`}} ref={el=>{anchors.current[c.id]=el}}/>)}
  </div>
  {error&&<p role="alert">{error}</p>}
 </>;
}
