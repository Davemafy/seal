import {describe,expect,it} from 'vitest';
import {browseDiscoverySources,hostAllowed} from '../lib/browse-source-registry';
import {browseCases,curatedBrowseCases} from '../lib/browse-cases';
import discoveredFeed from '../lib/browse-discovered.generated.json';

describe('Browse discovery trust boundary',()=>{
 it('only indexes HTTPS authority pages on their own allowlists',()=>{
  expect(browseDiscoverySources.length).toBeGreaterThanOrEqual(3);
  for(const source of browseDiscoverySources){
   expect(source.indexUrl.startsWith('https://')).toBe(true);
   expect(hostAllowed(source.indexUrl,source)).toBe(true);
   expect(source.allowedHosts.length).toBeGreaterThan(0);
   expect(source.includeTerms.length).toBeGreaterThan(0);
  }
 });


 it('keeps the generated feed visually credible and source-diverse',()=>{
  const items=discoveredFeed as typeof browseCases;
  const issuerCounts=new Map<string,number>();
  for(const item of items){
   expect(item.id.startsWith('feed-')).toBe(true);
   expect(item.sourceUrl.startsWith('https://')).toBe(true);
   expect(item.preview.url.startsWith('https://')).toBe(true);
   expect(item.preview.alt.toLowerCase()).not.toBe('home');
   expect(item.preview.url).not.toMatch(/(?:^|[\/_-])(logo|icon|favicon)(?:[\/_\-.]|$)/i);
   const count=(issuerCounts.get(item.issuer)||0)+1;
   issuerCounts.set(item.issuer,count);
   expect(count).toBeLessThanOrEqual(2);
  }
 });

 it('never lets the generated feed replace a curated source',()=>{
  const curatedUrls=new Set(curatedBrowseCases.map(item=>item.sourceUrl));
  expect(new Set(browseCases.map(item=>item.id)).size).toBe(browseCases.length);
  expect(browseCases.filter(item=>curatedUrls.has(item.sourceUrl)).length).toBe(curatedBrowseCases.length);
 });
});
