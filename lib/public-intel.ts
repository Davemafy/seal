import type {Claim,Evidence,Result,SafeAction,SourceSignal} from './types';

const checkedAt='2026-09-25T00:00:00.000Z';
const snapshot=(title:string,url:string,excerpt:string):Evidence=>({title,url,excerpt,checked_at:checkedAt,source_mode:'SNAPSHOT'});

const official={
 ftcTraffic:snapshot(
  'FTC — traffic violation text scam',
  'https://consumer.ftc.gov/consumer-alerts/2026/04/text-about-traffic-violation-probably-scam',
  'The scam uses a traffic-hearing image, a QR code, a fake case number, and a pay-or-appear choice.'
 ),
 dallasAlert:snapshot(
  'City of Dallas — SCAM traffic notice',
  'https://dallascityhall.com/departments/courtdetentionservices/DCH%20Documents/4-1-26%20-%20SCAM%20Notice.pdf',
  'Case No: TX-26-TR-273196. The notice directs the recipient to scan a QR code to settle an unpaid balance.'
 ),
 miamiAlert:snapshot(
  'Miami-Dade Clerk — SCAM ALERT',
  'https://www.miamidadeclerk.gov/library/Home_Page/scamalert.pdf',
  'Case No. 26 TR-273196 appears in the clerk’s published scam-alert example.'
 ),
 va1229:snapshot(
  'Code of Virginia § 46.2-1229',
  'https://law.lis.virginia.gov/vacode/title46.2/section46.2-1229/',
  'Enforcement of parking regulations of the State Board of Behavioral Health and Developmental Services.'
 ),
 va862:snapshot(
  'Code of Virginia § 46.2-862',
  'https://law.lis.virginia.gov/vacode/title46.2/section46.2-862/',
  'A person is guilty of reckless driving for specified excessive-speed conduct.'
 ),
 va882:snapshot(
  'Code of Virginia § 46.2-882',
  'https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-882/',
  'Determining speed with laser, radar, and other approved speed-measurement devices.'
 ),
 va819:snapshot(
  'Code of Virginia § 46.2-819',
  'https://law.lis.virginia.gov/vacode/title46.2/chapter8/section46.2-819/',
  'Use of a toll facility without payment of the specified toll is addressed in § 46.2-819.'
 ),
 vaCases:snapshot(
  'Virginia Court System — Case Status and Information',
  'https://vacourts.gov/caseinfo/home',
  'General District Court cases may be searched by name, case number, or hearing date.'
 ),
 vaPayments:snapshot(
  'Virginia Court System — Pay Traffic Tickets and Other Offenses',
  'https://www.vacourts.gov/caseinfo/tickets_dc',
  'Eligible cases display “Mark for Payment” in the official General District Court case system.'
 ),
 richmond:snapshot(
  'Richmond City General District Court',
  'https://vacourts.gov/courts/gd/richmond_city/home',
  'John Marshall Criminal/Traffic: (804) 646-6431. John Marshall Courts Building, 400 N. 9th Street, Richmond.'
 ),
 nhTollRules:snapshot(
  'New Hampshire Administrative Rules — toll payment requests',
  'https://www.gc.nh.gov/rules/state_agencies/tra700.html',
  'New Hampshire toll payment requests identify the unpaid transaction and use staged payment requests and notices of violation through the E-ZPass/vendor process.'
 ),
 nhCourtCollection:snapshot(
  'New Hampshire Judicial Branch — judgment collection process',
  'https://www.courts.nh.gov/sites/g/files/ehbemt471/files/documents/2021-07/basicprocessforcollectingonjudgment.pdf',
  'The Judicial Branch describes post-judgment collection through court motions, service, payment hearings, and court orders. The Information Center number is 1-855-212-1234.'
 )
};

const vaStatutes:Record<string,{evidence:Evidence;topic:'behavioral-health-parking'|'reckless-speed'|'speed-measurement'|'toll'}>={
 '46.2-1229':{evidence:official.va1229,topic:'behavioral-health-parking'},
 '46.2-862':{evidence:official.va862,topic:'reckless-speed'},
 '46.2-882':{evidence:official.va882,topic:'speed-measurement'},
 '46.2-819':{evidence:official.va819,topic:'toll'}
};

