import type {Claim,Result,Verification} from './types';
import type {JusticeSupport} from './justice-support';

export type RiskSummary={instructions:{title:string;detail:string};matter:{title:string;detail:string}};
export type CaseReality={status:'FOUND'|'CONFLICT'|'NOT_CONFIRMED'|'NO_IDENTIFIER';title:string;detail:string;court:string;reference:string};
export type ObligationItem={id:string;text:string;deadline:string;status:'MATCH'|'MISMATCH'|'COULD_NOT_VERIFY';statusLabel:string};

const resultMap=(verification:Verification)=>new Map(verification.results.map(result=>[result.claim_id,result]));
const resultFor=(claim:Claim|undefined,verification:Verification)=>claim?resultMap(verification).get(claim.id):undefined;
const courtClaim=(claims:Claim[])=>claims.find(claim=>claim.type==='court');
const docketClaim=(claims:Claim[])=>claims.find(claim=>claim.type==='docket');
const reportingClaim=(claims:Claim[])=>claims.find(claim=>claim.type==='reporting_date');

function actionResults(claims:Claim[],verification:Verification):Array<{claim:Claim;result:Result}>{
 const byId=resultMap(verification);
 return claims.flatMap(claim=>{if(!claim.action)return [];const result=byId.get(claim.id);return result?[{claim,result}]:[]});
}

export function buildRiskSummary(claims:Claim[],verification:Verification):RiskSummary{
 const actions=actionResults(claims,verification);
 const actionConflicts=actions.filter(({result})=>result.verdict==='MISMATCH');
 const actionMatches=actions.filter(({result})=>result.verdict==='MATCH');
 const curated=verification.signals?.some(signal=>signal.id.startsWith('curated-'));
 const hasProcessGuidance=Boolean(verification.safe_action||verification.signals?.some(signal=>signal.kind==='OFFICIAL_PROCESS'));
 let instructions:RiskSummary['instructions'];
 if(curated)instructions={title:'Do not use the flagged route in this message.',detail:verification.safe_action?.summary||'The issuing authority published this exact example as a scam artifact.'};
 else if(actionConflicts.length)instructions={title:'Some requested actions conflict with public sources.',detail:String(actionConflicts.length)+' instruction'+(actionConflicts.length===1?'':'s')+' should not be relied on through this message. Use an independently opened court source instead.'};
 else if(hasProcessGuidance)instructions={title:'These instructions remain unverified.',detail:verification.safe_action?.summary||'Public sources describe an official process, but they do not authenticate this message.'};
 else if(actionMatches.length)instructions={title:'Some instructions match public information.',detail:'A matching detail does not confirm who sent the message. Use an independently sourced court channel before acting.'};
 else instructions={title:'Treat the instructions as unverified.',detail:'SEAL did not find enough independent evidence to authenticate the sender or the requested action.'};

 const docket=docketClaim(claims);
 const docketResult=resultFor(docket,verification);
 let matter:RiskSummary['matter'];
 if(docket&&docketResult?.verdict==='MATCH')matter={title:'A matching public case reference was found.',detail:'This supports that case reference only. It does not authenticate this sender or every instruction in the message.'};
 else if(docket&&docketResult?.verdict==='MISMATCH')matter={title:'The case reference conflicts with a public source.',detail:'Do not assume the entire matter is false; contact the court independently if the claimed obligation could affect you.'};
 else if(docket)matter={title:'The underlying case is not independently confirmed.',detail:'SEAL extracted a case reference, but the available sources did not establish that this matter exists.'};
 else matter={title:'The underlying matter is not independently confirmed.',detail:'No case identifier was verified through a supported public source in this check.'};
 return {instructions,matter};
}

