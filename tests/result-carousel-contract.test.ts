import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('result tabbed flow design contract',()=>{
 it('uses one explicit result navigation model',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  expect(app).toContain('role="tablist"');
  expect(app).toContain('role="tab"');
  expect(app).toContain('role="tabpanel"');
  expect(app).toContain('data-testid="result-tabs-stage"');
  expect(app).toContain("hidden={activeResultSection!=='summary'}");
  expect(app).toContain("hidden={activeResultSection!=='message'}");
  expect(app).toContain("hidden={activeResultSection!=='evidence'}");
  expect(app).toContain("hidden={activeResultSection!=='next'}");
  expect(app).not.toContain('resultCarouselRef');
  expect(app).not.toContain('syncResultCarousel');
  expect(app).not.toContain('resultSectionStorageKey');
  expect(app).not.toContain('review-autoplay-overlay');
  expect(app).not.toContain("reviewOffer==='counting'");
 });
});
