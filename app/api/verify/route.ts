import {NextResponse} from 'next/server';
import {z} from 'zod';
import {claimSchema,provenanceContextSchema,type Evidence,type Verification} from '@/lib/types';
import {verifyClaims} from '@/lib/resolver';
import {getBrowseCase} from '@/lib/browse-cases';

const request=z.object({
 claims:z.array(claimSchema).max(60),
 court_name:z.string().max(300),
 jurisdiction_hint:z.string().max(150).optional(),
 mode:z.enum(['LIVE','SNAPSHOT']),
 text:z.string().max(120000).optional(),
 document_text:z.string().max(120000).optional(),
 allow_live_discovery:z.boolean().optional(),
 curated_case_id:z.string().max(120).optional(),
 provenance_context:provenanceContextSchema.optional()
});

function normalized(value:string){
 return value.normalize('NFKC').replace(/\s+/g,' ').trim();
}

function enrichCuratedCase(verification:Verification,caseId:string|undefined,text:string):Verification{
 const item=caseId?getBrowseCase(caseId):undefined;
 const trustedTranscript=item?.runText?normalized(item.runText):'';
 if(!item||item.classification!=='Confirmed scam example'||!trustedTranscript||normalized(text)!==trustedTranscript)return verification;

 const evidence:Evidence={
  title:item.sourceTitle,
  url:item.sourceUrl,
  excerpt:item.excerpt,
  checked_at:'2026-09-26T00:00:00.000Z',
  source_mode:'SNAPSHOT'
 };

 const signal={
  id:`curated-${item.id}`,
  kind:'OFFICIAL_WARNING' as const,
  title:`${item.issuer} already identified this artifact`,
  summary:`This exact Browse artifact is reproduced from ${item.issuer}'s published scam alert. That source is enough to reject the QR/payment route in this example.`,
  evidence:[evidence]
 };

 return {
  ...verification,
  signals:[signal,...(verification.signals||[]).filter(candidate=>candidate.id!==signal.id)],
  safe_action:{
   title:'Do not scan or pay from this message',
   summary:`${item.issuer} published this exact example as a scam. SEAL has enough evidence to reject the QR/payment route shown here; you do not need to research this example again.`,
   primary_url:item.sourceUrl,
   primary_label:`View the ${item.issuer} source`,
   steps:[
    'Do not scan the QR code or send payment through this message.',
    'Keep the published authority source below if you need to show why the route was rejected.'
   ],
   evidence:[evidence]
  }
 };
}

export async function POST(req:Request){
 try{
  const data=request.parse(await req.json());
  const verification=await verifyClaims(data.claims,data.court_name,data.mode,data.jurisdiction_hint,data.text||'',Boolean(data.allow_live_discovery),data.document_text||data.text||'',data.provenance_context);
  return NextResponse.json(enrichCuratedCase(verification,data.curated_case_id,data.text||''));
 }catch{
  return NextResponse.json({error:'Could not verify this request.'},{status:400});
 }
}
