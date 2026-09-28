import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Browse handoff stability',()=>{
 it('uses one stable workspace per Browse case',()=>{
  const grid=readFileSync('app/browse/browse-grid.tsx','utf8');
  expect(grid).toContain('const id=`browse-${caseId}`');
  expect(grid).not.toContain('Date.now().toString(36)');
  expect(grid).not.toContain('Math.random().toString(36)');
 });

 it('falls back to the checked-in Browse asset when the authority origin fails',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  expect(app).toContain('cachedThumbnailBlob');
  expect(app).toContain('if(!sourceFile&&cachedThumbnailBlob)');
  expect(app).toContain('`${caseId}-cached.jpg`');
 });
});
