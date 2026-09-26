import type {Token} from './types';

export type UnreadableField={type:'phone'|'url'|'information';label:string;page:number;source_bbox:{x:number;y:number;width:number;height:number}};
export type BrowserDocument={text:string;tokens:Token[];preview:string;kind:'image'|'pdf';uncertain:boolean;sample:boolean;ocrConfidence?:number;unreadableFields:UnreadableField[]};

export function ocrScaleForSize(width:number,height:number){
 if(!width||!height)return 1;
 const desired=Math.max(1600/width,2000/height);
 const maxPixels=4_000_000;
 const pixelCap=Math.sqrt(maxPixels/(width*height));
 return Math.min(3.5,desired,pixelCap);
}

let ocrWorkerPromise:Promise<Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>>|null=null;

export function warmOcr(){
 if(!ocrWorkerPromise){
  ocrWorkerPromise=import('tesseract.js')
   .then(({createWorker})=>createWorker('eng'))
   .catch(error=>{ocrWorkerPromise=null;throw error});
 }
 return ocrWorkerPromise;
}

export async function readInBrowser(file:File,onStatus:(status:string)=>void=()=>{}):Promise<BrowserDocument>{
 if(file.size>16_000_000)throw new Error('Maximum file size is 16 MB.');
 if(!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Choose a PDF, JPG, or PNG.');
 const preview=URL.createObjectURL(file);
 if(file.type==='application/pdf'){
  onStatus('Opening the PDF');
  const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
  const doc=await pdfjs.getDocument({data:await file.arrayBuffer(),standardFontDataUrl:'/standard_fonts/',useSystemFonts:true}).promise;const pages:string[]=[];const tokens:Token[]=[];let sample=false;
  onStatus('Reading text from the PDF');
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
  onStatus('Scanning the first page');
  const page=await doc.getPage(1);const viewport=page.getViewport({scale:2});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;
  const recognized=await ocr(canvas);return {...recognized,preview,kind:'pdf',sample};
 }
 onStatus('Preparing the image');
 const image=new Image();image.src=preview;await image.decode();
 onStatus('Reading text from the image');
 return {...await ocr(normalizeForOcr(image)),preview,kind:'image',sample:false};
}

function normalizeForOcr(image:HTMLImageElement){
 const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,scale=ocrScaleForSize(width,height);
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.filter='grayscale(1) contrast(1.28) brightness(1.03)';ctx.drawImage(image,0,0,canvas.width,canvas.height);ctx.filter='none';
 return canvas;
}

function binaryVariant(image:HTMLImageElement|HTMLCanvasElement){
 const width=('naturalWidth' in image?image.naturalWidth:image.width)||1,height=('naturalHeight' in image?image.naturalHeight:image.height)||1;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0,width,height);
 const frame=ctx.getImageData(0,0,width,height),hist=new Uint32Array(256);
 for(let i=0;i<frame.data.length;i+=4){
  const y=Math.round(frame.data[i]*.299+frame.data[i+1]*.587+frame.data[i+2]*.114);
  hist[y]++;
 }
 const total=width*height;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
 let bgWeight=0,bgSum=0,best=0,threshold=180;
 for(let i=0;i<256;i++){
  bgWeight+=hist[i];if(!bgWeight)continue;
  const fgWeight=total-bgWeight;if(!fgWeight)break;
  bgSum+=i*hist[i];
  const bgMean=bgSum/bgWeight,fgMean=(sum-bgSum)/fgWeight;
  const variance=bgWeight*fgWeight*(bgMean-fgMean)*(bgMean-fgMean);
  if(variance>best){best=variance;threshold=i}
 }
 threshold=Math.max(125,Math.min(220,threshold+8));
 for(let i=0;i<frame.data.length;i+=4){
  const y=frame.data[i]*.299+frame.data[i+1]*.587+frame.data[i+2]*.114;
  const value=y>threshold?255:0;
  frame.data[i]=frame.data[i+1]=frame.data[i+2]=value;frame.data[i+3]=255;
 }
 ctx.putImageData(frame,0,0);
 return canvas;
}

type OcrResult=Omit<BrowserDocument,'preview'|'kind'|'sample'>;
type RecognizedLine={text:string;tokens:Token[];page:number;x:number;y:number;confidence:number};
type OcrCandidate={result:OcrResult;lines:RecognizedLine[];quality:number};

