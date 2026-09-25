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
