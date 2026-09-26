import {getBrowseCase} from '@/lib/browse-cases';

export async function GET(req:Request){
 const id=new URL(req.url).searchParams.get('id')||'';
 const item=getBrowseCase(id);
 if(!item)return Response.json({error:'Not found'},{status:404});
 return Response.json({runText:item.runText});
}
