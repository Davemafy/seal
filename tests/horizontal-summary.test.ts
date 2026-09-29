import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('horizontal Summary evidence rail',()=>{
 it('shows the three core findings without restoring the heavy proof digest',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  expect(app).toContain('data-testid="decision-evidence-rail"');
  expect(app).toContain("resultUi('messageInstructions')");
  expect(app).toContain("resultUi('underlyingMatter')");
  expect(app).toContain("resultUi('sourceEvidence')");
  expect(app).not.toContain('data-testid="decision-proof-digest"');
  expect(app).not.toContain('data-testid="two-risk-result"');
 });
});
