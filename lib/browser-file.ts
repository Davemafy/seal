import type {Token} from './types';
export type BrowserDocument={text:string;tokens:Token[];preview:string;kind:'image'|'pdf';uncertain:boolean;sample:boolean};
export async function readInBrowser(file:File):Promise<BrowserDocument>{
 if(file.size>16_000_000)throw new Error('Maximum file size is 16 MB.');
 if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Choose a PDF, JPG, or PNG.');
 const preview=URL.createObjectURL(file);
 if(file.type==='application/pdf'){
  const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
  const doc=await pdfjs.getDocument({data:await file.arrayBuffer(),standardFontDataUrl:'/standard_fonts/',useSystemFonts:true}).promise;const pages:string[]=[];const tokens:Token[]=[];let sample=false;
  for(let i=1;i<=Math.min(doc.numPages,8);i++){
   const page=await doc.getPage(i);const viewport=page.getViewport({scale:1});const content=await page.getTextContent();let pageText='';
   for(const item of content.items){if(!('str' in item))continue;const str=item.str as string;const offset=pages.join('\n').length+pageText.length;const transform=item.transform as number[];if(/^sample$/i.test(str.trim())&&Math.hypot(transform[0],transform[1])>30)sample=true;const x=transform[4]/viewport.width,y=1-(transform[5]+(item.height as number))/viewport.height;tokens.push({page:i,text:str,x,y,width:(item.width as number)/viewport.width,height:(item.height as number)/viewport.height,start:offset,end:offset+str.length});pageText+=str+(item.hasEOL?'\n':' ');}
   pages.push(pageText.trim());
  }
  const text=pages.join('\n');if(text.trim().length>20)return {text,tokens,preview,kind:'pdf',uncertain:false,sample};
  const page=await doc.getPage(1);const viewport=page.getViewport({scale:1.5});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;
  const recognized=await ocr(canvas);return {...recognized,preview,kind:'pdf',sample};
 }
 const image=new Image();image.src=preview;await image.decode();return {...await ocr(image),preview,kind:'image',sample:false};
}
async function ocr(image:HTMLImageElement|HTMLCanvasElement):Promise<Omit<BrowserDocument,'preview'|'kind'|'sample'>>{
 const {createWorker}=await import('tesseract.js');const worker=await createWorker('eng');
 try{const r=await worker.recognize(image,{}, {text:true,blocks:true});const width=('naturalWidth' in image?image.naturalWidth:image.width)||1,height=('naturalHeight' in image?image.naturalHeight:image.height)||1;
 const tokens:Token[]=[];for(const block of r.data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[]){const b=word.bbox;tokens.push({page:1,text:word.text,x:b.x0/width,y:b.y0/height,width:(b.x1-b.x0)/width,height:(b.y1-b.y0)/height,start:0,end:0});}
 return {text:r.data.text,tokens,uncertain:r.data.confidence<75};
 }finally{await worker.terminate();}
}
