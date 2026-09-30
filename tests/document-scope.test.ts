import {describe,it,expect} from 'vitest';
import {detectEmbeddedRecipientScope} from '../lib/document-scope';
import {fallbackExtract} from '../lib/extract';

describe('embedded recipient message scoping',()=>{
 it('separates an official fraud advisory from the sample message inside it',()=>{
  const text=`PUBLIC NOTICE: Jury Duty Email, Text, and Phone Scam Alert
To the Citizens of Washington, DC,
The United States District Court for the District of Columbia has been made aware of a recent scam regarding individuals impersonating court officials.
Please be advised:
Do not click any links or download attachments from suspicious emails claiming to be from the court.
Report the incident to local law enforcement.

SAMPLE OF FRAUDULENT EMAIL
Subject: URGENT: Jury Duty Summons – Immediate Response Required
Please click the button below: Download Jury Summons
If you believe this notice was received in error, contact the Jury Office immediately.`;
  const scoped=detectEmbeddedRecipientScope(text);
  expect(scoped?.documentRole).toBe('mixed_with_embedded_example');
  expect(scoped?.wrapperText).toContain('PUBLIC NOTICE');
  expect(scoped?.analysisText).toMatch(/^SAMPLE OF FRAUDULENT EMAIL/);
  expect(scoped?.analysisText).not.toContain('Report the incident to local law enforcement');
  const extraction=fallbackExtract(scoped!.analysisText);
  expect(extraction.requested_actions?.some(action=>/Download Jury Summons/i.test(action.exact_quote))).toBe(true);
  expect(extraction.requested_actions?.some(action=>/Report the incident/i.test(action.exact_quote))).toBe(false);
 });

 it('detects an embedded sample when PDF extraction joins the marker to the previous page sentence',()=>{
  const text=`PUBLIC NOTICE: Jury Duty Email, Text, and Phone Scam Alert
To the Citizens of Washington, DC,
The United States District Court for the District of Columbia has been made aware of a recent scam.
Report the incident to local law enforcement.
You may also contact the court directly to verify the legitimacy of any jury summons. SAMPLE OF FRAUDULENT EMAIL
Subject: URGENT: Jury Duty Summons – Immediate Response Required
UNITED STATES DISTRICT COURT
To download your official Jury Summons form and complete the required documentation, please click the button below:
Download Jury Summons
If you have questions, contact the Jury Office immediately.`;
  const scoped=detectEmbeddedRecipientScope(text);
  expect(scoped?.documentRole).toBe('mixed_with_embedded_example');
  expect(scoped?.wrapperText).toContain('District of Columbia');
  expect(scoped?.analysisText).toMatch(/^SAMPLE OF FRAUDULENT EMAIL/);
  expect(scoped?.analysisText).not.toContain('Report the incident');
  const extraction=fallbackExtract(scoped!.analysisText);
  expect(extraction.requested_actions?.some(action=>/Download Jury Summons/i.test(action.exact_quote))).toBe(true);
  expect(extraction.requested_actions?.some(action=>/Report the incident/i.test(action.exact_quote))).toBe(false);
 });

 it('splits the sample even when the marker is glued directly to wrapper text',()=>{
  const text=`PUBLIC NOTICE: Jury Duty Email, Text, and Phone Scam Alert
The United States District Court for the District of Columbia has been made aware of a recent scam.
Please be advised: do not click suspicious links. Report the incident to local law enforcement.
You may contact the court directly to verify any jury summonsSAMPLE OF FRAUDULENT EMAIL
Subject: URGENT: Jury Duty Summons – Immediate Response Required
UNITED STATES DISTRICT COURT
To download your official Jury Summons form and complete the required documentation, please click the button below:
Download Jury Summons
If you believe this notice was received in error, you must contact the Jury Office immediately.`;
  const scoped=detectEmbeddedRecipientScope(text);
  expect(scoped?.documentRole).toBe('mixed_with_embedded_example');
  expect(scoped?.analysisText).toMatch(/^SAMPLE OF FRAUDULENT EMAIL/);
  expect(scoped?.analysisText).not.toContain('Report the incident');
  const extraction=fallbackExtract(scoped!.analysisText);
  const actions=extraction.requested_actions?.map(action=>action.exact_quote)||[];
  expect(actions.some(action=>/Download Jury Summons/i.test(action))).toBe(true);
  expect(actions.some(action=>/Report the incident/i.test(action))).toBe(false);
  expect(actions.some(action=>/Please be advised/i.test(action))).toBe(false);
 });

 it('splits an OCR-damaged sample marker without promoting advisory actions',()=>{
  const text=`PUBLIC NOTICE: Jury Duty Scam Alert
The District Court warns citizens about fraudulent emails.
Please be advised: Report the incident to local law enforcement.
SAMPLE   OF   FRAUDULENT   E-MAIL
Subject: Jury Duty Summons
Click the button below to download your summons.`;
  const scoped=detectEmbeddedRecipientScope(text);
  expect(scoped?.analysisText).toMatch(/^SAMPLE\s+OF\s+FRAUDULENT\s+E-MAIL/i);
  expect(scoped?.analysisText).not.toContain('Report the incident');
 });

 it('does not split a normal court notice merely because it mentions an example',()=>{
  const text=`DISTRICT COURT OF NORTHBRIDGE
NOTICE TO APPEAR
You must appear on October 14, 2026.
Example communication reference: EMAIL-2048.
Bring this notice with you.`;
  expect(detectEmbeddedRecipientScope(text)).toBeNull();
 });
});
