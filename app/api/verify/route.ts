import {NextResponse} from 'next/server';
import {z} from 'zod';
import {claimSchema,type Evidence,type Verification} from '@/lib/types';
import {verifyClaims} from '@/lib/resolver';
import {getBrowseCase} from '@/lib/browse-cases';

const request=z.object({
 claims:z.array(claimSchema).max(60),
 court_name:z.string().max(300),
 jurisdiction_hint:z.string().max(150).optional(),
 mode:z.enum(['LIVE','SNAPSHOT']),
 text:z.string().max(120000).optional(),
 curated_case_id:z.string().max(120).optional()
});

function enrichCuratedCase(verification:Verification,caseId:string|undefined):Verification{
 const item=caseId?getBrowseCase(caseId):undefined;
 if(!item||item.classification!=='Confirmed scam example')return verification;

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
  title:`${item.issuer} published this artifact as a scam example`,
  summary:`This Browse artifact comes from ${item.issuer}'s own published warning. SEAL treats that provenance as evidence about this example, not as proof about unrelated messages.`,
  evidence:[evidence]
 };

 return {
  ...verification,
  signals:[signal,...(verification.signals||[]).filter(candidate=>candidate.id!==signal.id)],
  safe_action:{
   title:'Do not use the route supplied by this message',
   summary:`${item.issuer} published this example as a scam. Do not scan its QR code, pay through it, or use contact details from the message. Start from the issuing authority's published source instead.`,
   primary_url:item.sourceUrl,
   primary_label:`Open ${item.issuer}'s published warning`,
   steps:[
    'Do not use the QR code, link, payment route, or contact details supplied by this message.',
    `Open the published ${item.issuer} source below and navigate from the authority's own site.`,
    'If you still need to act on a case, find the court or agency through that official site and verify the case there.'
   ],
   evidence:[evidence]
  }
 };
}

export async function POST(req:Request){
 try{
  const data=request.parse(await req.json());
  const verification=await verifyClaims(data.claims,data.court_name,data.mode,data.jurisdiction_hint,data.text||'');
  return NextResponse.json(enrichCuratedCase(verification,data.curated_case_id));
 }catch{
  return NextResponse.json({error:'Could not verify this request.'},{status:400});
 }
}