const COURT_CUES=/\b(?:court|district|traffic|jury|summons|judge|case|notice|hearing|violation)\b/gi;
const ACTION_CUES=/\b(?:payment|pay|remit|appear|scan|qr|call|visit|provide|submit|deadline)\b/gi;
const CASE_CUE=/\b(?:case|docket)\s*(?:no\.?|number|#)?\s*[:#-]?\s*[A-Z0-9]{1,6}(?:\s*[-–]\s*[A-Z0-9]{1,10}){1,5}\b/i;
const PHONE_CUE=/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
const URL_CUE=/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:gov|com|org|edu|net|mil|us|ca|io|uk|co|info|int)\b/i;

function readableRatio(text:string){
 const compact=text.replace(/\s/g,'');if(!compact)return 0;
 const readable=(compact.match(/[A-Za-z0-9.,:;()/#$%&@'’"!?+\-–—]/g)||[]).length;
 return readable/compact.length;
}
function garbageRatio(text:string){
 const compact=text.replace(/\s/g,'');if(!compact)return 1;
 return (compact.match(/[^A-Za-z0-9.,:;()/#$%&@'’"!?+\-–—]/g)||[]).length/compact.length;
}
function structuredCueCount(text:string){
 let n=0;
 if(CASE_CUE.test(text))n++;
 CASE_CUE.lastIndex=0;
 if(PHONE_CUE.test(text))n++;
 if(URL_CUE.test(text))n++;
 if(/\b(?:state|commonwealth)\s+of\s+[a-z ]{3,40}\b/i.test(text))n++;
 if(/\b(?:traffic|jury)\s+division\b/i.test(text))n++;
 if(/\b(?:final\s+deadline|hearing\s+(?:date|information)|judge\s*:|case\s+no\.?)/i.test(text))n++;
 if(/\b(?:payment\s+instruction|mandatory\s+compliance|collection\s+notice)\b/i.test(text))n++;
 return n;
}
function cueCounts(text:string){
 const courts=(text.match(COURT_CUES)||[]).length;
 const actions=(text.match(ACTION_CUES)||[]).length;
 COURT_CUES.lastIndex=0;ACTION_CUES.lastIndex=0;
 return {courts,actions,structured:structuredCueCount(text),caseId:CASE_CUE.test(text)};
}
function scoreOcr(result:OcrResult){
 const text=result.text,{courts,actions,structured,caseId}=cueCounts(text);
 const readable=readableRatio(text),garbage=garbageRatio(text);
 return (result.ocrConfidence||0)*.55
  +readable*30
  +Math.min(20,courts*2)
  +Math.min(28,actions*3.5)
  +Math.min(28,structured*5)
  +(caseId?8:0)
  +Math.min(22,text.length/70)
  -Math.min(35,garbage*160);
}
function shouldRetryOcr(candidate:OcrCandidate){
 const {courts,actions,structured}=cueCounts(candidate.result.text);
 return (candidate.result.ocrConfidence||0)<82
  ||readableRatio(candidate.result.text)<.88
  ||candidate.result.text.length<280
  ||courts<3
  ||actions<2
  ||structured<2;
}

function cueKinds(text:string){
 const kinds=new Set<string>();
 if(/\bcourt\b/i.test(text))kinds.add('court');
 if(CASE_CUE.test(text))kinds.add('case');
 if(/\b(?:payment|pay|remit|settle)\b/i.test(text))kinds.add('payment');
 if(/\b(?:scan\b[^\n]{0,50}\bqr|qr\b[^\n]{0,50}\b(?:code|scan)|qr\s+code)\b/i.test(text))kinds.add('qr');
 if(/\bappear\b[^\n]{0,90}\b(?:court|hearing)|\b(?:court|hearing)\b[^\n]{0,90}\bappear\b/i.test(text))kinds.add('appearance');
 if(PHONE_CUE.test(text))kinds.add('phone');
 if(URL_CUE.test(text))kinds.add('url');
 if(/\bhearing\b/i.test(text))kinds.add('hearing');
 if(/\bdeadline\b/i.test(text))kinds.add('deadline');
 return kinds;
}
function words(text:string){
 return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(word=>word.length>2));
}
function lineSimilarity(a:string,b:string){
 const A=words(a),B=words(b);if(!A.size||!B.size)return 0;
 let same=0;for(const word of A)if(B.has(word))same++;
 return same/Math.max(A.size,B.size);
}
function lineUseful(line:RecognizedLine){
 const kinds=cueKinds(line.text);
 return kinds.size>0&&readableRatio(line.text)>=.72&&line.confidence>=48&&line.text.length>=6;
}
function structuredValue(text:string,kind:string){
 if(kind==='case')return text.match(CASE_CUE)?.[0]?.toLowerCase().replace(/\s+/g,'')||'';
 if(kind==='phone')return text.match(PHONE_CUE)?.[0]?.replace(/\D/g,'')||'';
 if(kind==='url')return text.match(URL_CUE)?.[0]?.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'')||'';
 return '';
}
function conflictsWith(lines:RecognizedLine[],candidate:RecognizedLine,kinds:Set<string>){
 for(const kind of ['case','phone','url']){
  if(!kinds.has(kind))continue;
  const value=structuredValue(candidate.text,kind);if(!value)continue;
  for(const existing of lines){
   if(!cueKinds(existing.text).has(kind))continue;
   const other=structuredValue(existing.text,kind);
   if(other&&other!==value)return true;
  }
 }
 return false;
}
function rebuild(lines:RecognizedLine[],confidence:number):OcrResult{
 const ordered=[...lines].sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x);
 const outTokens:Token[]=[];const outLines:string[]=[];let offset=0;
 for(const line of ordered){
  const tokens=[...line.tokens].sort((a,b)=>a.x-b.x);
  const text=tokens.map(token=>token.text).join(' ').replace(/\s+/g,' ').trim()||line.text.trim();
  if(!text)continue;
  let local=0;
  for(const token of tokens){
   const tokenText=token.text||'';const start=offset+local;
   outTokens.push({...token,start,end:start+tokenText.length});
   local+=tokenText.length+1;
  }
  outLines.push(text);offset+=text.length+1;
 }
 const text=outLines.join('\n').trim();
 const provisional:OcrResult={text,tokens:outTokens,uncertain:false,ocrConfidence:confidence,unreadableFields:[]};
 const {courts,actions,structured}=cueCounts(text);
 provisional.uncertain=text.length<40||readableRatio(text)<.58||((confidence||0)<42&&courts+actions+structured<3);
 return provisional;
}
function mergeCandidates(primary:OcrCandidate,alternate:OcrCandidate):OcrResult{
 const merged=[...primary.lines];
 for(const line of alternate.lines){
  if(!lineUseful(line))continue;
  const kinds=cueKinds(line.text);
  if(merged.some(existing=>lineSimilarity(existing.text,line.text)>=.72))continue;
  if(conflictsWith(merged,line,kinds))continue;

  const addsMissing=[...kinds].some(kind=>!merged.some(existing=>cueKinds(existing.text).has(kind)));
  const distinctDirective=[...kinds].some(kind=>['payment','qr','appearance'].includes(kind)
   &&!merged.some(existing=>cueKinds(existing.text).has(kind)&&lineSimilarity(existing.text,line.text)>=.45));
  const strongerCourt=kinds.has('court')
   &&!merged.some(existing=>cueKinds(existing.text).has('court')&&readableRatio(existing.text)>.8&&existing.confidence>=65);

  if(addsMissing||distinctDirective||strongerCourt)merged.push(line);
 }
 return rebuild(merged,primary.result.ocrConfidence||0);
}

async function recognize(worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>,image:HTMLImageElement|HTMLCanvasElement):Promise<OcrCandidate>{
 const r=await worker.recognize(image,{}, {text:true,blocks:true});
 const width=('naturalWidth' in image?image.naturalWidth:image.width)||1,height=('naturalHeight' in image?image.naturalHeight:image.height)||1;
 const lines:RecognizedLine[]=[];
 for(const block of r.data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[]){
  const words=line.words||[];const lineText=words.map(word=>word.text).join(' ').replace(/\s+/g,' ').trim();
  if(!lineText)continue;
  const tokens:Token[]=words.map(word=>({
   page:1,text:word.text||'',x:word.bbox.x0/width,y:word.bbox.y0/height,
   width:(word.bbox.x1-word.bbox.x0)/width,height:(word.bbox.y1-word.bbox.y0)/height,
   start:0,end:(word.text||'').length,confidence:Number(word.confidence||0)
  }));
  const confidences=tokens.map(token=>token.confidence||0).sort((a,b)=>a-b);
  const confidence=confidences.length?confidences[Math.floor((confidences.length-1)*.25)]:0;
  lines.push({text:lineText,tokens,page:1,x:tokens[0]?.x||0,y:tokens[0]?.y||0,confidence});
 }
 const result=rebuild(lines,r.data.confidence);
 return {result,lines,quality:scoreOcr(result)};
}

async function ocr(image:HTMLImageElement|HTMLCanvasElement):Promise<OcrResult>{
 const worker=await warmOcr();
 try{
  const first=await recognize(worker,image);
  if(!shouldRetryOcr(first))return first.result;
  const second=await recognize(worker,binaryVariant(image));
  const primary=second.quality>first.quality?second:first;
  const alternate=primary===first?second:first;
  return mergeCandidates(primary,alternate);
 }catch(error){
  ocrWorkerPromise=null;
  try{await worker.terminate()}catch{}
  throw error;
 }
}
