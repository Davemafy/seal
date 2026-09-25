'use client';
import {useEffect,useRef,useState} from 'react';import type {Claim} from '@/lib/types';

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
 const canvas=useRef<HTMLCanvasElement>(null);const [page,setPage]=useState(1);const [total,setTotal]=useState(1);const [error,setError]=useState('');
 useEffect(()=>{let cancelled=false;let task:{destroy:()=>void}|undefined;(async()=>{try{const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';const loading=pdfjs.getDocument({url,standardFontDataUrl:'/standard_fonts/',disableFontFace:true});task=loading;const doc=await loading.promise;setTotal(doc.numPages);const p=await doc.getPage(page);const viewport=p.getViewport({scale:1.8});const c=canvas.current;if(!c||cancelled)return;c.width=viewport.width;c.height=viewport.height;const context=c.getContext('2d')!;await p.render({canvas:c,canvasContext:context,viewport}).promise;if(!cancelled)await restoreInvisibleText(p,context,1.8);}catch{if(!cancelled)setError('Could not render this PDF page. Extracted text is still available in claim rows.')}})();return()=>{cancelled=true;task?.destroy()}},[url,page]);
 return <><div className="pdf-toolbar"><button type="button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {page} of {total}</span><button type="button" disabled={page>=total} onClick={()=>setPage(p=>p+1)}>Next</button></div><div className="preview-box"><canvas ref={canvas} style={{width:'100%',height:'auto',display:'block'}} aria-label={`Uploaded PDF page ${page}`}/>{claims.filter(c=>c.source_bbox&&c.page===page).map(c=><button type="button" aria-label={`Select ${c.label}`} onClick={()=>onSelect(c.id)} key={c.id} className={`bbox ${active===c.id?'focused':''}`} style={{left:`${c.source_bbox!.x*100}%`,top:`${c.source_bbox!.y*100}%`,width:`${c.source_bbox!.width*100}%`,height:`${c.source_bbox!.height*100}%`}} ref={el=>{anchors.current[c.id]=el}}/>)}</div>{error&&<p role="alert">{error}</p>}</>
}
