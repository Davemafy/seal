import type {Evidence,SafeAction,SourceSignal,VerificationLane} from './types';
import {officialCourtDirectoryFor} from './official-directories';

function evidenceFor(title:string,url:string,excerpt:string,mode:'LIVE'|'SNAPSHOT'):Evidence{
 return {title,url,excerpt,checked_at:new Date().toISOString(),source_mode:mode};
}

export async function discoverOfficialDirectory(rawText:string,courtName:string,jurisdictionHint:string,mode:'LIVE'|'SNAPSHOT'):Promise<{lane:VerificationLane;signal?:SourceSignal;safeAction?:SafeAction}>{
 const started=Date.now();
 const directory=officialCourtDirectoryFor([rawText,courtName,jurisdictionHint].filter(Boolean).join('\n'));
 if(!directory)return {lane:{id:'official-directory',label:'Official court directory',status:'not_applicable',summary:'No high-confidence official judiciary directory matched the document.',evidence:[],resolver_id:'official-directory',duration_ms:Date.now()-started}};
 let live=false;
 if(mode==='LIVE'){
  try{const response=await fetch(directory.url,{method:'GET',headers:{'User-Agent':'SEAL/1.0'},signal:AbortSignal.timeout(4500),redirect:'follow'});live=response.ok}catch{}
 }
 const evidence=evidenceFor(directory.label,directory.url,directory.note,live?'LIVE':'SNAPSHOT');
 const lane:VerificationLane={id:'official-directory',label:'Official court directory',status:'evidence_found',summary:live?('Reached the official judiciary route for '+directory.jurisdiction+'.'):('Identified the reviewed official judiciary route for '+directory.jurisdiction+'.'),evidence:[evidence],resolver_id:'official-directory',duration_ms:Date.now()-started};
 const signal:SourceSignal={id:'directory-'+directory.id,kind:'OFFICIAL_DIRECTORY',title:'Official court route found for '+directory.jurisdiction,summary:directory.note,evidence:[evidence]};
 const safeAction:SafeAction={title:'Verify through the official court system',summary:'SEAL identified an official judiciary route for '+directory.jurisdiction+'. Use it independently of any link, phone number, or QR code in the message.',primary_url:directory.url,primary_label:directory.label,steps:['Open the official judiciary route below independently.','Search for the court or case using details from the document, not a link supplied by the message.','Treat the message as unverified until the official record or court contact confirms what action is required.'],evidence:[evidence]};
 return {lane,signal,safeAction};
}
