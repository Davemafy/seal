import {describe,it,expect} from 'vitest';
import {detectEmbeddedRecipientScope} from '../lib/document-scope';

describe('deterministic document-scope fallback',()=>{
 it('separates a clearly headed advisory sample when the model provider is unavailable',()=>{
  const text=`PUBLIC NOTICE: Jury Duty Email, Text, and Phone Scam Alert
The District Court warns citizens about fraudulent emails.
Report the incident to local law enforcement.

SAMPLE OF FRAUDULENT EMAIL
Subject: URGENT: Jury Duty Summons
Please click the button below: Download Jury Summons`;
  const scoped=detectEmbeddedRecipientScope(text);
  expect(scoped?.documentRole).toBe('mixed_with_embedded_example');
  expect(scoped?.analysisText).toMatch(/^SAMPLE OF FRAUDULENT EMAIL/);
  expect(scoped?.analysisText).toContain('Download Jury Summons');
  expect(scoped?.analysisText).not.toContain('Report the incident');
 });

 it('stays conservative when the sample boundary is not explicit',()=>{
  const text=`DISTRICT COURT OF NORTHBRIDGE
NOTICE TO APPEAR
You must appear on October 14, 2026.
Example communication reference: EMAIL-2048.
Bring this notice with you.`;
  expect(detectEmbeddedRecipientScope(text)).toBeNull();
 });
});
