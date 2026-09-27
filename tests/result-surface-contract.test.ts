import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('result surface design contract',()=>{
 it('keeps Summary as one decision surface instead of stacking another snapshot product inside it',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  const css=readFileSync('app/workspace.css','utf8');
  expect(app).not.toContain('className="decision-visual"');
  expect(app).not.toContain('className="decision-overview"');
  expect(app).not.toContain('aria-label="Check snapshot"');
  expect(css).not.toContain('Result summary: primary decision + visual context.');
  expect(app).toContain("const primaryRoute=file?.sample");
  expect(app).toContain("resultStatusLabel=file?.sample");
  expect(app).toContain("workspaces.filter(item=>item.status!=='idle'||item.id===workspaceId)");
  expect(app).not.toContain('<select value={displayLocale}');
 });
});
