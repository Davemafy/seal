import {describe,it,expect,vi} from 'vitest';import {fallbackExtract,claimsFromExtraction,extractActionGraph,extractAuthorityCitations,locatePhrase,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '../lib/extract';import {ocrScaleForSize} from '../lib/browser-file';import {extractionSchema,type Token} from '../lib/types';import {verdict,verifyClaims,phoneDigits,domain,address,FederalCourtListenerResolver} from '../lib/resolver';import {fixtures} from '../lib/fixtures';
import {readFileSync} from 'node:fs';
const claims=(key:keyof typeof fixtures)=>{const t=fixtures[key].text,e=fallbackExtract(t);return {t,e,c:claimsFromExtraction(e,t)}};
describe('extraction and source links',()=>{
 it('validates schema and does not convert juror IDs to dockets',()=>{const {e}=claims('riverside-mismatch-demo');expect(extractionSchema.parse(e)).toEqual(e);expect(e.juror_or_reference_number).toBe('10472893');expect(e.case_or_docket_number).toBe('');expect(e.delivery_method).toBe('text message')});
 it('normalizes only comparable values',()=>{expect(phoneDigits('(951) 275-5076')).toBe('9512755076');expect(domain('https://www.riverside.courts.ca.gov/path')).toBe('riverside.courts.ca.gov');expect(address('4050 Main Street, Riverside, CA 92501')).toBe(address('4050 Main St Riverside CA 92501'))});
 it('anchors exact token phrases',()=>{expect(locatePhrase('Jury Services',[{page:1,text:'Jury',x:.1,y:.2,width:.1,height:.04,start:0,end:4},{page:1,text:'Services',x:.21,y:.2,width:.1,height:.04,start:5,end:13}])?.source_token_range).toEqual([0,1])});
 it('ignores OCR-like dotted words while keeping court portal addresses',()=>{const e=fallbackExtract('g.AREyOUASALARIEDEMPLoYEE\nOfficial jury portal: jurywest.riverside.courts.ca.gov');expect(e.urls).toEqual(['jurywest.riverside.courts.ca.gov'])});
 it('recovers the labeled juror number and all printed date text from the actual sample PDF',async()=>{
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const bytes=readFileSync(new URL('./fixtures/connecticut-sample-jury-summons.pdf',import.meta.url));
  const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),standardFontDataUrl:new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url).href}).promise;
  const page=await doc.getPage(1),viewport=page.getViewport({scale:1});
  const items=(await page.getTextContent()).items;
  const tokens:Token[]=items.filter(item=>'str' in item).map(item=>({page:1,text:item.str,x:item.transform[4]/viewport.width,y:1-(item.transform[5]+item.height)/viewport.height,width:item.width/viewport.width,height:item.height/viewport.height,start:0,end:0}));
  expect(recoverLabeledJurorNumber(tokens)).toBe('02-0140');
  expect(recoverLabeledReportingDate(tokens)).toBe('March 28(Tue.), May 3(Wed.) & May 4(Thu.), 2017');
  expect(items.some(item=>'str' in item&&item.str==='Sample'&&Math.hypot(item.transform[0],item.transform[1])>30)).toBe(true);
  let printed='';for(const item of items)if('str' in item)printed+=item.str+(item.hasEOL?'\n':' ');
  const extracted=fallbackExtract(printed);const phone=claimsFromExtraction(extracted,printed,tokens).find(c=>c.type==='phone');
  expect(phone?.context).toMatch(/PHONE\s+TO\s+CALL:.*AFTER 5:30\s+PM/i);
 });
 it('refuses decisive verdict without evidence',()=>{const c=claims('riverside-mismatch-demo').c[0];expect(()=>verdict(c,'MATCH','yes')).toThrow();expect(()=>verdict(c,'MISMATCH','no')).toThrow()});
});
describe('Riverside product law',()=>{
 it('returns mixed states with direct evidence for red and green',async()=>{const {c,e}=claims('riverside-mismatch-demo');const v=await verifyClaims(c,e.court_name,'SNAPSHOT');expect(v.results.map(x=>x.verdict)).toContain('MATCH');expect(v.results.map(x=>x.verdict)).toContain('MISMATCH');expect(v.results.map(x=>x.verdict)).toContain('COULD_NOT_VERIFY');expect(v.results.filter(x=>x.verdict!=='COULD_NOT_VERIFY').every(x=>x.evidence.length>0)).toBe(true);expect(v.contact?.phone).toBe('951-275-5076')});
 it('keeps official-source disagreement visible',async()=>{const {c,e}=claims('riverside-consistent-demo');c.push({id:'desert',type:'phone',label:'Jury contact',value:'760-342-6264',exact_source_text:'Jury Services contact: 760-342-6264',page:1,context:'Jury Services contact: 760-342-6264'});const v=await verifyClaims(c,e.court_name,'SNAPSHOT');const conflict=v.results.find(x=>x.claim_id==='desert')!;expect(conflict.verdict).toBe('COULD_NOT_VERIFY');expect(conflict.explanation).toBe('Official sources currently disagree.');expect(conflict.evidence).toHaveLength(2)});
 it('keeps unsupported and private details abstained',async()=>{const {c,e}=claims('unsupported-court-demo');const v=await verifyClaims(c,e.court_name,'SNAPSHOT');expect(v.results.every(x=>x.verdict==='COULD_NOT_VERIFY')).toBe(true)});
 it('does not mistake absent docket for contradiction',async()=>{const c={id:'d1',type:'docket' as const,label:'Docket',value:'1:24-cv-00000',exact_source_text:'1:24-cv-00000',page:1};const v=await FederalCourtListenerResolver.resolve([c],'SNAPSHOT');expect(v.results[0].verdict).toBe('COULD_NOT_VERIFY')});
 it('does not mark generic paper payment demand red',async()=>{const {c,e}=claims('riverside-mismatch-demo');const p=c.find(x=>x.type==='payment')!;p.context='Pay $50 online to confirm attendance.';expect((await verifyClaims([p],e.court_name,'SNAPSHOT')).results[0].verdict).toBe('COULD_NOT_VERIFY')});
 it('abstains on live source failure while preserving labeled official snapshot contact',async()=>{const original=globalThis.fetch;globalThis.fetch=vi.fn().mockRejectedValue(new Error('Unavailable'));try{const {c,e}=claims('riverside-mismatch-demo');const v=await verifyClaims(c,e.court_name,'LIVE');expect(v.results.every(r=>r.verdict==='COULD_NOT_VERIFY')).toBe(true);expect(v.contact?.phone).toBe('951-275-5076');expect(v.contact?.source.source_mode).toBe('SNAPSHOT');expect(v.contact?.source.checked_at).toBe('2026-09-24T00:00:00.000Z')}finally{globalThis.fetch=original}});
});
describe('Connecticut court-source coverage',()=>{
 const court='UNITED STATES DISTRICT COURT',hint='District of Connecticut';
 it('corroborates public sample facts without authenticating a juror record or historical dates',async()=>{
  const c=[{id:'court',type:'court' as const,label:'Court',value:court,exact_source_text:court,page:1},{id:'address',type:'location' as const,label:'Address',value:'450 Main Street',exact_source_text:'450 Main Street',page:1},{id:'phone',type:'phone' as const,label:'Phone',value:'1-866-388-2430',exact_source_text:'1-866-388-2430',page:1},{id:'juror',type:'juror' as const,label:'Juror',value:'02-0140',exact_source_text:'02-0140',page:1},{id:'date',type:'reporting_date' as const,label:'Date',value:'March 28, 2017',exact_source_text:'March 28, 2017',page:1}];
  const v=await verifyClaims(c,court,'SNAPSHOT',hint);
  expect(v.resolver_id).toBe('connecticut');expect(v.results.map(r=>r.verdict)).toEqual(['MATCH','MATCH','MATCH','COULD_NOT_VERIFY','COULD_NOT_VERIFY']);
  expect(v.results.filter(r=>r.verdict==='MATCH').every(r=>r.evidence.every(e=>e.url.startsWith('https://www.ctd.uscourts.gov/')&&e.source_mode==='SNAPSHOT'))).toBe(true);
  expect(v.contact?.phone).toBe('800-827-8224');expect(v.contact?.source.excerpt).toContain('Other Jury Questions');
 });
 it('keeps an unrelated phone unverified but contradicts an explicitly designated status line',async()=>{
  const phone={id:'phone',type:'phone' as const,label:'Phone',value:'203-555-0199',exact_source_text:'203-555-0199',page:1};
  expect((await verifyClaims([phone],court,'SNAPSHOT',hint)).results[0].verdict).toBe('COULD_NOT_VERIFY');
  const named={...phone,context:'Status Check Only: Call 203-555-0199'};
  const result=(await verifyClaims([named],court,'SNAPSHOT',hint)).results[0];expect(result.verdict).toBe('MISMATCH');expect(result.evidence).toHaveLength(2);
 });
 it('does not invent coverage from a generic federal court name',async()=>{
  const claim={id:'court',type:'court' as const,label:'Court',value:court,exact_source_text:court,page:1};
  const v=await verifyClaims([claim],court,'SNAPSHOT');expect(v.resolver_id).toBe('courtlistener');expect(v.results[0].verdict).toBe('COULD_NOT_VERIFY');
 });
 it('shows both official sources if live jury status numbers disagree',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=vi.fn(async(input:RequestInfo|URL)=>{
   const path=String(input);
   const body=path.includes('contact-parking-information')?'Status Check Only: Call (866) 388-2430. Other Jury Questions: Call (800) 827-8224.':path.includes('jury-faqs')?'When you call the automated jury message system at 1-203-555-0199, enter your participant number.':'United States District Court. District of Connecticut. 450 Main Street, Hartford, CT 06103.';
   return new Response(`<main>${body} ${body}</main>`,{headers:{'content-type':'text/html'}});
  });
  try{const phone={id:'p',type:'phone' as const,label:'Phone',value:'1-866-388-2430',exact_source_text:'1-866-388-2430',page:1};const r=(await verifyClaims([phone],court,'LIVE',hint)).results[0];expect(r.verdict).toBe('COULD_NOT_VERIFY');expect(r.explanation).toBe('Official sources currently disagree.');expect(r.evidence).toHaveLength(2);expect(r.evidence.every(e=>e.source_mode==='LIVE'&&e.checked_at)).toBe(true)}finally{globalThis.fetch=original}
 });
 it('abstains when Connecticut live pages fail and uses a labeled snapshot for safe contact',async()=>{
  const original=globalThis.fetch;globalThis.fetch=vi.fn().mockRejectedValue(new Error('Unavailable'));
  try{const phone={id:'p',type:'phone' as const,label:'Phone',value:'1-866-388-2430',exact_source_text:'1-866-388-2430',page:1};const r=await verifyClaims([phone],court,'LIVE',hint);expect(r.results[0].verdict).toBe('COULD_NOT_VERIFY');expect(r.contact?.phone).toBe('800-827-8224');expect(r.contact?.source.source_mode).toBe('SNAPSHOT')}finally{globalThis.fetch=original}
 });
});