export function buildCaseReality(claims:Claim[],verification:Verification):CaseReality{
 const court=courtClaim(claims)?.value||'Court not identified';
 const docket=docketClaim(claims);
 const result=resultFor(docket,verification);
 if(!docket)return {status:'NO_IDENTIFIER',title:'No verified case identifier',detail:'SEAL did not get a case number it can use for a public-record check. This does not mean there is no legal matter.',court,reference:''};
 if(result?.verdict==='MATCH')return {status:'FOUND',title:'Case reference found in a supported public source',detail:'The public record supports this case reference. It still does not prove that the message or sender is authentic.',court,reference:docket.value};
 if(result?.verdict==='MISMATCH')return {status:'CONFLICT',title:'Case reference conflicts with a supported public source',detail:'The reference does not match the source SEAL checked. Confirm the matter directly with the court before deciding what to do.',court,reference:docket.value};
 return {status:'NOT_CONFIRMED',title:'Case not independently confirmed',detail:'SEAL has a reference from the message, but no supported public source established that case. Absence from a public search is not proof that it is false.',court,reference:docket.value};
}

function deadlineFor(claim:Claim,reportingDate:string){
 const action=claim.action;if(!action)return '';
 if(action.target_type==='date'&&action.target_value)return action.target_value;
 const useful=action.qualifiers.find(value=>/\b(?:today|now|immediately|by|before|after|within|\d{1,2}[:/]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(value));
 if(useful)return useful;
 return action.kind==='appear'?reportingDate:'';
}

export function buildObligationMap(claims:Claim[],verification:Verification):ObligationItem[]{
 const byId=resultMap(verification);const reportingDate=reportingClaim(claims)?.value||'';
 return claims.flatMap(claim=>{
  if(!claim.action||claim.verification_eligible===false)return [];
  const result=byId.get(claim.id);const status=result?.verdict||'COULD_NOT_VERIFY';
  const statusLabel=status==='MATCH'?'Matches a public source':status==='MISMATCH'?'Conflicts with a public source':'Message only — not confirmed';
  return [{id:claim.id,text:claim.action.source_text||claim.exact_source_text||claim.value,deadline:deadlineFor(claim,reportingDate),status,statusLabel}];
 });
}

export function buildPlainLanguageSummary(claims:Claim[],verification:Verification):{title:string;summary:string}{
 const risk=buildRiskSummary(claims,verification);const reality=buildCaseReality(claims,verification);const obligations=buildObligationMap(claims,verification);
 const actionText=obligations.length===0?'SEAL could not read a clear action that the message asks you to take.':obligations.length===1?'The message asks you to: '+obligations[0].text:'The message contains '+String(obligations.length)+' separate instructions, including: '+obligations.slice(0,2).map(item=>item.text).join(' / ');
 return {title:'In simple terms',summary:actionText+' '+risk.instructions.title+' '+reality.title+'. Use an independently opened court source before acting on anything that remains unconfirmed.'};
}

export function buildHandoffSummary(claims:Claim[],verification:Verification,support?:JusticeSupport):string{
 const reality=buildCaseReality(claims,verification);const obligations=buildObligationMap(claims,verification);
 const evidence=[...new Map([...verification.results.flatMap(result=>result.evidence),...(verification.signals||[]).flatMap(signal=>signal.evidence),...(verification.safe_action?.evidence||[])].map(item=>[item.url,item])).values()];
 const lines=['SEAL verification summary','Court claimed: '+reality.court,'Case/reference: '+(reality.reference||'Not verified'),'Underlying matter: '+reality.title,'','Actions stated in the message:'];
 lines.push(...(obligations.length?obligations.map(item=>'- '+item.text+(item.deadline?' | Time/date stated: '+item.deadline:'')+' | '+item.statusLabel):['- No clear requested action was recovered']));
 lines.push('','Independent sources:');
 lines.push(...evidence.map(item=>'- '+item.title+': '+item.url));
 if(support)lines.push('- Official starting point: '+support.court.url);
 lines.push('','SEAL does not authenticate a sender from appearance alone and does not provide legal advice.');
 return lines.join('\n');
}
