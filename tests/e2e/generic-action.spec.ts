import {test,expect,type Page} from '@playwright/test';

async function makeSmallGenericNotice(page:Page,path:string){
 await page.setViewportSize({width:526,height:791});
 await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff;font-family:Arial,sans-serif;color:#111"><main id="notice" style="width:486px;height:751px;box-sizing:border-box;margin:20px;padding:24px;border:1px solid #222"><div style="font-size:10px;letter-spacing:.12em">DEMO / SYNTHETIC NOTICE — NOT A REAL COURT</div><h1 style="font-size:20px;line-height:1.25;text-align:center;margin:28px 0 8px">IN THE MUNICIPAL COURT OF NORTHBRIDGE</h1><div style="font-size:13px;text-align:center;margin-bottom:28px">CIVIL DIVISION · CASE NO: NB-2026-1048</div><h2 style="font-size:15px;margin:0 0 18px">MANDATORY RESPONSE</h2><p style="font-size:14px;line-height:1.5">Remit the outstanding balance through the court payment system.</p><p style="font-size:14px;line-height:1.5">Scan the code below to continue.</p><div style="width:86px;height:86px;margin:14px auto;border:8px double #111;background:repeating-linear-gradient(45deg,#111 0 5px,#fff 5px 10px)"></div><p style="font-size:14px;line-height:1.5">Appear at the courthouse on May 4, 2027.</p><p style="font-size:11px;line-height:1.5;margin-top:44px">Controlled engineering fixture. Fictional jurisdiction. No personal data.</p></main></body></html>`);
 await page.locator('#notice').screenshot({path});
}

test('small unsupported image still yields a generic action graph before abstaining',async({page})=>{
 test.setTimeout(120000);
 const path='test-results/generic-small-notice.png';
 await makeSmallGenericNotice(page,path);
 await page.setViewportSize({width:1180,height:860});
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles(path);
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:60000});
 await expect(page.locator('.index-item').filter({hasText:'Requested payment'})).toBeVisible();
 await expect(page.locator('.index-item').filter({hasText:'Requested scan'})).toBeVisible();
 await expect(page.locator('.index-item').filter({hasText:'Requested appearance'})).toBeVisible();
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-state.match')).toHaveCount(0);
 const states=page.locator('.index-state.could_not_verify');
 await expect(states).not.toHaveCount(0);
 await page.screenshot({path:'test-results/generic-small-result.png',fullPage:true});
});