const normalize=(value:string)=>value.replace(/\s+/g,' ').trim();
const sectionFrom=(value:string)=>value.match(/46\.2-\d+(?:\.\d+)?(?::\d+)?/i)?.[0]||'';
const isVirginia=(text:string)=>/\b(?:commonwealth of virginia|virginia court|district court of virginia|richmond,?\s*va|va\.?\s*code|virginia code)\b/i.test(text);
const isNewHampshire=(text:string)=>/\b(?:state of new hampshire|new hampshire|nh\s+(?:court|judicial|e-?zpass|turnpike))\b/i.test(text);
const isUsContext=(text:string)=>/\b(?:united states|u\.?s\.?\s+(?:district|federal|court)|commonwealth of virginia|state of (?:maryland|virginia|texas|florida|california|connecticut)|virginia court|richmond,?\s*va|dallas,?\s*texas|miami-?dade|baltimore,?\s*maryland|va\.?\s*code|virginia code)\b/i.test(text);
const hasTrafficSubject=(text:string)=>/\b(?:traffic|parking|toll|vehicle|citation)\b/i.test(text);
const hasTollSubject=(text:string)=>/\b(?:electronic toll|toll violation|toll evasion|unpaid toll|failure to pay[^\n]{0,50}toll)\b/i.test(text);
const hasRequested=(claims:Claim[],kind:string)=>claims.some(c=>c.action?.kind===kind);
const hasScan=(claims:Claim[],text:string)=>claims.some(c=>c.action?.verb==='scan')||/\b(?:scan|qr code)\b/i.test(text);

function nearby(text:string,needle:string,radius=360){
 const at=text.toLowerCase().indexOf(needle.toLowerCase());if(at<0)return text.slice(0,Math.min(text.length,radius*2));
 return text.slice(Math.max(0,at-radius),Math.min(text.length,at+needle.length+radius));
}

function authorityMismatch(claim:Claim,text:string):Result|undefined{
 if(claim.type!=='authority'||!isVirginia(text))return;
 const section=sectionFrom(claim.value);const statute=vaStatutes[section];if(!statute)return;
 const context=normalize(`${claim.context||''} ${nearby(text,section,300)}`);
 const tiesToToll=hasTollSubject(context)&&/\b(?:authority|related authority|violation|code|§)\b/i.test(context);
 if(tiesToToll&&statute.topic!=='toll'){
  return {
   claim_id:claim.id,
   verdict:'MISMATCH',
   explanation:`The notice presents § ${section} in an electronic-toll enforcement context, but the official Virginia Code describes a different subject.`,
   evidence:[statute.evidence,official.va819],
   resolver_id:'public-intel',
   normalized_comparison:{cited_section:section,notice_subject:'electronic toll',official_subject:statute.topic}
  };
 }
 return {
  claim_id:claim.id,
  verdict:'COULD_NOT_VERIFY',
  explanation:'The official source identifies this statute, but its applicability to this specific notice cannot be established from the public source alone.',
  evidence:[statute.evidence],
  resolver_id:'public-intel'
 };
}

export function resolvePublicClaims(claims:Claim[],text:string):Map<string,Result>{
 const results=new Map<string,Result>();
 for(const claim of claims){const r=authorityMismatch(claim,text);if(r)results.set(claim.id,r)}
 return results;
}

function uniqueEvidence(values:Evidence[]){
 const seen=new Set<string>();return values.filter(e=>{if(seen.has(e.url))return false;seen.add(e.url);return true});
}

