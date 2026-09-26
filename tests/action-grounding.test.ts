import {describe,expect,it} from 'vitest';
import {emptyExtraction} from '../lib/types';
import {claimsFromExtraction,groundedModelActions} from '../lib/extract';

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
});
