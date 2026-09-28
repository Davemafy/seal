import {NextResponse} from 'next/server';
import {z} from 'zod';

const request=z.object({
 locale:z.string().min(2).max(40),
 strings:z.record(z.string().min(1).max(80),z.string().max(4000))
});

const MAX_STRINGS=256;
const BATCH_SIZE=128;

const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export async function POST(req:Request){
 try{
  const data=request.parse(await req.json());
  const entries=Object.entries(data.strings);
  if(entries.length>MAX_STRINGS)return NextResponse.json({error:'Too many strings.'},{status:400});

  const baseLocale=data.locale.toLowerCase().split('-')[0];
  if(baseLocale==='en')return NextResponse.json({strings:data.strings,mode:'SOURCE'});

  const key=process.env.GROQ_API_KEY;
  if(!key)return NextResponse.json({error:'Translation provider is not configured.',mode:'UNAVAILABLE'},{status:503});

  const base=process.env.GROQ_BASE_URL||'https://api.groq.com/openai/v1';
  if(new URL(base).hostname!=='api.groq.com')throw new Error('Provider host not allowed');

  const instruction=[
   `Translate every JSON string value into locale ${data.locale}.`,
   'Return one JSON object with exactly the same keys.',
   'Preserve names, court names, phone numbers, dates, amounts, case numbers, URLs, quoted source facts, and legal meaning.',
   'Do not add advice, interpretation, warnings, or facts.',
   'If a term should remain untranslated for accuracy, keep it.'
  ].join(' ');

  const sourceStrings:Record<string,string>={};
  const translatableEntries=entries.filter(([name,source])=>{
   sourceStrings[name]=source;
   return source.trim().length>0;
  });

  if(!translatableEntries.length)return NextResponse.json({strings:sourceStrings,mode:'TRANSLATED'});

  const chunks:Array<Array<[string,string]>>=[];
  for(let index=0;index<translatableEntries.length;index+=BATCH_SIZE){
   chunks.push(translatableEntries.slice(index,index+BATCH_SIZE));
  }

  const translateChunk=async(chunk:Array<[string,string]>)=>{
   const strings=Object.fromEntries(chunk);
   let lastStatus=0;

   for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(base+'/chat/completions',{
     method:'POST',
     headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
     body:JSON.stringify({
      model:process.env.GROQ_MODEL||'openai/gpt-oss-20b',
      messages:[
       {role:'system',content:instruction},
       {role:'user',content:JSON.stringify(strings)}
      ],
      temperature:0,
      response_format:{type:'json_object'}
     }),
     signal:AbortSignal.timeout(20000)
    });

    lastStatus=response.status;
    if(response.ok){
     try{
      const body=await response.json() as {choices?:{message?:{content?:string}}[]};
      const translated=JSON.parse(body.choices?.[0]?.message?.content||'{}') as Record<string,unknown>;
      const normalized:Record<string,string>={};
      for(const [name,source] of chunk){
       const value=translated[name];
       normalized[name]=typeof value==='string'&&value.trim()?value:source;
      }
      return normalized;
     }catch{
      if(attempt<2){
       await delay(350*(attempt+1));
       continue;
      }
     }
    }

    if(attempt<2&&(response.status===429||response.status>=500)){
     await delay(700*(attempt+1));
     continue;
    }
    break;
   }

   throw new Error(`Translation provider status ${lastStatus||'unknown'}`);
  };

  const strings={...sourceStrings};
  // Run chunks sequentially to avoid rate-limit bursts during a user-triggered translation.
  for(const chunk of chunks){
   const translated=await translateChunk(chunk);
   Object.assign(strings,translated);
  }

  return NextResponse.json({strings,mode:'TRANSLATED'});
 }catch{
  return NextResponse.json({error:'Translation unavailable.',mode:'UNAVAILABLE'},{status:503});
 }
}
