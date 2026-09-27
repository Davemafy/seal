import {getBrowseCase} from '@/lib/browse-cases';

export async function GET(req:Request){
 const id=new URL(req.url).searchParams.get('id')||'';
 const item=getBrowseCase(id);
 if(!item)return new Response('Not found',{status:404});
 try{
  const response=await fetch(item.preview.url,{
   redirect:'follow',
   signal:AbortSignal.timeout(10000),
   headers:{'User-Agent':'SEAL/1.0 (+https://github.com/Davemafy/seal)','Accept':item.preview.type==='pdf'?'application/pdf':'image/*'}
  });
  if(!response.ok)return new Response('Source unavailable',{status:502});
  const type=response.headers.get('content-type')||'';
  if(item.preview.type==='pdf'&&!type.toLowerCase().includes('pdf'))return new Response('Unexpected source type',{status:502});
  if(item.preview.type==='image'&&!type.toLowerCase().startsWith('image/'))return new Response('Unexpected source type',{status:502});
  const body=await response.arrayBuffer();
  if(body.byteLength>12_000_000)return new Response('Source too large',{status:413});
  return new Response(body,{headers:{
   'Content-Type':item.preview.type==='pdf'?'application/pdf':type||'image/jpeg',
   'Cache-Control':'public, max-age=3600, s-maxage=86400'
  }});
 }catch{
  return new Response('Source unavailable',{status:502});
 }
}
