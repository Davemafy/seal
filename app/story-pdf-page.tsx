'use client';

import {useEffect,useRef,useState} from 'react';

type FocusBox={x:number;y:number;width:number;height:number};

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

export default function StoryPdfPage({url,focusBox}:{url:string;focusBox?:FocusBox}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [error,setError]=useState(false);

 useEffect(()=>{
  let cancelled=false;
  let loadingTask:{destroy:()=>void}|undefined;
  let documentHandle:{destroy:()=>void}|undefined;
  void (async()=>{
   try{
    const pdfjs=await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
    const loading=pdfjs.getDocument({url,standardFontDataUrl:'/standard_fonts/',disableFontFace:true});
    loadingTask=loading;
    const doc=await loading.promise;
    documentHandle=doc;
    if(cancelled){await doc.destroy();return}
    const page=await doc.getPage(1);
    const viewport=page.getViewport({scale:1.8});
    const target=canvas.current;
    if(!target||cancelled)return;
    target.width=viewport.width;target.height=viewport.height;
    const context=target.getContext('2d');
    if(!context)return;
    await page.render({canvas:target,canvasContext:context,viewport}).promise;
    if(!cancelled)await restoreInvisibleText(page,context,1.8);
   }catch{
    if(!cancelled)setError(true);
   }
  })();
  return()=>{cancelled=true;loadingTask?.destroy();void documentHandle?.destroy()};
 },[url]);

 return <div className="story-pdf-wrap">
  <canvas ref={canvas} aria-label="Your uploaded PDF, first page"/>
  {focusBox&&<span className="story-highlight" style={{left:`${focusBox.x*100}%`,top:`${focusBox.y*100}%`,width:`${focusBox.width*100}%`,height:`${focusBox.height*100}%`}}/>}
  {error&&<span className="story-pdf-error">PDF preview unavailable. The checked text remains available in Full evidence.</span>}
 </div>;
}
