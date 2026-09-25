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


async function makeDenseEnforcementNotice(page:Page,path:string){
 await page.setViewportSize({width:526,height:791});
 await page.setContent(`<!doctype html><html><body style="margin:0;background:white;font-family:Arial,sans-serif;color:#111"><main id="notice" style="width:506px;height:771px;margin:10px;padding:14px;box-sizing:border-box;border:1px solid #222"><div style="font-size:9px;text-align:center;letter-spacing:.08em">DEMO / SYNTHETIC NOTICE — FICTIONAL JURISDICTION</div><h1 style="font-size:17px;text-align:center;line-height:1.15;margin:12px 0 3px">COMMONWEALTH OF ALDER</h1><h2 style="font-size:14px;text-align:center;margin:0">IN THE DISTRICT COURT OF ALDER</h2><div style="font-size:11px;text-align:center;margin:3px 0 12px">FOR NORTHBRIDGE · TRAFFIC DIVISION</div><div style="border-top:4px solid #111;border-bottom:1px solid #111;padding:5px 0;text-align:center;font-size:12px;font-weight:700">FINAL ENFORCEMENT NOTICE — COMPLIANCE REQUIRED</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px;border-top:1px solid #333;border-bottom:1px solid #333;padding:7px 0;font-size:9px;line-height:1.35"><div><b>VIOLATION</b><br>Failure to Pay Electronic Toll / Toll Evasion<br>Parking Violation</div><div><b>AUTHORITY</b><br>Alder Code § 46.2-1229</div><div><b>RELATED AUTHORITY</b><br>Alder Transportation § 46.2-862</div></div><h3 style="font-size:11px;margin:13px 0 5px">MANDATORY COMPLIANCE ORDER</h3><p style="font-size:10px;line-height:1.45;margin:4px 0">You are hereby required to take immediate and complete action to resolve this matter:</p><p style="font-size:10px;line-height:1.45;margin:4px 0">1. Remit FULL PAYMENT IN TOTAL of all outstanding fines, penalties, court costs, and applicable enforcement fees; OR</p><p style="font-size:10px;line-height:1.45;margin:4px 0">2. Appear before the Court at the scheduled hearing date to respond to this matter.</p><h3 style="font-size:10px;margin:12px 0 4px">FINAL LEGAL NOTICE</h3><p style="font-size:9px;line-height:1.35;margin:2px 0">Failure to comply may result in additional enforcement actions.</p><div style="display:grid;grid-template-columns:1fr 1.35fr .9fr;gap:10px;margin-top:18px;border:1px solid #333;padding:8px;font-size:8.5px;line-height:1.35"><div><b>COURT HEARING INFORMATION</b><br>Date: May 4, 2027<br>Time: 9:00 AM<br>Location: Northbridge Traffic Division</div><div><b>PAYMENT INSTRUCTION</b><br>To resolve this matter before the hearing date, submit payment through the official court payment system.<br><br>Failure to complete payment may require appearance.</div><div style="text-align:center"><b>SCAN TO PAY</b><div style="width:58px;height:58px;margin:7px auto;border:5px double #111;background:repeating-linear-gradient(45deg,#111 0 4px,#fff 4px 8px)"></div><span>Official Payment Portal</span></div></div><p style="font-size:8px;margin-top:14px">Controlled engineering fixture. Not a real court or notice.</p></main></body></html>`);
 await page.locator('#notice').screenshot({path});
}

test('dense enforcement image produces one payment action plus appearance and scan without column bleed',async({page})=>{
 test.setTimeout(120000);
 const path='test-results/generic-dense-enforcement.png';
 await makeDenseEnforcementNotice(page,path);
 await page.setViewportSize({width:1180,height:860});
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles(path);
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:60000});
 const payment=page.locator('.index-item').filter({hasText:'Requested payment'});
 await expect(payment).toHaveCount(1);
 await expect(page.locator('.index-item').filter({hasText:'Requested appearance'})).toHaveCount(1);
 await expect(page.locator('.index-item').filter({hasText:'Requested scan'})).toHaveCount(1);
 await expect(page.locator('.index-item').filter({hasText:'Threat or consequence'})).toHaveCount(0);
 await expect(page.locator('.action-callout strong')).toHaveText('3 actions: Pay · Appear · Scan');
 await payment.click();
 await expect(page.locator('.claim-value')).not.toContainText('Failure to Pay Electronic Toll');
 await expect(page.locator('.index-state.mismatch')).toHaveCount(0);
 await expect(page.locator('.index-state.match')).toHaveCount(0);
 await expect(page.locator('.index-state.could_not_verify').first()).toBeVisible();
 await page.screenshot({path:'test-results/generic-dense-enforcement-result.png',fullPage:true});
});


