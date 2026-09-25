import type {Claim,Result,Evidence,Verification} from './types';
import {getSources,cite,snapshot,type SourceKey,type Source} from './sources';
import {getCtSources,ctCite,ctSnapshot,type ConnecticutSourceKey,type ConnecticutSource} from './connecticut-sources';
export const phoneDigits=(s:string)=>s.replace(/\D/g,'').replace(/^1(?=\d{10}$)/,'');
export const domain=(s:string)=>{try{return new URL(/^https?:\/\//i.test(s)?s:'https://'+s).hostname.toLowerCase().replace(/^www\./,'');}catch{return '';}};
export const address=(s:string)=>s.toLowerCase().replace(/\bstreet\b/g,'st').replace(/[^a-z0-9]/g,'');
export function verdict(claim:Claim,state:Result['verdict'],explanation:string,evidence:Evidence[]=[],resolver_id='riverside'):Result{
 if(state!=='COULD_NOT_VERIFY'&&!evidence.length)throw new Error('Decisive verdict requires official evidence');
 if(state==='MISMATCH'&&!explanation.trim())throw new Error('Mismatch requires direct contradiction');
 return {claim_id:claim.id,verdict:state,explanation,evidence,resolver_id};
}
const unknown=(c:Claim,reason='No available public source independently verifies this detail.',id='riverside',evidence:Evidence[]=[])=>verdict(c,'COULD_NOT_VERIFY',reason,evidence,id);
type Sources=Partial<Record<SourceKey,Source>>;
function proof(s:Sources,key:SourceKey,phrase:string):Evidence|undefined {return s[key]&&cite(s[key],phrase);}
function resolveRiverside(c:Claim,s:Sources):Result{
 const noSource=()=>unknown(c,'Official source could not be reached during this check.');
 if(c.type==='court'){
  const p=proof(s,'jury','Superior Court of California County of Riverside');if(!p)return s.jury?unknown(c):noSource();
  return /superior court of california,?\s*(county of )?riverside/i.test(c.value)?verdict(c,'MATCH','The court name appears on the official Jury Services page.',[p]):unknown(c,'The available page does not establish this court name.');
 }
 if(c.type==='location'){
  const p=proof(s,'location','4050 Main Street, Riverside, CA 92501');if(!p)return s.location?unknown(c):noSource();
  return address(c.value).includes(address('4050 Main Street, Riverside, CA 92501'))?verdict(c,'MATCH','The official location page lists this address.',[p]):unknown(c,'This address was not directly contradicted by a comparable official location record.');
 }
 if(c.type==='phone'){
  const p=proof(s,'jury','951-275-5076');const desert=proof(s,'jury','760-342-6264');const conflict=proof(s,'phones','951.342.6264');if(!p||!desert)return !s.jury?noSource():unknown(c);
  const n=phoneDigits(c.value);if(!/^\d{10}$/.test(n))return unknown(c,'Phone number could not be safely normalized.');
  if(n==='9512755076')return verdict(c,'MATCH','Published as a Jury Services phone number.',[p]);
  if(n==='7603426264'||n==='9513426264')return unknown(c,'Official sources currently disagree.','riverside',[desert,...(conflict?[conflict]:[])]);
  if(!/jury (?:services|contact|help|support)|call (?:us|jury)/i.test(c.context||''))return unknown(c,'The notice does not clearly present this as the designated Jury Services number.');
  return verdict(c,'MISMATCH','Not among the official Jury Services numbers published by this court.',[p,desert,...(conflict?[conflict]:[])]);
 }
 if(c.type==='url'){
  const p=proof(s,'jury','jurywest.riverside.courts.ca.gov');if(!p)return !s.jury?noSource():unknown(c);
  const d=domain(c.value);if(!d)return unknown(c,'Website address could not be safely normalized.');
  if(d==='jurywest.riverside.courts.ca.gov')return verdict(c,'MATCH','The official Jury Services page links to this juror portal.',[p]);
  if(/official|jury (?:portal|service|status)|respond to summons/i.test(c.context||''))return verdict(c,'MISMATCH','The notice presents this as the official jury portal; the court links to a different portal.',[p]);
  return unknown(c,'This website is not explicitly described as the court’s official jury portal.');
 }
 if(c.type==='payment'){
  const p=proof(s,'warning','will not call or send text messages');const payment=proof(s,'warning','make a payment');
  if(!p||!payment)return !s.warning?noSource():unknown(c);
  if(/(?:text message|sms|call|by phone)/i.test(c.context||'' )&&/\bpay|payment|make a payment/i.test(c.context||''))return verdict(c,'MISMATCH','The court says it will not demand payment in jury-related calls or texts.',[payment,p]);
  return unknown(c,'The official warning covers jury-related calls and texts; this payment request has not been directly contradicted in its stated context.');
 }
 if(c.type==='email')return unknown(c,'The available official pages do not establish an exhaustive list of jury email addresses.');
 if(c.type==='juror'||c.type==='reporting_date')return unknown(c,'Juror-specific details require direct confirmation through the official court portal or phone.');
 if(c.type==='threat')return unknown(c,'The court has published guidance about failures to appear; this notice’s particular consequence is not independently confirmed.');
 return unknown(c);
}
export interface CourtResolver{id:string;supportedCourt(name:string):boolean;resolve(claims:Claim[],mode:'LIVE'|'SNAPSHOT',courtName?:string):Promise<Verification>}
export const RiversideSuperiorCourtResolver:CourtResolver={id:'riverside',supportedCourt:n=>/riverside/i.test(n)&&/superior court/i.test(n),async resolve(claims,mode){const s=await getSources(mode);const contact=proof(s,'jury','951-275-5076')||cite(snapshot('jury'),'951-275-5076');return {results:claims.map(c=>resolveRiverside(c,s)),resolver_id:this.id,contact:contact?{phone:'951-275-5076',website:'https://www.riverside.courts.ca.gov/divisions/jury-services',source:contact}:undefined};}};
type CtSources=Partial<Record<ConnecticutSourceKey,ConnecticutSource>>;
function ctProof(s:CtSources,key:ConnecticutSourceKey,phrase:string):Evidence|undefined{return s[key]&&ctCite(s[key],phrase)}
function ctStatusNumber(s:CtSources,key:'contact'|'faq'):{number:string;evidence:Evidence}|undefined{
 const text=s[key]?.text||'';
 const match=key==='contact'?text.match(/status check only[\s\S]{0,100}?call\s+(\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/i):text.match(/automated jury message system at\s+(1[\s.-])?(\d{3}[\s.-]\d{3}[\s.-]\d{4})/i);
 const number=key==='contact'?match?.[1]:match?`${match[1]||''}${match[2]}`:undefined;
 const evidence=number&&ctProof(s,key,number);return number&&evidence?{number:phoneDigits(number),evidence}:undefined;
}
function resolveConnecticut(c:Claim,s:CtSources):Result{
 const noSource=()=>unknown(c,'Official source could not be reached during this check.','connecticut');
 const unverified=(reason:string)=>unknown(c,reason,'connecticut');
 if(c.type==='court'){
  const p=ctProof(s,'hartford','United States District Court');
  if(!p)return s.hartford?unverified('The available court page does not confirm this court name.'):noSource();
  return /^united states district court$/i.test(c.value.trim())||/united states district court.*district of connecticut/i.test(c.value.replace(/\s+/g,' '))?verdict(c,'MATCH','The official District of Connecticut site identifies this federal court.',[p],'connecticut'):unverified('The printed court name was not independently confirmed.');
 }
 if(c.type==='location'){
  const p=ctProof(s,'hartford','450 Main Street');if(!p)return s.hartford?unverified('The courthouse address was not confirmed on the available page.'):noSource();
  return address(c.value).includes(address('450 Main Street'))?verdict(c,'MATCH','The court lists 450 Main Street for its Hartford courthouse.',[p],'connecticut'):unverified('The court lists several divisional courthouses; this address is not directly contradicted by the Hartford page.');
 }
 if(c.type==='phone'){
  const status=ctStatusNumber(s,'contact'),faq=ctStatusNumber(s,'faq'),office=ctProof(s,'contact','(800) 827-8224');
  const n=phoneDigits(c.value);if(!/^\d{10}$/.test(n))return unverified('Phone number could not be safely normalized.');
  if(status&&faq&&status.number!==faq.number)return unknown(c,'Official sources currently disagree.','connecticut',[status.evidence,faq.evidence]);
  if(status&&faq&&n===status.number)return verdict(c,'MATCH','Both the court’s contact page and FAQ publish this jury status number.',[status.evidence,faq.evidence],'connecticut');
  if(n==='8008278224')return office?verdict(c,'MATCH','The court publishes this number for other jury questions.',[office],'connecticut'):!s.contact?noSource():unverified('The official contact page did not confirm this number.');
  if(/status check only|automated jury message system|phone to call:.*after 5:30/i.test(c.context||'')&&status&&faq)return verdict(c,'MISMATCH','The notice names a different number for the court’s designated jury status line.',[status.evidence,faq.evidence],'connecticut');
  return !s.contact?noSource():unverified('The official court pages do not establish that every other phone number is invalid.');
 }
 if(c.type==='payment'){
  const p=ctProof(s,'warning','do not disclose any personal information or pay any fine');
  if(!p)return !s.warning?noSource():unverified('The official warning did not confirm the relevant payment guidance.');
  if(/(?:call|phone)/i.test(c.context||'')&&/fine/i.test(c.context||'')&&/arrest|failure to (?:show|appear)/i.test(c.context||''))return verdict(c,'MISMATCH','The court specifically warns against paying a fine demanded by a jury-duty phone caller.',[p],'connecticut');
  return unverified('The official warning covers phone calls demanding fines; this exact payment claim is not directly contradicted.');
 }
 if(c.type==='juror'||c.type==='reporting_date')return unverified('Only the court can confirm individual juror records or reporting dates. Call the official jury office.');
 return unverified('The available official court pages do not independently establish this detail.');
}
export const ConnecticutDistrictCourtResolver:CourtResolver={id:'connecticut',supportedCourt:n=>/united states district court/i.test(n)&&/district of connecticut/i.test(n),async resolve(claims,mode){const s=await getCtSources(mode);const contact=ctProof(s,'contact','(800) 827-8224')||ctCite(ctSnapshot('contact'),'(800) 827-8224');return {results:claims.map(c=>resolveConnecticut(c,s)),resolver_id:this.id,contact:contact?{phone:'800-827-8224',website:'https://www.ctd.uscourts.gov/contact-parking-information',source:contact}:undefined};}};
export const UnsupportedCourtResolver:CourtResolver={id:'unsupported',supportedCourt:()=>true,async resolve(claims){return {results:claims.map(c=>unknown(c,'This jurisdiction is not supported by an official-source resolver.','unsupported')),resolver_id:this.id};}};
export const FederalCourtListenerResolver:CourtResolver={id:'courtlistener',supportedCourt:n=>/united states (district|court of appeals|bankruptcy) court/i.test(n),async resolve(claims,_mode,courtName=''){const results:Result[]=await Promise.all(claims.map(async c=>{
 if(c.type!=='docket')return unknown(c,'SEAL’s federal source checks exact dockets only; it cannot independently confirm jury notice details.','courtlistener');
 const token=process.env.COURTLISTENER_TOKEN;if(!token)return unknown(c,'CourtListener integration is unavailable without a server token.','courtlistener');
 const query=new URL('https://www.courtlistener.com/api/rest/v4/search/');query.searchParams.set('type','d');query.searchParams.set('q',`docketNumber:"${c.value.replace(/[^a-zA-Z0-9:.-]/g,'')}"`);
 try{const response=await fetch(query,{headers:{Authorization:`Token ${token}`,'User-Agent':'SEAL/1.0'},signal:AbortSignal.timeout(8000)});if(!response.ok)return unknown(c,'CourtListener search was unavailable.','courtlistener');const body=await response.json() as {results?:{docketNumber?:string;absolute_url?:string;court?:string}[]};const expectedCourt=courtName.toLowerCase().replace(/united states|district court|court of appeals|bankruptcy court|for the|for|the/g,'').replace(/\s+/g,' ').trim();const exact=body.results?.find(r=>r.docketNumber?.trim().toLowerCase()===c.value.trim().toLowerCase()&&!!expectedCourt&&r.court?.toLowerCase().includes(expectedCourt));if(!exact)return unknown(c,'No exact docket record was found. Absence is not contradiction.','courtlistener');const url=exact.absolute_url?.startsWith('/')?'https://www.courtlistener.com'+exact.absolute_url:'';return verdict(c,'MATCH','An exact docket number appears in the CourtListener index.',[{title:'CourtListener docket search',url:url||query.toString(),excerpt:`Docket number: ${exact.docketNumber}`,checked_at:new Date().toISOString(),source_mode:'LIVE'}],'courtlistener');}catch{return unknown(c,'CourtListener search was unavailable.','courtlistener');}
 }));return {results,resolver_id:this.id};}};
export async function verifyClaims(claims:Claim[],courtName:string,mode:'LIVE'|'SNAPSHOT',jurisdictionHint=''):Promise<Verification>{
 const identifiedCourt=`${courtName}\n${jurisdictionHint}`;
 const r=RiversideSuperiorCourtResolver.supportedCourt(courtName)?RiversideSuperiorCourtResolver:ConnecticutDistrictCourtResolver.supportedCourt(identifiedCourt)?ConnecticutDistrictCourtResolver:FederalCourtListenerResolver.supportedCourt(courtName)?FederalCourtListenerResolver:UnsupportedCourtResolver;
 return r.resolve(claims,mode,courtName);
}
