import {test,expect,type Page} from '@playwright/test';

test.skip(process.env.SEAL_PRODUCTION!=='1','production-only image gate');

async function syntheticImage(page:Page,path:string,phone:string){
 await page.setViewportSize({width:1180,height:760});
 await page.setContent(`<!doctype html><html><body style="margin:0;background:#e9ece8;font-family:Arial,sans-serif"><main id="card" style="width:900px;margin:70px auto;background:white;border:1px solid #aeb7af;padding:48px 56px;color:#1e2c24"><div style="font-size:16px;letter-spacing:.16em;font-weight:700;margin-bottom:34px">DEMO / SYNTHETIC IMAGE — NOT A REAL SUMMONS</div><h1 style="font-size:34px;margin:0 0 30px">UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT</h1><div style="font-size:25px;line-height:1.5">Jury Status Check Only: Call ${phone} after 5:30 PM.</div><p style="font-size:16px;margin-top:36px">Controlled engineering fixture. Fictional recipient. No personal data.</p></main></body></html>`);
 await page.locator('#card').screenshot({path});
}

test('deployed browser checks a synthetic image and a single-field altered image conservatively',async({page})=>{
 test.setTimeout(180000);
 const good='test-results/production-status-good.png',altered='test-results/production-status-altered.png';
 await syntheticImage(page,good,'1-866-388-2430');
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles(good);
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:60000});
 console.log('PRODUCTION_GOOD_INDEX',JSON.stringify(await page.locator('.index-item').allTextContents()));
 console.log('PRODUCTION_GOOD_TECHNICAL',await page.locator('.technical-record').textContent());
 await page.screenshot({path:'test-results/production-good-result.png',fullPage:true});
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-state.match')).toHaveCount(2);
 await page.locator('.index-item').filter({hasText:'Requested callback'}).click();
 await expect(page.locator('.claim-value')).toHaveText('1-866-388-2430');
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MATCH');

 await syntheticImage(page,altered,'1-203-555-0199');
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles(altered);
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:60000});
 console.log('PRODUCTION_ALTERED_INDEX',JSON.stringify(await page.locator('.index-item').allTextContents()));
 console.log('PRODUCTION_ALTERED_TECHNICAL',await page.locator('.technical-record').textContent());
 await page.screenshot({path:'test-results/production-altered-result.png',fullPage:true});
 await expect(page.locator('.index-state.mismatch')).toHaveCount(1);
 await page.locator('.index-item').filter({hasText:'Requested callback'}).click();
 await expect(page.locator('.claim-value')).toHaveText('1-203-555-0199');
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MISMATCH');
 await expect(page.locator('.focused-evidence .evidence-excerpt')).toHaveCount(1);
 await expect(page.locator('.focused-evidence .additional-sources')).toHaveCount(1);
 await expect(page.locator('.technical-record')).toContainText('Jury Service Contact & Parking Information');
 await expect(page.locator('.technical-record')).toContainText('District of Connecticut jury FAQs');
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:800-827-8224');
});
