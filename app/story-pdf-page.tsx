'use client';

import {useEffect,useRef,useState} from 'react';

type FocusBox={x:number;y:number;width:number;height:number};
type Props={url:string;focusBox?:FocusBox;onReady?:()=>void;preloadOnly?:boolean};

const previewCache=new Map<string,string>();
const previewJobs=new Map<string,Promise<string>>();

async function restoreInvisibleText(page:any,context:CanvasRenderingContext2D,scale:number){
 const content=await page.getTextContent();
 const horizontal=content.items.filter((item:any)=>'str' in item&&/[A-Za-z0-9]/.test(item.str)&&Math.abs(item.transform[1])<.01&&item.height>5);
 const first=horizontal.slice(0,10);
 let ink=0;
 for(const item of first){
  const x=Math.max(0,Math.floor(item.transform[4]*scale));
  const y=Math.max(0,Math.floor((page.view[3]-item.transform[5]-item.height)*scale));
  const width=Math.min(context.canvas.width-x,Math.max(1,Math.ceil(item.width*scale)));
  const height=Math.min(context.canvas.height-y,Math.max(1,Math.ceil(item.height*scale)));
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

function renderFirstPage(url:string){
 const cached=previewCache.get(url);
 if(cached)return Promise.resolve(cached);
 const pending=previewJobs.get(url);
 if(pending)return pending;

 const job=(async()=>{
  let loadingTask:any;
  let documentHandle:any;
  try{
   const pdfjs=await import('pdfjs-dist');
   pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
   loadingTask=pdfjs.getDocument({url,standardFontDataUrl:'/standard_fonts/',disableFontFace:true});
   documentHandle=await loadingTask.promise;
   const page=await documentHandle.getPage(1);
   const viewport=page.getViewport({scale:1.8});
   const canvas=document.createElement('canvas');
   canvas.width=viewport.width;canvas.height=viewport.height;
   const context=canvas.getContext('2d');
   if(!context)throw new Error('Canvas unavailable');
   await page.render({canvas,canvasContext:context,viewport}).promise;
   await restoreInvisibleText(page,context,1.8);
   const dataUrl=canvas.toDataURL('image/png');
   previewCache.set(url,dataUrl);
   return dataUrl;
  }finally{
   if(documentHandle){
    try{await documentHandle.destroy()}catch{}
   }else if(loadingTask){
    try{await loadingTask.destroy()}catch{}
   }
  }
 })();

 previewJobs.set(url,job);
 void job.finally(()=>previewJobs.delete(url)).catch(()=>{});
 return job;
}

export default function StoryPdfPage({url,focusBox,onReady,preloadOnly=false}:Props){
 const [preview,setPreview]=useState(()=>previewCache.get(url)||'');
 const [error,setError]=useState(false);
 const readyCallback=useRef(onReady);
 readyCallback.current=onReady;

 useEffect(()=>{
  let mounted=true;
  setError(false);
  const cached=previewCache.get(url);
  if(cached){
   setPreview(cached);
   readyCallback.current?.();
   return()=>{mounted=false};
  }
  void renderFirstPage(url).then(dataUrl=>{
   if(!mounted)return;
   setPreview(dataUrl);
   readyCallback.current?.();
  }).catch(()=>{if(mounted)setError(true)});
  return()=>{mounted=false};
 },[url]);

 if(preloadOnly)return null;

 return <div className="story-pdf-wrap" style={{transformOrigin:focusBox?`${(focusBox.x+focusBox.width/2)*100}% ${(focusBox.y+focusBox.height/2)*100}%`:'50% 50%'}}>
  {preview&&<img src={preview} alt="Your uploaded PDF, first page"/>}
  {focusBox&&preview&&<span className="story-highlight"/>}
  {error&&<span className="story-pdf-error">PDF preview unavailable. The checked text remains available in Full evidence.</span>}
 </div>;
}
