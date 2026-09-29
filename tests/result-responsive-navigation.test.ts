import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('responsive result navigation',()=>{
 it('keeps one tab model and presents it vertically only on desktop',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  const css=readFileSync('app/result-tabs-final.css','utf8');
  expect(app).toContain('className="result-workspace-shell"');
  expect(app).toContain('role="tablist"');
  expect(css).toContain('grid-template-columns:132px minmax(0,1fr)');
  expect(css).toContain('flex-direction:column!important');
  expect(css).toContain('@media(max-width:900px)');
  expect(css).toContain('flex-direction:row!important');
 });
});