describe('Action-first jury scam flow',()=>{
 it('extracts the requested callback, payment, and information request as separate atomic actions',()=>{
  const {t,e,c}=claims('action-message-demo');
  expect(e.payment_demand).toEqual({amount:'$750',method:'payment app',url:''});
  expect(e.information_requests).toHaveLength(1);
  expect(e.delivery_method).toBe('text message');
  expect(c.find(x=>x.type==='phone')?.context).toContain('payment instructions');
  expect(c.find(x=>x.type==='information')?.exact_source_text).toContain('Social Security');
  expect(t).toContain('SYNTHETIC MESSAGE');
 });
 it('directly contradicts only action claims covered by official guidance and keeps an independent court contact',async()=>{
  const {c,e}=claims('action-message-demo');const v=await verifyClaims(c,e.court_name,'SNAPSHOT','District of Connecticut');
  const byType=(type:string)=>v.results.find(r=>c.find(x=>x.id===r.claim_id)?.type===type);
  expect(byType('court')?.verdict).toBe('MATCH');
  expect(byType('phone')?.verdict).toBe('MISMATCH');
  expect(byType('payment')?.verdict).toBe('MISMATCH');
  expect(byType('information')?.verdict).toBe('MISMATCH');
  expect(v.results.filter(r=>r.verdict==='MISMATCH')).toHaveLength(3);
  expect(v.results.filter(r=>r.verdict==='MISMATCH').every(r=>r.evidence.length>0&&r.evidence.every(e=>e.url.startsWith('https://consumer.ftc.gov/')))).toBe(true);
  expect(v.contact?.phone).toBe('800-827-8224');
 });
 it('contradicts a jury-fine link action without claiming the domain itself is fake',async()=>{
  const claim={id:'u1',type:'url' as const,label:'Requested link',value:'ctd-jury-help.com',exact_source_text:'Visit ctd-jury-help.com to pay your jury fine.',page:1,context:'Visit ctd-jury-help.com to pay your jury fine.'};
  const v=await verifyClaims([claim],'UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT','SNAPSHOT');
  expect(v.results[0].verdict).toBe('MISMATCH');expect(v.results[0].explanation).toContain('message directs you to use its link');
 });
 it('does not turn an unrelated unfamiliar phone into a mismatch',async()=>{
  const claim={id:'p1',type:'phone' as const,label:'Phone',value:'203-555-0199',exact_source_text:'Reference phone: 203-555-0199',page:1,context:'Reference phone: 203-555-0199'};
  const v=await verifyClaims([claim],'UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT','SNAPSHOT');
  expect(v.results[0].verdict).toBe('COULD_NOT_VERIFY');
 });
});


