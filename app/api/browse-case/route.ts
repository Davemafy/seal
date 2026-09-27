import {getBrowseCase} from '@/lib/browse-cases';

export async function GET(req:Request){
 const id=new URL(req.url).searchParams.get('id')||'';
 const item=getBrowseCase(id);
 if(!item?.runText)return Response.json({error:'No runnable document'},{status:404});
 return Response.json({
  runText:item.runText,
  assetType:item.preview.type,
  ocrLanguage:item.ocrLanguage||'eng',
  assetAlt:item.preview.alt,
  title:item.title
 });
}
