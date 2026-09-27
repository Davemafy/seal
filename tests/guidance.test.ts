import {describe,it,expect} from 'vitest';
import {fallbackExtract,claimsFromExtraction} from '../lib/extract';
import {verifyClaims} from '../lib/resolver';
import {justiceSupportFor} from '../lib/justice-support';
import {buildCaseReality,buildObligationMap,buildRiskSummary} from '../lib/user-guidance';

describe('user-first justice guidance',()=>{
 it('keeps an unsupported India message actionable without authenticating it',async()=>{
  const text='DISTRICT COURT — NEW DELHI, INDIA\nCase No: DL-2026-4821\nYou must appear at the court registry on October 14, 2026.\nCall +91 11 5555 0199 to confirm your attendance.';
  const extraction=fallbackExtract(text);const claims=claimsFromExtraction(extraction,text);const verification=await verifyClaims(claims,extraction.court_name,'SNAPSHOT','',text);
  const risk=buildRiskSummary(claims,verification);const reality=buildCaseReality(claims,verification);const support=justiceSupportFor(text);
  expect(risk.instructions.title).toContain('unverified');
  expect(risk.matter.title).toContain('not independently confirmed');
  expect(reality.status).toBe('NOT_CONFIRMED');
  expect(support?.caseLookup?.url).toBe('https://services.ecourts.gov.in/ecourtindia_v6/');
  expect(support?.legalAid?.url).toContain('nalsa.gov.in');
 });
 it('preserves requested actions as message-only when the court is unsupported',async()=>{
  const text='DISTRICT COURT — NEW DELHI, INDIA\nCase No: DL-2026-4821\nYou must appear at the court registry on October 14, 2026.\nCall +91 11 5555 0199 to confirm your attendance.';
  const extraction=fallbackExtract(text);const claims=claimsFromExtraction(extraction,text);const verification=await verifyClaims(claims,extraction.court_name,'SNAPSHOT','',text);
  const items=buildObligationMap(claims,verification);
  expect(items.some(item=>item.text.includes('Call +91 11 5555 0199'))).toBe(true);
  expect(items.every(item=>item.statusLabel==='Message only — not confirmed')).toBe(true);
 });
 it('does not turn a matching case reference into sender authentication',()=>{
  const claims=[{id:'d',type:'docket' as const,label:'Case',value:'1:24-cv-100',exact_source_text:'Case 1:24-cv-100',page:1}];
  const verification={resolver_id:'test',results:[{claim_id:'d',verdict:'MATCH' as const,explanation:'Exact record',evidence:[{title:'Court record',url:'https://court.example/case',excerpt:'1:24-cv-100',checked_at:'2026-09-27T00:00:00.000Z',source_mode:'SNAPSHOT' as const}],resolver_id:'test'}]};
  const reality=buildCaseReality(claims,verification);
  expect(reality.status).toBe('FOUND');expect(reality.detail).toContain('does not prove');
 });
});
