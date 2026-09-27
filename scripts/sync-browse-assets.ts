import {execFile} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {browseCases} from '../lib/browse-cases';

const run=promisify(execFile);
const outputDir=join(process.cwd(),'public','browse-assets');
await mkdir(outputDir,{recursive:true});
const pdfCases=browseCases.filter(item=>item.preview.type==='pdf');
const tempRoot=await mkdtemp(join(tmpdir(),'seal-browse-assets-'));
const failures:string[]=[];

async function sameBytes(path:string,next:Buffer){
 try{return (await readFile(path)).equals(next)}catch{return false}
}

try{
 for(const item of pdfCases){
  const target=join(outputDir,`${item.id}.jpg`);
  try{
   const response=await fetch(item.preview.url,{
    redirect:'follow',
    signal:AbortSignal.timeout(25000),
    headers:{'User-Agent':'SEAL/1.0 browse source sync (+https://github.com/Davemafy/seal)','Accept':'application/pdf'}
   });
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length<5||bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw new Error('source did not return a PDF');
   const source=join(tempRoot,`${item.id}.pdf`);
   const base=join(tempRoot,item.id);
   await writeFile(source,bytes);
   await run('pdftoppm',['-f','1','-l','1','-singlefile','-jpeg','-jpegopt','quality=86','-r','135',source,base],{timeout:45000,maxBuffer:1024*1024});
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
