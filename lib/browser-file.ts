import type {Token} from './types';

export type UnreadableField={type:'phone'|'url'|'information';label:string;page:number;source_bbox:{x:number;y:number;width:number;height:number}};
export type BrowserDocument={text:string;tokens:Token[];preview:string;kind:'image'|'pdf';uncertain:boolean;sample:boolean;ocrConfidence?:number;unreadableFields:UnreadableField[]};

export function ocrScaleForSize(width:number,height:number){
 if(!width||!height)return 1;
 const desired=Math.max(1600/width,2000/height,1);
 return Math.min(3.5,desired);
}

export async function readInBrowser(file:File):Promise<BrowserDocument>{
 if(file.size>16_000_000)throw new Error('Maximum file size is 16 MB.');
 if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Choose a PDF, JPG, or PNG.');
 const preview=URL.createObjectURL(file);
 if(file.type==='application/pdf'){
  const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
  const doc=await pdfjs.getDocument({data:await file.arrayBuffer(),standardFontDataUrl:'/standard_fonts/',useSystemFonts:true}).promise;const pages:string[]=[];const tokens:Token[]=[];let sample=false;
  for(let i=1;i<=Math.min(doc.numPages,8);i++){
   const page=await doc.getPage(i);const viewport=page.getViewport({scale:1});const content=await page.getTextContent();let pageText='';
   for(const item of content.items){
    if(!('str' in item))continue;
    const str=item.str as string;const offset=pages.join('\n').length+pageText.length;const transform=item.transform as number[];
    if(/^sample$/i.test(str.trim())&&Math.hypot(transform[0],transform[1])>30)sample=true;
    const x=transform[4]/viewport.width,y=1-(transform[5]+(item.height as number))/viewport.height;
    tokens.push({page:i,text:str,x,y,width:(item.width as number)/viewport.width,height:(item.height as number)/viewport.height,start:offset,end:offset+str.length,confidence:100});
    pageText+=str+(item.hasEOL?'\n':' ');
   }
   pages.push(pageText.trim());
  }
  const text=pages.join('\n');if(text.trim().length>20)return {text,tokens,preview,kind:'pdf',uncertain:false,sample,unreadableFields:[]};
  const page=await doc.getPage(1);const viewport=page.getViewport({scale:2});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;
  const recognized=await ocr(canvas);return {...recognized,preview,kind:'pdf',sample};
 }
 const image=new Image();image.src=preview;await image.decode();return {...await ocr(normalizeForOcr(image)),preview,kind:'image',sample:false};
}

function normalizeForOcr(image:HTMLImageElement){
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,scale=ocrScaleForSize(width,height);
 if(scale===1)return image;
 const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.filter='grayscale(1) contrast(1.12)';ctx.drawImage(image,0,0,canvas.width,canvas.height);ctx.filter='none';
 return canvas;
}

async function ocr(image:HTMLImageElement|HTMLCanvasElement):Promise<Omit<BrowserDocument,'preview'|'kind'|'sample'>>{
 const {createWorker}=await import('tesseract.js');const worker=await createWorker('eng');
 try{
  const r=await worker.recognize(image,{}, {text:true,blocks:true});
  const width=('naturalWidth' in image?image.naturalWidth:image.width)||1,height=('naturalHeight' in image?image.naturalHeight:image.height)||1;
  const tokens:Token[]=[];const lines:string[]=[];let offset=0;
  for(const block of r.data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
   const words=line.words||[];const lineText=words.map(word=>word.text).join(' ').trim();
   if(!lineText)continue;
   let localOffset=0;
   for(const word of words){
    const box=word.bbox,text=word.text||'';const start=offset+localOffset;
    tokens.push({page:1,text,x:box.x0/width,y:box.y0/height,width:(box.x1-box.x0)/width,height:(box.y1-box.y0)/height,start,end:start+text.length,confidence:Number(word.confidence||0)});
    localOffset+=text.length+1;
   }
   lines.push(lineText);offset+=lineText.length+1;
  }
  const text=lines.join('\n').trim();
  return {text,tokens,uncertain:text.length<20,ocrConfidence:r.data.confidence,unreadableFields:[]};
 }finally{await worker.terminate();}
}
