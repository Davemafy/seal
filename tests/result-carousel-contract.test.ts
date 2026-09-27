import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('result carousel design contract',()=>{
 it('keeps result tabs on the horizontal carousel rather than window scrolling',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  const css=readFileSync('app/workspace.css','utf8');
  const start=app.indexOf('const jumpToResultSection');
  const end=app.indexOf('const [reviewOffer',start);
  const navigation=app.slice(start,end);
  expect(app).toContain('resultCarouselRef');
  expect(app).toContain('data-testid="result-carousel"');
  expect(navigation).toContain('carousel.scrollTo({left:slide.offsetLeft');
  expect(navigation).not.toContain('window.scrollTo');
  expect(css).toContain('scroll-snap-type:x mandatory');
  expect(css).toContain('scroll-snap-align:start');
  expect(css).toContain('.record-disclosure');
 });
});
