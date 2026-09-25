import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';

test('action-first demo connects requested actions to official guidance and a safe court contact',async({page})=>{
 await page.goto('/demo');
 await expect(page.getByText('DEMO / SYNTHETIC MESSAGE').first()).toBeVisible();
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/\d+ claims checked/)).toBeVisible({timeout:20000});
 await expect(page.locator('.index-state.mismatch')).toHaveCount(3);
 await expect(page.locator('.action-callout')).toContainText(/pay \$750 today using Cash App/i);
 await expect(page.locator('.claim-value')).toContainText(/pay \$750 today using Cash App/i);
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MISMATCH');
 await expect(page.locator('.focused-evidence .official-link')).toHaveAttribute('href',/consumer\.ftc\.gov/);
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:800-827-8224');
 await expect(page.getByText(/not authenticate this message/i)).toBeVisible();
 await page.screenshot({path:'test-results/desktop-action.png',fullPage:true});
});

test('landing supports paste as a first-class input',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Before you call/i})).toBeVisible();
 await page.getByLabel('Paste the court message').fill(`UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT
TEXT MESSAGE: You missed jury duty. To avoid arrest, pay $400 using a gift card.
Call 203-555-0188 for payment instructions.`);
 await page.getByRole('button',{name:/Check this message/}).click();
 await expect(page.getByRole('heading',{name:'Pasted message'})).toBeVisible();
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:20000});
 await expect(page.locator('.index-state.mismatch').first()).toBeVisible();
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:800-827-8224');
});

test('mobile review keeps action, verdict, evidence, and contact legible',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/demo');
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:20000});
 await expect(page.locator('.action-callout')).toContainText(/pay \$750 today using Cash App/i);
 await page.getByRole('button',{name:/Show list/}).click();
 await page.locator('.index-item').filter({hasText:'Requested callback'}).click();
 await expect(page.locator('.claim-value')).toHaveText('203-555-0199');
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MISMATCH');
 await expect(page.locator('.focused-evidence .official-link')).toHaveAttribute('href',/consumer\.ftc\.gov/);
 await page.screenshot({path:'test-results/mobile-action.png',fullPage:true});
});

test('public Connecticut sample corroborates public details and abstains on private details',async({page})=>{
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles('tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:20000});
 await expect(page.getByText('Page 1 of 1')).toBeVisible();
 await expect(page.getByText(/This document is marked SAMPLE/)).toBeVisible();
 await expect.poll(async()=>page.locator('canvas').evaluate(canvas=>{
  const context=(canvas as HTMLCanvasElement).getContext('2d');if(!context)return 0;
  const pixels=context.getImageData(45,55,380,45).data;let ink=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]<110&&pixels[i+1]<110&&pixels[i+2]<110&&pixels[i+3]>200)ink++;
  return ink;
 }),{timeout:20000}).toBeGreaterThan(120);
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText('5 claims checked')).toBeVisible({timeout:30000});
 await expect(page.getByText('SOURCE SNAPSHOT · 25 SEP 2026')).toBeVisible();
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-state.match')).toHaveCount(3);
 await expect(page.locator('.index-state.could_not_verify')).toHaveCount(2);
 await page.locator('.index-item').filter({hasText:'Juror reference'}).click();
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('COULD NOT VERIFY');
 await page.locator('.index-item').filter({hasText:'Requested callback'}).click();
 await expect(page.locator('.claim-value')).toHaveText('1-866-388-2430');
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MATCH');
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:800-827-8224');
});

test('dense Connecticut PNG keeps readable fields and abstains on the low-confidence phone',async({page})=>{
 test.skip(!existsSync('tests/generated/connecticut-dense.png'),'generated in CI from the public sample PDF');
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles('tests/generated/connecticut-dense.png');
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:45000});
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:60000});
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-state.match').first()).toBeVisible();
 const unreadable=page.locator('.index-item').filter({hasText:'Unreadable phone number'});
 await expect(unreadable).toBeVisible();
 await unreadable.click();
 await expect(page.locator('.claim-value')).toContainText('couldn’t read this field confidently');
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('COULD NOT VERIFY');
});

test('unsupported jurisdictions remain unverified',async({page})=>{
 await page.goto('/demo');
 await page.getByLabel('Choose demo fixture').selectOption('unsupported-court-demo');
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:20000});
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-state.match')).toHaveCount(0);
 await expect(page.locator('.index-state.could_not_verify').first()).toBeVisible();
});

test('official-source conflict shows both sources and no red verdict',async({page})=>{
 await page.goto('/demo');
 await page.getByLabel('Choose demo fixture').selectOption('riverside-conflict-demo');
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:20000});
 await page.locator('.index-item').filter({hasText:'Jury contact number'}).click();
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('COULD NOT VERIFY');
 await expect(page.getByText('Official sources currently disagree.')).toBeVisible();
 await expect(page.locator('.focused-evidence .evidence-excerpt')).toHaveCount(2);
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
});

test('failed live fetch state preserves abstention and independently sourced contact',async({page})=>{
 await page.route('**/api/verify',async route=>{
  const data=route.request().postDataJSON() as {mode?:string;claims?:Array<{id:string}>};
  if(data.mode!=='LIVE')return route.continue();
  const claims=data.claims||[];
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   resolver_id:'connecticut',
   results:claims.map(c=>({claim_id:c.id,verdict:'COULD_NOT_VERIFY',explanation:'Official source could not be reached during this check.',evidence:[],resolver_id:'connecticut'})),
   contact:{phone:'800-827-8224',website:'https://www.ctd.uscourts.gov/contact-parking-information',source:{title:'Jury Service Contact & Parking Information',url:'https://www.ctd.uscourts.gov/contact-parking-information',excerpt:'Other Jury Questions: Call (800) 827-8224.',checked_at:'2026-09-25T00:00:00.000Z',source_mode:'SNAPSHOT'}}
  })});
 });
 await page.goto('/demo');
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:/Check live sources/}).click();
 await expect(page.getByText(/live pages didn’t respond/i)).toBeVisible();
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:800-827-8224');
});
