describe('grounded document segmentation',()=>{
 const mixed=`PUBLIC NOTICE: Jury scam alert
The District Court warns that scammers may impersonate court staff.
Report suspicious contact to law enforcement.
SAMPLE OF FRAUDULENT EMAIL
Subject: Jury Duty Summons
Click Download Jury Summons.
Contact the Jury Office immediately.`;

 it('accepts model-selected boundaries only when both recipient edges and wrapper evidence are grounded',()=>{
  const segmented=validateDocumentSegmentation(mixed,{
   role:'mixed_with_embedded_example',
   recipient_start_quote:'SAMPLE OF FRAUDULENT EMAIL',
   recipient_end_quote:'Contact the Jury Office immediately.',
   wrapper_evidence_quote:'The District Court warns that scammers may impersonate court staff.',
   context_institution:'District Court',
   context_institution_quote:'The District Court warns that scammers may impersonate court staff.',
   context_jurisdiction:'',
   context_jurisdiction_quote:'',
   context_document_type:'Public notice',
   context_document_type_quote:'PUBLIC NOTICE: Jury scam alert'
  });
  expect(segmented?.role).toBe('mixed_with_embedded_example');
  expect(segmented?.recipientText).toMatch(/^SAMPLE OF FRAUDULENT EMAIL/);
  expect(segmented?.recipientText).not.toContain('Report suspicious contact');
  expect(segmented?.provenanceContext?.institution?.value).toBe('District Court');
  expect(segmented?.provenanceContext?.document_type?.value).toBe('Public notice');
 });

 it('rejects invented or wrapper-inside-recipient boundaries',()=>{
  expect(validateDocumentSegmentation(mixed,{
   role:'mixed_with_embedded_example',
   recipient_start_quote:'SAMPLE OF FRAUDULENT EMAIL',
   recipient_end_quote:'invented ending',
   wrapper_evidence_quote:'Jury scam alert',
   context_institution:'',context_institution_quote:'',context_jurisdiction:'',context_jurisdiction_quote:'',context_document_type:'',context_document_type_quote:''
  })).toBeNull();
  expect(validateDocumentSegmentation(mixed,{
   role:'mixed_with_embedded_example',
   recipient_start_quote:'SAMPLE OF FRAUDULENT EMAIL',
   recipient_end_quote:'Contact the Jury Office immediately.',
   wrapper_evidence_quote:'Click Download Jury Summons.',
   context_institution:'',context_institution_quote:'',context_jurisdiction:'',context_jurisdiction_quote:'',context_document_type:'',context_document_type_quote:''
  })).toBeNull();
 });

 it('uses the full artifact for ordinary received messages',()=>{
  const notice='DISTRICT COURT OF NORTHBRIDGE\nYou must appear on October 14, 2026.';
  const segmented=validateDocumentSegmentation(notice,{role:'received_message',recipient_start_quote:'',recipient_end_quote:'',wrapper_evidence_quote:'',context_institution:'',context_institution_quote:'',context_jurisdiction:'',context_jurisdiction_quote:'',context_document_type:'',context_document_type_quote:''});
  expect(segmented?.recipientText).toBe(notice);
 });
});

import {describe,expect,it} from 'vitest';
import {validateDocumentSegmentation,validateEvidenceRelations,validateGroundedSemanticContext} from '../lib/semantic-grounding';
import type {Claim} from '../lib/types';

describe('grounded semantic document layer',()=>{
 const text='HM Courts & Tribunals Service\nNOTICE OF ENFORCEMENT\nA payment of £2560 is required immediately.';

 it('keeps semantic fields only when their evidence is present in the artifact',()=>{
  const value=validateGroundedSemanticContext(text,{
   institution:{value:'HM Courts & Tribunals Service',quote:'HM Courts & Tribunals Service'},
   document_type:{value:'Notice of Enforcement',quote:'NOTICE OF ENFORCEMENT'},
   jurisdiction:{value:'United Kingdom',evidence_quote:'HM Courts & Tribunals Service'},
   requested_actions:[{kind:'pay',quote:'A payment of £2560 is required immediately.',target:'£2560'}],
   search_intents:['HM Courts Tribunals Service Notice of Enforcement payment warning']
  });
  expect(value?.institution?.value).toBe('HM Courts & Tribunals Service');
  expect(value?.document_type?.value).toBe('Notice of Enforcement');
  expect(value?.requested_actions?.[0]?.kind).toBe('pay');
  expect(value?.search_intents).toEqual(['HM Courts Tribunals Service Notice of Enforcement payment warning']);
 });

 it('drops hallucinated evidence and unanchored retrieval plans',()=>{
  const value=validateGroundedSemanticContext(text,{
   institution:{value:'Royal Courts Agency',quote:'Royal Courts Agency'},
   document_type:{value:'Notice of Enforcement',quote:'NOTICE OF ENFORCEMENT'},
   jurisdiction:{value:'Canada',evidence_quote:'Canada'},
   requested_actions:[{kind:'pay',quote:'Pay $500 by Bitcoin',target:'$500'}],
   search_intents:['Canadian federal court bitcoin warning','random legal news']
  });
  expect(value?.institution).toBeUndefined();
  expect(value?.jurisdiction).toBeUndefined();
  expect(value?.requested_actions).toEqual([]);
  expect(value?.search_intents).toEqual([]);
  expect(value?.document_type?.value).toBe('Notice of Enforcement');
 });
});

describe('grounded official-source interpretation',()=>{
 const claim:Claim={
  id:'pay-1',
  type:'payment',
  label:'Requested payment',
  value:'£2560',
  exact_source_text:'A payment of £2560 is required immediately.',
  page:1,
  action:{verb:'pay',kind:'pay',object:'payment of £2560',target_type:'money',target_value:'£2560',qualifiers:['required','immediately'],source_text:'A payment of £2560 is required immediately.'}
 };
 const source='HM Courts & Tribunals Service warns about false Notice of Enforcement documents. These emails are not genuine and you should not make a payment from the notice.';

 it('accepts only relations grounded by an exact official-source quote',()=>{
  const relations=validateEvidenceRelations(source,[claim],{
   relations:[{
    claim_id:'pay-1',
    relation:'CONTRADICTS',
    source_quote:'These emails are not genuine and you should not make a payment from the notice.',
    reason:'The official warning tells recipients not to pay from this notice.',
    scope:'payment route'
   }]
  });
  expect(relations).toHaveLength(1);
  expect(relations[0].relation).toBe('CONTRADICTS');
 });

 it('rejects invented source passages, unknown claims, and verdict-shaped model output',()=>{
  expect(validateEvidenceRelations(source,[claim],{
   relations:[{claim_id:'pay-1',relation:'CONTRADICTS',source_quote:'This exact document is fraudulent.',reason:'invented',scope:'document'}]
  })).toEqual([]);
  expect(validateEvidenceRelations(source,[claim],{
   relations:[{claim_id:'other',relation:'CONTRADICTS',source_quote:'These emails are not genuine',reason:'wrong claim',scope:'payment'}]
  })).toEqual([]);
  expect(validateEvidenceRelations(source,[claim],{
   relations:[{claim_id:'pay-1',relation:'MISMATCH',source_quote:'These emails are not genuine',reason:'attempted verdict',scope:'payment'}]
  })).toEqual([]);
 });
});