export function analyzePublicIntelligence(text:string,claims:Claim[],results:Result[]):{
 signals:SourceSignal[];
 safe_action?:SafeAction;
 contact?:{name?:string;phone:string;website:string;source:Evidence};
}{
 const signals:SourceSignal[]=[];
 const compact=normalize(text);
 const rawTraffic=/\b(?:traffic|toll|citation|parking|vehicle|speeding)\b/i.test(compact);
 const rawPay=/\b(?:remit|pay|payment|settle)\b.{0,150}\b(?:fine|fee|toll|balance|amount|cost|penalt|full|total)\b|\b(?:full\s+payment|payment\s+instruction)\b/i.test(compact);
 const rawScan=/\bscan\b.{0,70}\bqr\b|\bqr\b.{0,70}\b(?:code|scan|payment)\b/i.test(compact);
 const rawAppear=/\bappear\b.{0,130}\b(?:court|hearing)|\b(?:court|hearing)\b.{0,130}\bappear\b/i.test(compact);
 const rawCase=/\b(?:case|docket)\s*(?:no\.?|number|#)?\s*[:#-]?\s*[A-Z0-9]{1,6}(?:\s*[-–]\s*[A-Z0-9]{1,10}){1,5}\b/i.test(compact);
 const trafficPattern=(hasTrafficSubject(compact)||rawTraffic)
  &&(hasRequested(claims,'pay')||rawPay)
  &&(hasScan(claims,compact)||rawScan)
  &&(claims.some(c=>c.type==='docket')||rawCase)
  &&(hasRequested(claims,'appear')||rawAppear);
 if(trafficPattern&&isUsContext(compact)){
  signals.push({
   id:'traffic-qr-warning',
   kind:'OFFICIAL_WARNING',
   title:'This action pattern matches an FTC traffic-ticket scam warning',
   summary:'The FTC describes the same combination: an official-looking traffic hearing, a case number, pay-or-appear instructions, and a QR-code payment route.',
   evidence:[official.ftcTraffic]
  });
 }
 const nhTollDemand=isNewHampshire(compact)
  &&/\b(?:toll|e-?zpass|turnpike)\b/i.test(compact)
  &&(hasRequested(claims,'pay')||rawPay);
 if(nhTollDemand){
  signals.push({
   id:'nh-toll-process',
   kind:'OFFICIAL_PROCESS',
   title:'New Hampshire publishes a different process for toll and court collections',
   summary:'State toll rules describe E-ZPass/vendor payment requests with transaction details and staged notices. Judicial Branch materials describe judgment collection through filed motions, service, hearings, and court orders.',
   evidence:[official.nhTollRules,official.nhCourtCollection]
  });
 }

 if(/(?:^|[^0-9])(?:[A-Z]{2}-)?26[-\s]?TR[-\s]?273196(?:[^0-9]|$)/i.test(compact)){
  signals.push({
   id:'reused-case-pattern',
   kind:'KNOWN_PATTERN',
   title:'The core case number appears in official scam-alert examples',
   summary:'Official scam alerts published by Dallas and Miami-Dade show the same 26-TR-273196 core case number in fake traffic notices.',
   evidence:[official.dallasAlert,official.miamiAlert]
  });
 }
 const authorityResults=results.filter(r=>r.resolver_id==='public-intel'&&r.verdict==='MISMATCH');
 if(authorityResults.length){
  const evidence=uniqueEvidence(authorityResults.flatMap(r=>r.evidence));
  signals.push({
   id:'authority-conflict',
   kind:'SOURCE_CONFLICT',
   title:`${authorityResults.length} cited authorit${authorityResults.length===1?'y conflicts':'ies conflict'} with the printed toll claim`,
   summary:'The official Virginia Code sections cited by the notice describe different subjects; Virginia’s toll-violation provisions are in the § 46.2-819 family.',
   evidence
  });
 }

 if(!signals.length)return {signals};

 const newHampshire=isNewHampshire(compact);
 if(newHampshire&&signals.some(signal=>signal.id==='nh-toll-process')){
  return {
   signals,
   safe_action:{
    title:'Check the toll or case outside this notice',
    summary:'Use New Hampshire’s official toll or court channels before paying through any route printed in this notice.',
    primary_url:'https://www.ezpassnh.com/',
    primary_label:'Open NH E-ZPass',
    steps:[
     'Check the toll through the official NH E-ZPass site using information you already know.',
     'If the notice claims a court order or judgment, contact the New Hampshire Judicial Branch independently.',
     'Do not use the payment route in the notice until the demand matches an official record.'
    ],
    evidence:[official.nhTollRules,official.nhCourtCollection]
   },
   contact:{
    name:'New Hampshire Judicial Branch Information Center',
    phone:'1-855-212-1234',
    website:'https://www.courts.nh.gov/',
    source:official.nhCourtCollection
   }
  };
 }

 const virginia=isVirginia(compact);
 const richmond=virginia&&/\brichmond\b/i.test(compact);
 const contact=richmond?{name:'Richmond City General District Court — Criminal/Traffic',phone:'804-646-6431',website:official.richmond.url,source:official.richmond}:undefined;
 const safe_action:SafeAction=virginia?{
  title:'Verify outside this message before paying',
  summary:'Do not use the QR code or payment route in this message until the case is found through Virginia’s official court system.',
  primary_url:official.vaCases.url,
  primary_label:'Search Virginia court cases',
  steps:[
   'Search the official Virginia case system using the name, case number, or hearing date.',
   'Only use the court system’s own payment option if the case is present and marked eligible for payment.',
   richmond?'If the case is unclear, call Richmond City General District Court Criminal/Traffic at 804-646-6431 using the independently sourced number below.':'If the case is unclear, find the court through the Virginia Court System and contact it independently.'
  ],
  evidence:[official.vaCases,official.vaPayments,...(richmond?[official.richmond]:[])]
 }:{
  title:'Verify outside this message before paying',
  summary:'Do not scan the QR code or use the payment route in the message until the case is verified through an independently found court source.',
  primary_url:official.ftcTraffic.url,
  primary_label:'Read the FTC warning',
  steps:[
   'Do not scan the QR code or pay through a route supplied by the message.',
   'Find the court’s website or phone number independently.',
   'Verify the case before sending money or personal information.'
  ],
  evidence:[official.ftcTraffic]
 };
 return {signals,safe_action,contact};
}
