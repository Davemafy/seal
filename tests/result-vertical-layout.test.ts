import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('desktop vertical result navigation layout',()=>{
 it('places rail and result stage in the same grid row',()=>{
  const css=readFileSync('app/result-tabs-final.css','utf8');
  expect(css).toContain('grid-template-columns:132px minmax(0,1fr)!important');
  expect(css).toContain('grid-template-rows:minmax(0,1fr)!important');
  expect(css).toContain('grid-column:1!important');
  expect(css).toContain('grid-column:2!important');
  expect(css).toContain('grid-row:1!important');
 });
});
