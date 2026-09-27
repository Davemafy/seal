import {NextResponse} from 'next/server';
import {z} from 'zod';

const request=z.object({
 locale:z.string().min(2).max(40),
 strings:z.record(z.string().min(1).max(80),z.string().max(4000))
});

export async function POST(req:Request){
 try{
  const data=request.parse(await req.json());
  const entries=Object.entries(data.strings);
  if(entries.length>40)return NextResponse.json({error:'Too many strings.'},{status:400});
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

  const response=await fetch(base+'/chat/completions',{
   method:'POST',
   headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
   body:JSON.stringify({
    model:process.env.GROQ_MODEL||'openai/gpt-oss-20b',
    messages:[{role:'system',content:instruction},{role:'user',content:JSON.stringify(data.strings)}],
    temperature:0,
    response_format:{type:'json_object'}
   }),
   signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error('Translation provider unavailable');
  const body=await response.json() as {choices?:{message?:{content?:string}}[]};
  const translated=JSON.parse(body.choices?.[0]?.message?.content||'{}') as Record<string,unknown>;
  const strings:Record<string,string>={};
  for(const [name,source] of entries){
   const value=translated[name];
   strings[name]=typeof value==='string'&&value.trim()?value:source;
  }
  return NextResponse.json({strings,mode:'TRANSLATED'});
 }catch{
  return NextResponse.json({error:'Translation unavailable.',mode:'UNAVAILABLE'},{status:503});
 }
}
