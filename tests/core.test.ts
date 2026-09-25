import {describe,it,expect,vi} from 'vitest';import {fallbackExtract,claimsFromExtraction,locatePhrase,recoverLabeledJurorNumber,recoverLabeledReportingDate} from '../lib/extract';import {extractionSchema,type Token} from '../lib/types';import {verdict,verifyClaims,phoneDigits,domain,address,FederalCourtListenerResolver} from '../lib/resolver';import {fixtures} from '../lib/fixtures';
import {readFileSync} from 'node:fs';
const claims=(key:keyof typeof fixtures)=>{const t=fixtures[key].text,e=fallbackExtract(t);return {t,e,c:claimsFromExtraction(e,t)}};
describe('extraction and source links',()=>{
 it('validates schema and does not convert juror IDs to dockets',()=>{const {e}=claims('riverside-mismatch-demo');expect(extractionSchema.parse(e)).toEqual(e);expect(e.juror_or_reference_number).toBe('10472893');expect(e.case_or_docket_number).toBe('');expect(e.delivery_method).toBe('')});
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
