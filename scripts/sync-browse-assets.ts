import {execFile} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {browseCases} from '../lib/browse-cases';

const run=promisify(execFile);
const outputDir=join(process.cwd(),'public','browse-assets');
await mkdir(outputDir,{recursive:true});
const tempRoot=await mkdtemp(join(tmpdir(),'seal-browse-assets-'));
const failures:string[]=[];

async function sameBytes(path:string,next:Buffer){
 try{return (await readFile(path)).equals(next)}catch{return false}
}

async function fetchSource(url:string,accept:string){
 const response=await fetch(url,{
  redirect:'follow',
  signal:AbortSignal.timeout(25000),
  headers:{'User-Agent':'SEAL/1.0 browse source sync (+https://github.com/Davemafy/seal)','Accept':accept}
 });
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 return {bytes:Buffer.from(await response.arrayBuffer()),type:response.headers.get('content-type')||''};
}

try{
 for(const item of browseCases){
  const target=join(outputDir,`${item.id}.jpg`);
  try{
   const source=join(tempRoot,`${item.id}.${item.preview.type==='pdf'?'pdf':'source'}`);
   const base=join(tempRoot,item.id);
   const {bytes,type}=await fetchSource(item.preview.url,item.preview.type==='pdf'?'application/pdf':'image/*');

   if(item.preview.type==='pdf'){
    if(bytes.length<5||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw new Error('source did not return a PDF');
    await writeFile(source,bytes);
    await run('pdftoppm',[
     '-f','1','-l','1','-singlefile','-jpeg',
     '-jpegopt','quality=84',
     '-scale-to-x','1100','-scale-to-y','-1',
     source,base
    ],{timeout:45000,maxBuffer:1024*1024});
   }else{
    if(!type.toLowerCase().startsWith('image/'))throw new Error('source did not return an image');
    await writeFile(source,bytes);
    await run('convert',[
     source,
     '-auto-orient',
     '-strip',
     '-resize','1100x1100>',
     '-quality','84',
     `${base}.jpg`
    ],{timeout:45000,maxBuffer:1024*1024});
   }

   const rendered=await readFile(`${base}.jpg`);
   if(!(await sameBytes(target,rendered))){
    await writeFile(target,rendered);
    console.log(`UPDATED ${item.id}: ${Math.round(rendered.length/1024)} KB`);
   }else console.log(`UNCHANGED ${item.id}`);
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   failures.push(`${item.id}: ${message}`);
   console.error(`FAILED ${item.id}: ${message}`);
  }
 }
}finally{
 await rm(tempRoot,{recursive:true,force:true});
}
if(failures.length)console.error(`Browse thumbnail sync completed with ${failures.length} failure(s). Existing cached assets were kept.`);
