import {test,expect,type Page} from '@playwright/test';

function guardRuntime(page:Page){
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{
  if(message.type()==='error')errors.push(message.text());
 });
 return ()=>{
  expect(errors,'browser runtime errors').toEqual([]);
 };
}

async function chooseFile(page:Page,path:string){
 const chooserPromise=page.waitForEvent('filechooser');
 await page.getByTestId('upload-file').click();
 const chooser=await chooserPromise;
 await chooser.setFiles(path);
}

test('entry stays idle across refresh until the user chooses an input',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await expect(page.getByTestId('entry-shell')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Check a court message'})).toBeVisible();
 await expect(page.getByText(/Reading image|Reading PDF|Checking public sources/)).toHaveCount(0);

 await page.reload();
 await expect(page.getByTestId('entry-shell')).toBeVisible();
 await expect(page.getByText(/Reading image|Reading PDF|Checking public sources/)).toHaveCount(0);
 await expect(page.getByTestId('result-shell')).toHaveCount(0);
 assertNoRuntimeErrors();
});

test('pasted court instructions reach a complete result without intermediate result state',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT
JURY STATUS CHECK
Call 1-866-388-2430 after 5:30 PM for the status of your jury service.`);
 await page.getByRole('button',{name:'Check this message'}).click();

 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:30000});
 await expect(page.getByRole('heading',{name:'Your message'})).toBeVisible();
 await expect(page.getByText('Call 1-866-388-2430 after 5:30 PM')).toBeVisible();
 await expect(page.locator('.inspection-error')).toHaveCount(0);
 assertNoRuntimeErrors();
});

test('official sample survives result review, refresh, and replay',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');

 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByRole('heading',{name:'Your message'})).toBeVisible();
 await expect(page.getByText('This is a sample form.')).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 await page.getByTestId('play-evidence-review').click();
 await expect(page.getByTestId('evidence-review')).toBeVisible({timeout:15000});
 await expect(page.getByRole('dialog',{name:'SEAL verification review'})).toBeVisible();
 await page.getByRole('button',{name:'Full evidence'}).click();
 await expect(page.getByTestId('evidence-review')).toHaveCount(0,{timeout:5000});

 await page.reload();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:15000});
 await expect(page.getByText('This is a sample form.')).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 await page.getByTestId('play-evidence-review').click();
 await expect(page.getByTestId('evidence-review')).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Full evidence'}).click();
 await expect(page.getByTestId('evidence-review')).toHaveCount(0,{timeout:5000});
 assertNoRuntimeErrors();
});

test('multi-page PDF can be paged repeatedly without losing the application',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 const fixture='test-results/two-page-court-notice.pdf';

 await page.setContent(`<!doctype html><html><body style="font-family:Arial,sans-serif">
  <section style="page-break-after:always;padding:48px">
   <h1>IN THE DISTRICT COURT OF NORTHBRIDGE</h1>
   <p>Case No. NB-2027-1048</p>
   <p>You are required to appear before the court on May 4, 2027.</p>
  </section>
  <section style="padding:48px">
   <h2>SECOND PAGE</h2>
   <p>Reference copy for the same fictional court notice.</p>
  </section>
 </body></html>`);
 await page.pdf({path:fixture,format:'A4',printBackground:true});

 await page.goto('/');
 await chooseFile(page,fixture);
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByText('Page 1 of 2')).toBeVisible({timeout:15000});

 const next=page.getByRole('button',{name:'Next'});
 const previous=page.getByRole('button',{name:'Previous'});
 for(let i=0;i<3;i++){
  await expect(next).toBeEnabled({timeout:10000});
  await next.click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(previous).toBeEnabled({timeout:10000});
  await previous.click();
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
 }
 await expect(page.getByTestId('seal-app')).toBeVisible();
 assertNoRuntimeErrors();
});

test('mobile result has no horizontal overflow and keeps the review accessible',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});

 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 await page.getByTestId('play-evidence-review').click();
 await expect(page.getByTestId('evidence-review')).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Full evidence'}).click();
 await expect(page.getByTestId('evidence-review')).toHaveCount(0,{timeout:5000});
 assertNoRuntimeErrors();
});

test('Browse ranks high-signal cases first and only exposes verified runnable examples',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/browse');
 await expect(page.getByRole('heading',{name:'Browse real cases'})).toBeVisible();
 const titles=await page.locator('.case-card h2').allTextContents();
 expect(titles.slice(0,3)).toEqual([
  'Traffic default notice with QR payment',
  'Court text with a fake hearing and payment route',
  'Sample federal jury summons'
 ]);
 await expect(page.getByRole('link',{name:'Run in SEAL'})).toHaveCount(3);
 assertNoRuntimeErrors();
});


test('cinematic review stays fixed to the viewport after the result page has scrolled',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByText('Review ready')).toHaveCount(0);

 await page.evaluate(()=>window.scrollTo(0,Math.min(700,document.documentElement.scrollHeight-window.innerHeight)));
 await page.getByTestId('play-evidence-review').evaluate((node:HTMLElement)=>node.click());
 const overlay=page.getByTestId('evidence-review');
 await expect(overlay).toBeVisible({timeout:15000});
 const box=await overlay.boundingBox();
 expect(box).not.toBeNull();
 expect(Math.abs(box!.y)).toBeLessThanOrEqual(1);
 expect(Math.abs(box!.x)).toBeLessThanOrEqual(1);
 const viewport=page.viewportSize();
 expect(Math.abs(box!.width-(viewport?.width||box!.width))).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Full evidence'}).click();
 assertNoRuntimeErrors();
});


test('curated Dallas example preserves its source-backed resolution',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/?case=dallas-traffic-qr-scam');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:60000});
 await expect(page.getByRole('heading',{name:'Do not scan or pay from this message'})).toBeVisible();
 await expect(page.getByText(/City of Dallas published this exact example as a scam/i)).toBeVisible();
 await expect(page.getByRole('link',{name:/View the City of Dallas source/i})).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();
 assertNoRuntimeErrors();
});
