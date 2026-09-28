import {describe,it,expect} from 'vitest';
import {safeWorkspaceTitle} from '../lib/workspace-title';

describe('workspace title hygiene',()=>{
 it('keeps concise authority names',()=>{
  expect(safeWorkspaceTitle('Supreme Court of India')).toBe('Supreme Court of India');
  expect(safeWorkspaceTitle('Maryland District Court')).toBe('Maryland District Court');
 });

 it('rejects message instructions and long OCR headings',()=>{
  expect(safeWorkspaceTitle('NOTICE OF HEARING — PARKING VIOLATION. Appear for a hearing at the District Court in Baltimore City or resolve the matter by payment before the hearing date. Scan the QR code to pay')).toBe('');
  expect(safeWorkspaceTitle('Appear before the Court WITHOUT FAILURE at the scheduled hearing')).toBe('');
 });

 it('rejects noisy OCR fragments',()=>{
  expect(safeWorkspaceTitle('f f ; 9) ù IN THE DISTRICT COURT')).toBe('');
 });
});
