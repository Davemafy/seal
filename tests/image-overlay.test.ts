import {describe,expect,it} from 'vitest';
import {mapNormalizedBoxToFrame,ocrLineRegions,sameRenderedImageRect} from '../lib/image-overlay';

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

 it('groups OCR words into visual text lines without merging distant columns',()=>{
  const tokens=[
   {page:1,text:'Maryland',x:.1,y:.2,width:.12,height:.03,start:0,end:8,confidence:95},
   {page:1,text:'District',x:.23,y:.2,width:.1,height:.03,start:9,end:17,confidence:94},
   {page:1,text:'Court',x:.34,y:.2,width:.07,height:.03,start:18,end:23,confidence:96},
   {page:1,text:'12:24',x:.72,y:.2,width:.06,height:.03,start:24,end:29,confidence:90}
  ];
  const regions=ocrLineRegions(tokens);
  expect(regions).toHaveLength(2);
  expect(regions[0].text).toBe('Maryland District Court');
  expect(regions[1].text).toBe('12:24');
 });

 it('drops tiny OCR noise while retaining readable text coverage',()=>{
  const tokens=[
   {page:1,text:'A',x:.1,y:.1,width:.005,height:.004,start:0,end:1,confidence:15},
   {page:1,text:'Notice',x:.2,y:.3,width:.1,height:.03,start:2,end:8,confidence:88}
  ];
  const regions=ocrLineRegions(tokens);
  expect(regions).toHaveLength(1);
  expect(regions[0].text).toBe('Notice');
 });
});
