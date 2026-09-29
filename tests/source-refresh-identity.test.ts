import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('source refresh preserves check identity',()=>{
 it('does not rerun extraction when the refresh control is used',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  expect(app).toContain('async function recheckSources()');
  expect(app).not.toContain("onClick={()=>run('LIVE')}");
  const recheck=app.slice(app.indexOf('async function recheckSources()'),app.indexOf('const select=useCallback'));
  expect(recheck).toContain("fetch('/api/verify'");
  expect(recheck).not.toContain("fetch('/api/extract'");
  expect(recheck).not.toContain('setClaims(');
  expect(recheck).not.toContain('setWorkspaceTitle(');
  expect(recheck).not.toContain('setFile(');
 });

 it('persists Browse origin metadata across reloads and rechecks',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  const session=readFileSync('lib/result-session.ts','utf8');
  expect(session).toContain('origin?:StoredCheckOrigin');
  expect(app).toContain('setCheckOrigin(restoredOrigin)');
  expect(app).toContain("curated_case_id:caseId");
  expect(app).toContain('origin:checkOrigin||undefined');
  expect(app).toContain("browseCaseIdFromWorkspace(workspaceId)");
 });
});
