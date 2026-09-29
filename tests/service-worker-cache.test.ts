import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('service worker deployment safety',()=>{
 it('does not serve application code cache-first',()=>{
  const sw=readFileSync('public/sw.js','utf8');
  expect(sw).toContain("CACHE_NAME='seal-shell-v2'");
  expect(sw).toContain("request.destination==='script'||request.destination==='style'");
  const codeBranch=sw.slice(sw.indexOf("request.destination==='script'"),sw.indexOf('// Fonts/images'));
  expect(codeBranch.indexOf('fetch(request)')).toBeLessThan(codeBranch.indexOf('caches.match(request)'));
 });
});