async function makeSourceIntelligenceNotice(page:Page,path:string){
 await page.setViewportSize({width:526,height:791});
 await page.setContent(`<!doctype html><html><body style="margin:0;background:white;font-family:Arial,sans-serif;color:#111"><main id="notice" style="width:506px;height:771px;margin:10px;padding:14px;box-sizing:border-box;border:1px solid #222"><div style="font-size:8px;text-align:center;letter-spacing:.08em">DEMO / SYNTHETIC NOTICE — NOT A REAL COURT DOCUMENT</div><h1 style="font-size:16px;text-align:center;margin:12px 0 2px">COMMONWEALTH OF VIRGINIA</h1><h2 style="font-size:13px;text-align:center;margin:0">IN THE DISTRICT COURT OF VIRGINIA FOR RICHMOND</h2><div style="font-size:10px;text-align:center;margin:4px 0 12px">TRAFFIC DIVISION · CASE NO.: VA-26-TR-273196</div><div style="border-top:3px solid #111;border-bottom:1px solid #111;padding:6px 0;font-size:10px"><b>VIOLATION:</b> Failure to Pay Electronic Toll / Toll Evasion<br><b>AUTHORITY:</b> Va. Code § 46.2-1229<br><b>RELATED AUTHORITY:</b> Va. Code, Transportation § 46.2-862<br><b>RELATED AUTHORITY:</b> Va. Code § 46.2-882</div><h3 style="font-size:11px;margin:14px 0 6px">MANDATORY COMPLIANCE ORDER</h3><p style="font-size:10px;line-height:1.5;margin:4px 0">1. Remit FULL PAYMENT IN TOTAL of all outstanding fines, penalties, court costs, and enforcement fees; OR</p><p style="font-size:10px;line-height:1.5;margin:4px 0">2. Appear before the Court at the scheduled hearing date to respond to this matter.</p><div style="display:grid;grid-template-columns:1.4fr .8fr;gap:12px;margin-top:18px;border:1px solid #333;padding:9px;font-size:9px;line-height:1.4"><div><b>COURT HEARING INFORMATION</b><br>Date: May 4, 2027<br>Time: 9:00 AM<br>Location: Richmond Traffic Division<br><br><b>PAYMENT INSTRUCTION</b><br>Submit payment through the court payment system.</div><div style="text-align:center"><b>SCAN TO PAY</b><div style="width:62px;height:62px;margin:9px auto;border:5px double #111;background:repeating-linear-gradient(45deg,#111 0 4px,#fff 4px 8px)"></div>Payment Portal</div></div><p style="font-size:8px;margin-top:16px">Controlled engineering fixture. Fictionalized for testing. No personal data.</p></main></body></html>`);
 await page.locator('#notice').screenshot({path});
}

test('unsupported court still reaches official scam, statute, and safe-path intelligence',async({page})=>{
 test.setTimeout(120000);
 const path='test-results/source-intelligence-notice.png';
 await makeSourceIntelligenceNotice(page,path);
 await page.setViewportSize({width:1180,height:900});
 await page.goto('/');
 await page.locator('input[type="file"]').setInputFiles(path);
 await expect(page.getByRole('heading',{name:'Uploaded notice'})).toBeVisible({timeout:60000});
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByText(/claims checked/)).toBeVisible({timeout:60000});
 await expect(page.locator('.action-callout strong')).toHaveText('3 actions: Pay · Appear · Scan');
 await expect(page.locator('.source-resolution')).toContainText('Verify outside this message before paying');
 await expect(page.locator('.source-signal')).toHaveCount(3);
 await expect(page.locator('.source-resolution')).toContainText('26-TR-273196');
 await expect(page.locator('.index-item').filter({hasText:'Cited authority'})).toHaveCount(3);
 await expect(page.locator('.index-state.mismatch')).toHaveCount(3);
 await expect(page.locator('.focused-evidence .state-text')).toHaveText('MISMATCH');
 await expect(page.locator('.focused-evidence')).toContainText(/Cited authority/i);
 await expect(page.locator('.focused-evidence .claim-value')).toHaveText(/Va\. Code § 46\.2-\d+/);
 await expect(page.locator('.contact-phone')).toHaveAttribute('href','tel:804-646-6431');
 await expect(page.locator('.safe-primary').first()).toHaveAttribute('href','https://vacourts.gov/caseinfo/home');
 await expect(page.locator('.technical-record')).toContainText('Court resolver: unavailable · Source intelligence: active');
 await expect(page.locator('.technical-record')).not.toContainText('Resolver: unsupported');
 const technicalHrefs=await page.locator('.technical-record a[href]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLAnchorElement).href));
 expect(new Set(technicalHrefs).size).toBe(technicalHrefs.length);
 await page.screenshot({path:'test-results/source-intelligence-result.png',fullPage:true});
});