describe('image jurisdiction routing',()=>{
 it('joins a visibly wrapped Connecticut court heading before verification',()=>{
  const e=fallbackExtract('UNITED STATES DISTRICT COURT — DISTRICT OF\nCONNECTICUT\nJury Status Check Only: Call 1-866-388-2430 after 5:30 PM.');
  expect(e.court_name).toBe('UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT');
 });
 it('matches the Connecticut court identity when OCR leaves terminal heading punctuation',async()=>{
  const claim={id:'c0',type:'court' as const,label:'Court identity',value:'UNITED STATES DISTRICT COURT —',exact_source_text:'UNITED STATES DISTRICT COURT —',page:1,context:'UNITED STATES DISTRICT COURT —'};
  const v=await verifyClaims([claim],'UNITED STATES DISTRICT COURT —','SNAPSHOT','DISTRICT OF CONNECTICUT');
  expect(v.resolver_id).toBe('connecticut');
  expect(v.results[0].verdict).toBe('MATCH');
 });
 it('recognizes Connecticut when the OCR court heading wraps across lines',async()=>{
  const claim={id:'c1',type:'court' as const,label:'Court identity',value:'UNITED STATES DISTRICT COURT',exact_source_text:'UNITED STATES DISTRICT COURT — DISTRICT OF\nCONNECTICUT',page:1,context:'UNITED STATES DISTRICT COURT — DISTRICT OF\nCONNECTICUT'};
  const v=await verifyClaims([claim],'UNITED STATES DISTRICT COURT','SNAPSHOT','District of Connecticut');
  expect(v.resolver_id).toBe('connecticut');
  expect(v.results[0].verdict).toBe('MATCH');
 });
});


