'use client';

import {useEffect,useRef,useState} from 'react';

type PdfModule=typeof import('pdfjs-dist');
type LoadingTask=ReturnType<PdfModule['getDocument']>;
type PdfDocument=Awaited<LoadingTask['promise']>;
type PdfPage=Awaited<ReturnType<PdfDocument['getPage']>>;

type FocusBox={x:number;y:number;width:number;height:number};
type Props={url:string;focusBox?:FocusBox;onReady?:()=>void};

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

async function renderFirstPage(url:string){
 let loadingTask:LoadingTask|null=null;
 let documentHandle:PdfDocument|null=null;
 let page:PdfPage|null=null;
 let objectUrl='';
 let canvas:HTMLCanvasElement|null=null;

 try{
  const pdfjs=await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
  loadingTask=pdfjs.getDocument({url,standardFontDataUrl:'/standard_fonts/',disableFontFace:true});
  documentHandle=await loadingTask.promise;
  page=await documentHandle.getPage(1);
  const base=page.getViewport({scale:1});
  const mobile=window.matchMedia('(max-width: 599px)').matches;
  const maxPixels=mobile?900_000:1_500_000;
  const scale=Math.min(1.45,Math.sqrt(maxPixels/(base.width*base.height)));
  const viewport=page.getViewport({scale});

  canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(viewport.width));
  canvas.height=Math.max(1,Math.round(viewport.height));
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Canvas unavailable');

  await page.render({canvas,canvasContext:context,viewport}).promise;
  await restoreInvisibleText(page,context,scale);
  const blob=await new Promise<Blob>((resolve,reject)=>{
   canvas!.toBlob(value=>value?resolve(value):reject(new Error('Could not encode preview.')),'image/jpeg',.86);
  });
  objectUrl=URL.createObjectURL(blob);
  return objectUrl;
 }catch(error){
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  throw error;
 }finally{
  page?.cleanup();
  if(canvas){canvas.width=1;canvas.height=1}
  if(documentHandle){
   await documentHandle.destroy().catch(()=>{});
  }else if(loadingTask){
   await loadingTask.destroy().catch(()=>{});
  }
 }
}

export default function StoryPdfPage({url,focusBox,onReady}:Props){
 const [preview,setPreview]=useState('');
 const [error,setError]=useState(false);
 const readyCallback=useRef(onReady);

 useEffect(()=>{
  readyCallback.current=onReady;
 },[onReady]);

 useEffect(()=>{
  let mounted=true;
  let created='';

  void renderFirstPage(url).then(next=>{
   created=next;
   if(!mounted){
    URL.revokeObjectURL(next);
    return;
   }
   setPreview(next);
   readyCallback.current?.();
  }).catch(()=>{
   if(mounted)setError(true);
  });

  return()=>{
   mounted=false;
   if(created)URL.revokeObjectURL(created);
  };
 },[url]);

 return <div className="story-pdf-wrap" style={{transformOrigin:focusBox?`${(focusBox.x+focusBox.width/2)*100}% ${(focusBox.y+focusBox.height/2)*100}%`:'50% 50%'}}>
  {!preview&&!error&&<span className="story-pdf-loading">Opening document…</span>}
  {preview&&<img data-story-artifact src={preview} alt="Your uploaded PDF, first page"/>}
  {focusBox&&preview&&<span className="story-highlight"/>}
  {error&&<span className="story-pdf-error">PDF preview unavailable. The checked text remains available in Full evidence.</span>}
 </div>;
}
