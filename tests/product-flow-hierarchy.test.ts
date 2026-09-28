import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('product flow hierarchy',()=>{
 it('keeps processing contextual instead of marketing-led',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  expect(app).toContain('processingContextTitle');
  expect(app).not.toContain('SEAL is separating what the message asks you to do from what independent public sources can actually establish.');
  expect(app).not.toContain('processing-entry-kicker');
 });

 it('gives Summary a compact proof digest and one local tab model',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  expect(app).toContain('data-testid="decision-proof-digest"');
  expect(app).toContain("resultUi('whatSealFound')");
  expect(app).toContain('role="tablist"');
  expect(app).not.toContain('data-testid="two-risk-result"');
 });
});