describe('directive action boundary',()=>{
 it('does not turn descriptive or consequence phrases into requested actions',()=>{
  const graph=extractActionGraph('VIOLATION: Failure to Pay Electronic Toll\nAUTHORITY: Power to collect unpaid fees\nNOTICE: Prior opportunities to resolve this matter have expired.');
  expect(graph).toEqual([]);
 });
 it('accepts imperative and deontic requests independent of subject matter',()=>{
  const graph=extractActionGraph('Remit the outstanding balance through the payment system.\nYou are required to appear at the scheduled hearing.\nTo continue, scan the code below.');
  expect(graph.map(a=>a.kind)).toEqual(['pay','appear','navigate']);
 });
 it('splits visually separate columns before action parsing',()=>{
  const tokens:Token[]=[
   {page:1,text:'Time:',x:.08,y:.2,width:.05,height:.025,start:0,end:5,confidence:96},
   {page:1,text:'9:00',x:.14,y:.2,width:.05,height:.025,start:6,end:10,confidence:97},
   {page:1,text:'AM',x:.20,y:.2,width:.03,height:.025,start:11,end:13,confidence:97},
   {page:1,text:'Submit',x:.62,y:.2,width:.07,height:.025,start:14,end:20,confidence:96},
   {page:1,text:'payment',x:.70,y:.2,width:.08,height:.025,start:21,end:28,confidence:96},
   {page:1,text:'through',x:.79,y:.2,width:.07,height:.025,start:29,end:36,confidence:95},
   {page:1,text:'portal',x:.87,y:.2,width:.06,height:.025,start:37,end:43,confidence:95}
  ];
  const graph=extractActionGraph('Time: 9:00 AM Submit payment through portal',tokens);
  expect(graph).toHaveLength(1);
  expect(graph[0]).toMatchObject({verb:'submit',kind:'pay',source_text:'Submit payment through portal'});
 });
 it('deduplicates paraphrased instances of the same requested action',()=>{
  const graph=extractActionGraph('Remit the outstanding balance through the court payment system.\nSubmit payment through the official court payment system.');
  expect(graph.filter(a=>a.kind==='pay')).toHaveLength(1);
 });
});

