import {test,expect,type Page} from '@playwright/test';

test.skip(process.env.SEAL_PRODUCTION!=='1','production-only browser gate');

function guardRuntime(page:Page){
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 return ()=>expect(errors,'production browser runtime errors').toEqual([]);
}

async function chooseFile(page:Page,path:string){
 const chooserPromise=page.waitForEvent('filechooser');
 await page.getByTestId('upload-file').click();
 const chooser=await chooserPromise;
 await chooser.setFiles(path);
}

async function syntheticImage(page:Page,path:string){
 await page.setViewportSize({width:900,height:700});
 await page.setContent(`<!doctype html><html><body style="margin:0;background:#eee;font-family:Arial,sans-serif">
  <main id="card" style="width:760px;margin:55px auto;background:#fff;border:1px solid #aaa;padding:42px;color:#111">
   <div style="font-size:13px;letter-spacing:.12em;font-weight:700">CONTROLLED TEST IMAGE — NOT A REAL SUMMONS</div>
   <h1 style="font-size:30px;margin:28px 0">UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT</h1>
   <p style="font-size:23px;line-height:1.5">Jury Status Check Only: Call 1-866-388-2430 after 5:30 PM.</p>
  </main>
 </body></html>`);
 await page.locator('#card').screenshot({path});
}

test('deployed app stays idle on refresh and completes a real browser image flow',async({page})=>{
 test.setTimeout(120000);
 const assertNoRuntimeErrors=guardRuntime(page);
 const fixture='test-results/production-status-good.png';
 await syntheticImage(page,fixture);

 await page.goto('/');
 await expect(page.getByTestId('entry-shell')).toBeVisible();
 await page.reload();
 await expect(page.getByTestId('entry-shell')).toBeVisible();

 await chooseFile(page,fixture);
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:60000});
 await expect(page.getByRole('heading',{name:'Your message'})).toBeVisible();
 await expect(page.locator('.inspection-error')).toHaveCount(0);
 await page.screenshot({path:'test-results/production-good-result.png',fullPage:true});
 assertNoRuntimeErrors();
});

test('deployed curated sample can open, review, close, and restore after refresh',async({page})=>{
 test.setTimeout(120000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/?case=connecticut-sample-jury-summons');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:60000});
 await expect(page.getByText('This is a sample form.')).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 await page.getByTestId('play-evidence-review').click();
 await expect(page.getByTestId('evidence-review')).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'Full evidence'}).click();
 await expect(page.getByTestId('evidence-review')).toHaveCount(0,{timeout:5000});

 await page.reload();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:15000});
 await page.screenshot({path:'test-results/production-restored-result.png',fullPage:true});
 assertNoRuntimeErrors();
});
