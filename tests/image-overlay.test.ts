import {describe,expect,it} from 'vitest';
import {mapNormalizedBoxToFrame,sameRenderedImageRect} from '../lib/image-overlay';

describe('image claim overlay geometry',()=>{
 it('maps OCR coordinates against the rendered image rather than its letterboxed frame',()=>{
  const mapped=mapNormalizedBoxToFrame(
   {x:.1,y:.25,width:.5,height:.1},
   {left:80,top:20,width:600,height:400},
   {left:20,top:10}
  );
  expect(mapped).toEqual({left:120,top:110,width:300,height:40});
 });

 it('keeps the same normalized claim aligned when the image is centered in a wider frame',()=>{
  const claim={x:.2,y:.4,width:.3,height:.08};
  const narrow=mapNormalizedBoxToFrame(claim,{left:0,top:0,width:500,height:800},{left:0,top:0});
  const letterboxed=mapNormalizedBoxToFrame(claim,{left:180,top:30,width:500,height:800},{left:20,top:10});
  expect(letterboxed.left-narrow.left).toBe(160);
  expect(letterboxed.top-narrow.top).toBe(20);
  expect(letterboxed.width).toBe(narrow.width);
  expect(letterboxed.height).toBe(narrow.height);
 });

 it('does not churn layout state for subpixel observer noise',()=>{
  const current={preview:'blob:1',left:10,top:20,width:600,height:400};
  expect(sameRenderedImageRect(current,{preview:'blob:1',left:10.2,top:19.8,width:600.2,height:399.9})).toBe(true);
  expect(sameRenderedImageRect(current,{preview:'blob:2',left:10,top:20,width:600,height:400})).toBe(false);
 });
});