describe('input-agnostic extraction architecture',()=>{
 it('extracts a court identity without a jurisdiction allowlist',()=>{
  const e=fallbackExtract('COMMONWEALTH OF ALDER\nIN THE MUNICIPAL COURT OF NORTHBRIDGE\nCIVIL DIVISION');
  expect(e.court_name).toBe('IN THE MUNICIPAL COURT OF NORTHBRIDGE');
 });
 it('builds verb-object-target action nodes without requiring an amount or known court',()=>{
  const graph=extractActionGraph('Remit the outstanding balance through the court payment system.\nScan the code below to continue.\nAppear at the courthouse on May 4, 2027.');
  expect(graph.map(a=>a.kind)).toEqual(['pay','navigate','appear']);
  expect(graph[0]).toMatchObject({verb:'remit',kind:'pay',target_type:'unknown'});
  expect(graph[1]).toMatchObject({verb:'scan',kind:'navigate',target_type:'unknown'});
  expect(extractActionGraph('Scan the QR code to continue.')[0]).toMatchObject({verb:'scan',kind:'navigate',target_type:'qr'});
  expect(graph[2]).toMatchObject({verb:'appear',kind:'appear',target_type:'date',target_value:'May 4, 2027'});
 });
 it('preserves a generic action even when its target is unknown',()=>{
  const text='You are required to submit payment through the payment system.';
  const e=fallbackExtract(text),claims=claimsFromExtraction(e,text);
  const action=claims.find(c=>c.action?.kind==='other'||c.action?.kind==='pay');
  expect(action?.label).toMatch(/^Requested/);
  expect(action?.exact_source_text).toBe(text);
 });
 it('attaches confidence to the exact target and withholds a weak value from verification',()=>{
  const text='Call 203-555-0199 immediately.';
  const tokens:Token[]=[
   {page:1,text:'Call',x:.1,y:.1,width:.05,height:.03,start:0,end:4,confidence:96},
   {page:1,text:'203-555-0199',x:.16,y:.1,width:.16,height:.03,start:5,end:17,confidence:74},
   {page:1,text:'immediately.',x:.33,y:.1,width:.12,height:.03,start:18,end:30,confidence:95}
  ];
  const claims=claimsFromExtraction(fallbackExtract(text),text,tokens);
  const call=claims.find(c=>c.action?.kind==='contact');
  expect(call?.field_confidence).toBe(74);
  expect(call?.verification_eligible).toBe(false);
 });
 it('upscales small screenshots generically and leaves already-large images alone',()=>{
  expect(ocrScaleForSize(526,791)).toBeGreaterThan(2);
  expect(ocrScaleForSize(3200,4100)).toBe(1);
 });
});


describe('dense enforcement notice action boundary',()=>{
 it('keeps violation labels descriptive, merges repeated payment instructions, and preserves distinct actions',()=>{
  const text=[
   'VIOLATION:',
   'Failure to Pay Electronic Toll / Toll Evasion',
   'MANDATORY COMPLIANCE ORDER',
   '1. Remit FULL PAYMENT IN TOTAL of all outstanding fines, penalties, court costs, and applicable enforcement fees; OR',
   '2. Appear before the Court at the scheduled hearing date to respond to this matter',
   'PAYMENT INSTRUCTION',
   'To resolve this matter before the hearing date, submit payment through the official court payment system.',
   'SCAN TO PAY'
  ].join('\n');
  const graph=extractActionGraph(text);
  expect(graph.map(action=>action.kind)).toEqual(['pay','appear','navigate']);
  expect(graph.filter(action=>action.kind==='pay')).toHaveLength(1);
  expect(graph.some(action=>/Failure to Pay Electronic Toll/i.test(action.source_text))).toBe(false);
  expect(graph.find(action=>action.kind==='navigate')).toMatchObject({verb:'scan'});
 });
});


