import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('result carousel design contract',()=>{
 it('keeps result navigation horizontal and snap-based',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  const css=readFileSync('app/workspace.css','utf8');
  const start=app.indexOf('const jumpToResultSection');
  const end=app.indexOf('const [reviewOffer',start);
  const nav=app.slice(start,end);
  expect(app).toContain('resultCarouselRef');
  expect(app).toContain('data-testid="result-carousel"');
  expect(app).toContain('data-result-section="summary"');
  expect(app).toContain('data-result-section="message"');
  expect(app).toContain('data-result-section="evidence"');
  expect(app).toContain('data-result-section="next"');
  expect(nav).toContain('carousel.scrollTo({left:slide.offsetLeft');
  expect(nav).not.toContain('window.scrollTo');
  expect(css).toContain('scroll-snap-type:x mandatory');
  expect(css).toContain('scroll-snap-align:start');
  expect(css).toContain('.record-disclosure');
  expect(app).not.toContain('className="decision-visual"');
  expect(app).not.toContain('className="decision-overview"');
  expect(app).not.toContain('aria-label="Check snapshot"');
 });
});
