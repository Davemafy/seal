import {test,expect} from '@playwright/test';

test('demo connects each claim to an independent source and safe contact',async({page})=>{
 await page.goto('/demo');
 await expect(page.getByText('DEMO / FICTIONAL NOTICE').first()).toBeVisible();
 await page.getByRole('button',{name:'Check this notice'}).click();
 await expect(page.getByText('9 claims checked')).toBeVisible({timeout:20000});
 await expect(page.locator('.index-item')).toHaveCount(9);
 await expect(page.locator('.index-state.mismatch').first()).toBeVisible();
 await expect(page.locator('.index-state.match').first()).toBeVisible();
 await expect(page.locator('.index-state.could_not_verify').first()).toBeVisible();
 await page.getByRole('button',{name:/Jury service website:/}).click();
 await expect(page.locator('.claim-value')).toHaveText('rcvduty.com');
 await expect(page.getByRole('link',{name:/Open official source/}).first()).toHaveAttribute('href',/riverside.courts.ca.gov/);
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:951-275-5076');
 await page.getByText('Technical record').click();
 await expect(page.getByText(/Resolver: riverside/)).toBeVisible();
 await page.getByRole('button',{name:/New notice/}).click();
 await expect(page.getByRole('button',{name:/Try the demo notice/})).toBeVisible();
});

test('mobile review keeps the chosen claim and its evidence together',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo');
 await page.getByRole('button',{name:'Check this notice'}).click();
 await expect(page.getByText('9 claims checked')).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:/Show list/}).click();
 await page.getByRole('button',{name:/05 Jury contact number/}).click();
 await expect(page.locator('.claim-value')).toHaveText('(866) 555-0199');
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MISMATCH');
 await expect(page.locator('.focused-evidence .official-link')).toHaveAttribute('href',/riverside.courts.ca.gov/);
 await page.getByRole('button',{name:/Show list/}).click();
 await expect(page.locator('.claim-index-list')).toHaveClass(/mobile-open/);
});

test('public sample summons uploads without a fabricated mismatch or URL',async({page})=>{
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles('tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:20000});
 await expect(page.getByText('Page 1 of 1')).toBeVisible();
 await expect(page.getByText(/This document is marked SAMPLE/)).toBeVisible();
 // The printed court heading must render in the canvas; PDF text extraction alone
 // did not catch a previous deployment where unembedded fonts appeared blank.
 await expect.poll(async()=>page.locator('canvas').evaluate(canvas=>{
  const context=(canvas as HTMLCanvasElement).getContext('2d');if(!context)return 0;
  const pixels=context.getImageData(45,55,380,45).data;let ink=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]<110&&pixels[i+1]<110&&pixels[i+2]<110&&pixels[i+3]>200)ink++;
  return ink;
 }),{timeout:20000}).toBeGreaterThan(120);
 await page.getByRole('button',{name:'Check this notice'}).click();
 await expect(page.getByText('5 claims checked')).toBeVisible({timeout:30000});
 await expect(page.getByText('NO JURY-SOURCE COVERAGE')).toBeVisible();
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-item')).toHaveCount(5);
 await page.locator('.index-item').filter({hasText:'Juror reference'}).click();
 await expect(page.locator('.claim-value')).toHaveText('02-0140');
 await page.locator('.index-item').filter({hasText:'Reporting date'}).click();
 await expect(page.locator('.claim-value')).toContainText('March 28(Tue.), May 3(Wed.)');
 await page.locator('.index-item').filter({hasText:'Jury contact number'}).click();
 await expect(page.locator('.claim-value')).toHaveText('1-866-388-2430');
 await expect(page.getByText('g.AREyOUASALARIEDEMPLoYEE')).toHaveCount(0);
});
