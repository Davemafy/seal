import {describe,expect,it} from 'vitest';
import {emptyExtraction} from '../lib/types';
import {claimsFromExtraction,groundedModelActions,sanitizeStructuredExtraction,fallbackExtract} from '../lib/extract';
import {browseCases} from '../lib/browse-cases';
import {ocrLanguages} from '../lib/browser-file';

const action=(exact_quote:string,kind:'pay'|'contact'|'navigate'|'disclose'|'appear',confidence=90)=>({
 exact_quote,kind,verb:kind==='contact'?'call':kind==='navigate'?'scan':kind==='disclose'?'provide':kind==='appear'?'appear':'pay',
 object:exact_quote,target_type:kind==='navigate'?'qr' as const:'unknown' as const,target_value:'',deadline:'',confidence
});

describe('model action grounding',()=>{
 it('accepts varied recipient instructions even when regex cannot identify their phrasing',()=>{
  const examples=[
   ['To avoid the hearing, settle the outstanding balance by scanning this QR code.','pay'],
   ['You are required to telephone the clerk at (202) 555-0186 by Friday.','contact'],
   ['Use the QR symbol below to open the payment page.','navigate'],
   ['Send us your Social Security number before the hearing.','disclose'],
   ['Attend the hearing at the courthouse on November 4.','appear']
  ] as const;
  for(const [text,kind] of examples){
   const extraction={...emptyExtraction(),requested_actions:[action(text,kind)]};
   const claims=claimsFromExtraction(extraction,`DISTRICT COURT\n${text}`);
   expect(claims.filter(claim=>claim.action).map(claim=>claim.action?.kind)).toEqual([kind]);
   expect(claims.find(claim=>claim.action)?.value).toBe(text);
  }
 });

 it('rejects hallucinated, weak, or repaired quotes instead of running the regex parser after a model answer',()=>{
  const text='District Court notice. Bring your papers to the hearing.';
  const extraction={...emptyExtraction(),requested_actions:[
   action('Pay the clerk $500 now.','pay'),
   action('Bring your papers to the hearing.','appear',42),
   action('Bring your passport to the hearing.','appear')
  ]};
  expect(groundedModelActions(extraction,text)).toEqual([]);
  expect(claimsFromExtraction(extraction,text).some(claim=>claim.action)).toBe(false);
 });

 it('accepts whitespace differences but displays the original transcript',()=>{
  const text='DISTRICT COURT\nPlease pay\n the fine by Friday.';
  const extraction={...emptyExtraction(),requested_actions:[action('Please pay the fine by Friday.','pay')]};
  expect(groundedModelActions(extraction,text)[0].source_text).toBe('Please pay\n the fine by Friday.');
 });

 it('uses deterministic actions only when the model path is unavailable',()=>{
  const text='District Court\nPay the fine now.';
  expect(claimsFromExtraction(emptyExtraction(),text).some(claim=>claim.action?.kind==='pay')).toBe(true);
  expect(claimsFromExtraction({...emptyExtraction(),requested_actions:[]},text).some(claim=>claim.action)).toBe(false);
 });

 it('preserves grounded non-US court details and exact model actions',()=>{
  const text='High Court of Lagos State\nCase: LD-2026-481\nPlease pay ₦15,000 at payments.judiciary.gov.ng or call +234 803 555 0100.';
  const extracted={...emptyExtraction(),court_name:'High Court of Lagos State',requested_actions:[action('Please pay ₦15,000 at payments.judiciary.gov.ng or call +234 803 555 0100.','pay')]};
  expect(sanitizeStructuredExtraction(extracted,text).court_name).toBe('High Court of Lagos State');
  expect(claimsFromExtraction(extracted,text).find(c=>c.action?.kind==='pay')?.exact_source_text).toContain('₦15,000');
  const fallback=fallbackExtract(text);
  expect(fallback.phone_numbers).toContain('+234 803 555 0100');
  expect(fallback.urls).toContain('payments.judiciary.gov.ng');
 });

 it('keeps a grounded non-English court and action in pasted text',()=>{
  const text='Juzgado de Primera Instancia de Madrid\nPreséntese ante el juzgado el 12 de octubre.';
  const extracted={...emptyExtraction(),court_name:'Juzgado de Primera Instancia de Madrid',requested_actions:[action('Preséntese ante el juzgado el 12 de octubre.','appear')]};
  expect(sanitizeStructuredExtraction(extracted,text).court_name).toBe('Juzgado de Primera Instancia de Madrid');
  expect(groundedModelActions(extracted,text)[0]?.source_text).toBe('Preséntese ante el juzgado el 12 de octubre.');
 });

 it('grounds Portuguese action text without translating or inventing an amount',()=>{
  const text='Tribunal de Justiça do Distrito Federal\nCompareça à audiência na data indicada. Não há pagamento solicitado.';
  const extraction={...emptyExtraction(),court_name:'Tribunal de Justiça do Distrito Federal',requested_actions:[action('Compareça à audiência na data indicada.','appear')]};
  const claims=claimsFromExtraction(sanitizeStructuredExtraction(extraction,text),text);
  expect(claims.find(c=>c.action)?.action?.source_text).toBe('Compareça à audiência na data indicada.');
  expect(claims.some(c=>c.type==='payment')).toBe(false);
 });

 it('labels international Browse sources separately from runnable court artifacts',()=>{
  expect(new Set(browseCases.filter(c=>c.preview.type==='source').map(c=>c.jurisdiction))).toEqual(new Set(['Lagos, Nigeria','Distrito Federal, Brasil','España','France']));
  expect(browseCases.find(c=>c.id==='brazil-judicial-notification-form')?.preview.type).toBe('pdf');
  expect(browseCases.filter(c=>c.preview.type==='source').every(c=>!c.runText)).toBe(true);
  expect(ocrLanguages).toMatchObject({spa:'Español',por:'Português',fra:'Français'});
 });
});