describe('review-surface boundaries',()=>{
 it('keeps consequence language out of checked claims while preserving it in extraction context',()=>{
  const text='You are required to pay the balance. Failure to comply may result in arrest. A warrant may issue.';
  const e=fallbackExtract(text);
  e.threats=['Failure to comply may result in arrest.','A warrant may issue.'];
  const claims=claimsFromExtraction(e,text);
  expect(e.threats).toHaveLength(2);
  expect(claims.filter(claim=>claim.type==='threat')).toHaveLength(0);
  expect(claims.some(claim=>claim.action?.kind==='pay')).toBe(true);
 });
});


describe('public-source intelligence layer',()=>{
 const notice=[
  'COMMONWEALTH OF VIRGINIA',
  'IN THE DISTRICT COURT OF VIRGINIA FOR RICHMOND',
  'TRAFFIC DIVISION',
  'CASE NO.: VA-26-TR-273196',
  'VIOLATION: Failure to Pay Electronic Toll / Toll Evasion',
  'AUTHORITY: Va. Code § 46.2-1229',
  'RELATED AUTHORITY: Va. Code, Transportation § 46.2-862',
  'RELATED AUTHORITY: Va. Code § 46.2-882',
  '1. Remit FULL PAYMENT IN TOTAL of all outstanding fines and court costs; OR',
  '2. Appear before the Court at the scheduled hearing date.',
  'SCAN TO PAY'
 ].join('\n');
 it('extracts explicit legal authorities as first-class claims with clean display values',()=>{
  const citations=extractAuthorityCitations(notice);
  expect(citations.map(c=>c.section)).toEqual(['46.2-1229','46.2-862','46.2-882']);
  const claims=claimsFromExtraction(fallbackExtract(notice),notice);
  const authority=claims.filter(c=>c.type==='authority');
  expect(authority).toHaveLength(3);
  expect(authority.map(c=>c.value)).toEqual(['Va. Code § 46.2-1229','Va. Code § 46.2-862','Va. Code § 46.2-882']);
  expect(authority[1].exact_source_text).toContain('Va. Code, Transportation § 46.2-862');
 });
 it('keeps malformed OCR authority text as provenance while showing a canonical authority value',()=>{
  const text='COMMONWEALTH OF VIRGINIA\nVIOLATION: Failure to Pay Electronic Toll\nAUTHORITY: Va. Code, * Va. Code, Transportation § 46.2-862';
  const authority=claimsFromExtraction(fallbackExtract(text),text).find(c=>c.type==='authority');
  expect(authority?.value).toBe('Va. Code § 46.2-862');
  expect(authority?.exact_source_text).toContain('Va. Code, * Va. Code, Transportation § 46.2-862');
 });
 it('finds source-backed authority conflicts, official scam patterns, and a safe independent path',async()=>{
  const e=fallbackExtract(notice),claims=claimsFromExtraction(e,notice);
  const v=await verifyClaims(claims,e.court_name,'SNAPSHOT','',notice);
  const authority=claims.filter(c=>c.type==='authority');
  expect(authority).toHaveLength(3);
  expect(authority.map(c=>v.results.find(r=>r.claim_id===c.id)?.verdict)).toEqual(['MISMATCH','MISMATCH','MISMATCH']);
  expect(v.signals?.map(s=>s.id)).toEqual(expect.arrayContaining(['traffic-qr-warning','reused-case-pattern','authority-conflict']));
  expect(v.safe_action?.primary_url).toBe('https://vacourts.gov/caseinfo/home');
  expect(v.contact?.phone).toBe('804-646-6431');
  expect(v.results.filter(r=>r.verdict==='MISMATCH').every(r=>r.evidence.length>0)).toBe(true);
 });
 it('does not turn a generic pay-or-appear message into a scam-pattern signal without the traffic/QR/case combination',async()=>{
  const text='IN THE MUNICIPAL COURT OF NORTHBRIDGE\nRemit the balance or appear at the hearing.';
  const e=fallbackExtract(text),claims=claimsFromExtraction(e,text);
  const v=await verifyClaims(claims,e.court_name,'SNAPSHOT','',text);
  expect(v.signals||[]).toHaveLength(0);
  expect(v.results.every(r=>r.verdict==='COULD_NOT_VERIFY')).toBe(true);
 });
});
