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

async function dismissAutoReview(page:Page){
 const overlay=page.getByTestId('evidence-review');
 await overlay.waitFor({state:'visible',timeout:2500}).catch(()=>{});
 if(await overlay.isVisible().catch(()=>false)){
  await page.getByRole('button',{name:'Back to result'}).click();
  await expect(overlay).toHaveCount(0,{timeout:5000});
 }
}

test('mobile interface language changes locally even when translation provider is unavailable',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 let translationRequests=0;
 page.on('request',request=>{if(request.url().includes('/api/translate'))translationRequests++});
 await page.route('**/api/translate',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'unavailable',mode:'UNAVAILABLE'})}));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Check a court message'})).toBeVisible();

 await page.locator('.mobile-language-trigger').click();
 await page.locator('.mobile-language-popover').getByRole('option',{name:/Deutsch/}).click();
 await expect(page.getByRole('heading',{name:'Gerichtsnachricht prüfen'})).toBeVisible();
 await expect(page.getByText('Bescheid oder Screenshot hochladen')).toBeVisible();
 await expect(page.getByRole('button',{name:/Stattdessen Text einfügen/})).toBeVisible();

 await page.locator('.mobile-language-trigger').click();
 await page.locator('.mobile-language-popover').getByRole('option',{name:/한국어/}).click();
 await expect(page.getByRole('heading',{name:'법원 메시지 확인'})).toBeVisible();
 await expect(page.getByText('통지서 또는 스크린샷 업로드')).toBeVisible();
 expect(translationRequests,'entry UI localization must not depend on the model translation route').toBe(0);

 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 assertNoRuntimeErrors();
});

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
 let extractRequests=0;
 page.on('request',request=>{if(request.url().includes('/api/extract'))extractRequests++});
 page.on('response',response=>{if(response.url().includes('/api/'))console.log('PASTE_API',response.request().method(),response.url(),response.status())});
 page.on('requestfailed',request=>{if(request.url().includes('/api/'))console.log('PASTE_API_FAILED',request.method(),request.url(),request.failure()?.errorText)});
 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT
JURY STATUS CHECK
Call 1-866-388-2430 after 5:30 PM for the status of your jury service.`);
 await page.getByRole('button',{name:'Check this message'}).click();

 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000}).catch(async error=>{
  console.log('PASTE_BODY',await page.locator('body').innerText());
  throw error;
 });
 await expect(page.locator('.result-masthead-title')).toHaveText('Check result');
 await expect(page.getByTestId('check-object-header')).toContainText(/U\.S\. District Court/i);
 await expect(page.locator('.decision-source-brief')).toContainText(/public source|No public source attached/);
 await expect(page.locator('.pasted-message')).toContainText('Call 1-866-388-2430 after 5:30 PM');
 await expect(page.locator('.inspection-error')).toHaveCount(0);
 expect(extractRequests,'clear pasted actions should not depend on the optional model extractor').toBe(0);
 assertNoRuntimeErrors();
});

test('India coverage-limit message abstains and hands off to official eCourts',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`DISTRICT COURT — NEW DELHI, INDIA
Case reference: DL-2026-4821
You must appear at the court registry on October 14, 2026.
Call +91 11 5555 0199 to confirm your attendance.`);
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByTestId('result-status')).toBeVisible();
 await expect(page.getByTestId('document-language')).toBeVisible();
 await expect(page.getByTestId('document-language')).toHaveText('English');
 await expect(page.getByTestId('document-jurisdiction')).toBeVisible();
 await expect(page.getByTestId('document-jurisdiction')).toContainText('India');
 await expect(page.getByTestId('two-risk-result')).toContainText('Not confirmed');
 await expect(page.getByText('Official directory',{exact:true})).toBeVisible();
 const route=page.getByTestId('case-reality-check').getByRole('link',{name:'Search India eCourts'});
 await expect(route).toBeVisible();
 await expect(route).toHaveAttribute('href','https://services.ecourts.gov.in/ecourtindia_v6/');
 await expect(page.getByText('Matches',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Conflicts',{exact:true})).toHaveCount(0);
 assertNoRuntimeErrors();
});

test('mobile result keeps the decision first and scrolls result sections vertically',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`STATE OF NEW HAMPSHIRE
FINAL COURT-ORDERED MANDATORY COLLECTION NOTICE
Remit FULL PAYMENT IN TOTAL of all outstanding tolls, fines, penalties, administrative fees, court costs, and enforcement surcharges.`);
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByTestId('result-status')).toHaveText('We could not confirm this notice');
 await expect(page.getByRole('heading',{level:1,name:'Check it independently before you pay.'})).toBeVisible();
 const visualLanguage=await page.evaluate(()=>{
  const glance=document.querySelector('.decision-at-a-glance') as HTMLElement|null;
  const metaSpans=document.querySelectorAll('.check-object-meta span');
  const secondMeta=metaSpans.item(1) as HTMLElement|null;
  const masthead=document.querySelector('.result-masthead-title') as HTMLElement|null;
  return {
   glanceTop:glance?getComputedStyle(glance).borderTopWidth:null,
   glanceBottom:glance?getComputedStyle(glance).borderBottomWidth:null,
   metaSeparator:secondMeta?getComputedStyle(secondMeta,'::before').content:null,
   mastheadTransform:masthead?getComputedStyle(masthead).textTransform:null
  };
 });
 expect(visualLanguage.glanceTop).toBe('0px');
 expect(visualLanguage.glanceBottom).toBe('0px');
 expect(['none','normal','""']).toContain(visualLanguage.metaSeparator);
 expect(visualLanguage.mastheadTransform).toBe('none');

 const chapters=page.locator('.result-chapters');
 const carousel=page.getByTestId('result-carousel');
 await expect(chapters).toBeVisible();
 await expect(chapters.getByRole('link')).toHaveCount(4);
 await expect(page.getByTestId('evidence-review'),'review must not auto-open over result navigation').toHaveCount(0);
 await expect(page.locator('.record-disclosure')).not.toHaveAttribute('open','');
 const metrics=await carousel.evaluate(node=>({
  width:node.clientWidth,
  height:node.clientHeight,
  scrollWidth:node.scrollWidth,
  scrollHeight:node.scrollHeight,
  snap:getComputedStyle(node).scrollSnapType,
  offsets:Array.from(node.querySelectorAll<HTMLElement>('.result-slide')).map(slide=>slide.offsetTop)
 }));
 expect(metrics.width).toBeGreaterThan(300);
 expect(metrics.scrollWidth-metrics.width,'result flow must not create horizontal overflow').toBeLessThanOrEqual(2);
 expect(metrics.scrollHeight).toBeGreaterThan(metrics.height*3);
 expect(metrics.offsets).toHaveLength(4);
 expect(metrics.snap).toContain('y');

 const calls=await carousel.evaluate(node=>{
  const element=node as HTMLElement & {__sealScrollCalls?:Array<ScrollToOptions>};
  element.__sealScrollCalls=[];
  const original=element.scrollTo.bind(element);
  element.scrollTo=((options?:ScrollToOptions|number,y?:number)=>{
   if(typeof options==='object'&&options)element.__sealScrollCalls!.push(options);
   if(typeof options==='number')return original(options,y??0);
   return original(options||{});
  }) as typeof element.scrollTo;
  return true;
 });
 expect(calls).toBe(true);

 await chapters.getByRole('link',{name:'Original'}).click();
 await expect.poll(()=>carousel.evaluate(node=>node.scrollTop),{timeout:5000}).toBeGreaterThan(metrics.offsets[1]-12);
 await expect(chapters.getByRole('link',{name:'Original'})).toHaveAttribute('aria-current','location');

 await chapters.getByRole('link',{name:'Evidence'}).click();
 await expect.poll(()=>carousel.evaluate(node=>node.scrollTop),{timeout:5000}).toBeGreaterThan(metrics.offsets[2]-12);
 await expect(chapters.getByRole('link',{name:'Evidence'})).toHaveAttribute('aria-current','location');

 await carousel.evaluate((node,top)=>node.scrollTo({top:top+180,behavior:'auto'}),metrics.offsets[2]);
 await expect(chapters.getByRole('link',{name:'Evidence'})).toHaveAttribute('aria-current','location');

 await chapters.getByRole('link',{name:'Resolve'}).click();
 await expect.poll(()=>carousel.evaluate(node=>node.scrollTop),{timeout:5000}).toBeGreaterThan(metrics.offsets[3]-12);
 await expect(chapters.getByRole('link',{name:'Resolve'})).toHaveAttribute('aria-current','location');

 await chapters.getByRole('link',{name:'Evidence'}).click();
 await expect.poll(()=>carousel.evaluate(node=>node.scrollTop),{timeout:5000}).toBeLessThanOrEqual(metrics.offsets[2]+8);
 await expect.poll(()=>carousel.evaluate(node=>node.scrollTop),{timeout:5000}).toBeGreaterThanOrEqual(metrics.offsets[2]-8);

 await chapters.getByRole('link',{name:'Summary'}).click();
 await expect.poll(()=>carousel.evaluate(node=>node.scrollTop),{timeout:3000}).toBeLessThan(4);
 const scrollCalls=await carousel.evaluate(node=>(node as HTMLElement & {__sealScrollCalls?:Array<ScrollToOptions>}).__sealScrollCalls||[]);
 expect(scrollCalls.some(call=>call.behavior==='smooth'),'adjacent tab moves should scroll vertically with continuity').toBe(true);
 expect(scrollCalls.at(-1)?.behavior,'far tab jumps must not sweep through every result section').toBe('auto');
 expect(scrollCalls.every(call=>call.left===undefined||call.left===0),'tab navigation must never move horizontally').toBe(true);
 expect(await page.evaluate(()=>window.scrollX)).toBe(0);

 await carousel.evaluate(node=>node.scrollTo({top:0,left:0,behavior:'auto'}));
 await expect(chapters.getByRole('link',{name:'Summary'})).toHaveAttribute('aria-current','location');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 assertNoRuntimeErrors();
});

test('sample result stays quiet and action-free',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:1214,height:642});
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByTestId('result-status')).toHaveText('Example document');
 await expect(page.getByTestId('primary-next-step')).toHaveCount(0);
 await expect(page.getByTestId('two-risk-result')).toHaveCount(0);
 await expect(page.locator('.sample-warning')).toHaveCount(0);
 await expect(page.locator('.decision-visual')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Check again'})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Check again'}).locator('svg')).toHaveCount(1);
 await expect(page.locator('.rail-language select')).toHaveCount(0);
 await expect(page.locator('.check-object-identity h1')).toContainText('U.S. District Court');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 assertNoRuntimeErrors();
});

test('desktop result stays contained to one carousel stage instead of a long report',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await dismissAutoReview(page);
 const carousel=page.getByTestId('result-carousel');
 const metrics=await carousel.evaluate(node=>({width:node.clientWidth,height:node.clientHeight,scrollWidth:node.scrollWidth}));
 expect(Math.abs(metrics.scrollWidth-metrics.width*4)).toBeLessThanOrEqual(8);
 expect(metrics.height).toBeLessThanOrEqual(820);
 expect(metrics.height).toBeGreaterThanOrEqual(580);
 await expect(page.locator('.record-disclosure')).not.toHaveAttribute('open','');
 const pageMetrics=await page.evaluate(()=>({widthOverflow:document.documentElement.scrollWidth-window.innerWidth,height:document.documentElement.scrollHeight,viewport:window.innerHeight}));
 expect(pageMetrics.widthOverflow).toBeLessThanOrEqual(1);
 expect(pageMetrics.height).toBeLessThan(pageMetrics.viewport*1.45);
 assertNoRuntimeErrors();
});

test('New Hampshire toll demand shows process evidence without inventing a verdict',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`STATE OF NEW HAMPSHIRE
FINAL COURT-ORDERED MANDATORY COLLECTION NOTICE
Remit FULL PAYMENT IN TOTAL of all outstanding tolls, fines, penalties, administrative fees, court costs, and enforcement surcharges.`);
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.locator('#review-summary').getByRole('heading',{name:'Check it independently before you pay.'})).toBeVisible();
 await expect(page.getByText('Official process',{exact:true})).toBeVisible();
 await expect(page.getByText('New Hampshire publishes a specific process for toll and court collections')).toBeVisible();
 await expect(page.getByText(/These sources help with the check, but they still cannot tell us who sent the message/i)).toBeVisible();
 await expect(page.locator('[data-result-section="evidence"] .safe-route')).toHaveCount(0);
 await expect(page.locator('[data-result-section="next"] .safe-route')).toHaveCount(1);
 await page.locator('.decision-details').locator('summary').click();
 await expect(page.locator('.decision-details').getByRole('link',{name:'Open public source'})).toHaveAttribute('href','https://www.gc.nh.gov/rsa/html/xx/236/236-mrg.htm');
 await expect(page.getByTestId('primary-next-step').getByRole('link',{name:'Open NH E-ZPass'})).toHaveAttribute('href','https://www.ezpassnh.com/');
 await expect(page.getByText('1-855-212-1234',{exact:true})).toBeVisible();
 assertNoRuntimeErrors();
});

test('a second check can finish while the first verification is still in flight',async({page})=>{
 test.setTimeout(120000);
 const assertNoRuntimeErrors=guardRuntime(page);
 let verifyCount=0;
 let releaseFirst!:()=>void;
 const firstGate=new Promise<void>(resolve=>{releaseFirst=resolve});

 await page.route('**/api/verify',async route=>{
  verifyCount++;
  if(verifyCount===1)await firstGate;
  await route.continue();
 });

 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT
JURY STATUS CHECK
Call 1-866-388-2430 after 5:30 PM for the status of your jury service.`);
 await page.getByRole('button',{name:'Check this message'}).click();

 await expect.poll(()=>verifyCount,{timeout:15000}).toBe(1);
 let active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 const firstCheck=active.locator('.rail-check-list .rail-check').first();
 await expect(firstCheck.locator('.rail-check-state')).toHaveClass(/is-verifying/);
 await expect(firstCheck.locator('.rail-check-copy small')).toContainText('Checking sources');

 await active.locator('.rail-new-check').click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByTestId('entry-shell')).toBeVisible();
 await active.getByRole('button',{name:/Paste text instead/i}).click();
 await active.getByLabel('Paste the court message').fill(`STATE OF NEW HAMPSHIRE
FINAL COURT-ORDERED MANDATORY COLLECTION NOTICE
Remit FULL PAYMENT IN TOTAL of all outstanding tolls, fines, penalties, administrative fees, court costs, and enforcement surcharges.`);
 await active.getByRole('button',{name:'Check this message'}).click();

 await expect.poll(()=>verifyCount,{timeout:15000}).toBe(2);
 await expect(active.getByTestId('result-shell')).toBeVisible({timeout:30000});
 await expect(active.getByRole('heading',{level:1,name:'Check it independently before you pay.'})).toBeVisible();

 releaseFirst();
 const checks=active.locator('.rail-check-list .rail-check');
 await expect(checks).toHaveCount(2);
 const names=await checks.locator('.rail-check-copy strong').allTextContents();
 expect(new Set(names).size,'blank parallel checks should not be indistinguishable in the workspace rail').toBe(names.length);
 await checks.nth(0).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByTestId('result-shell')).toBeVisible({timeout:30000});
 await expect(active.locator('.pasted-message')).toContainText('1-866-388-2430');

 await active.locator('.rail-check-list .rail-check').nth(1).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByRole('heading',{level:1,name:'Check it independently before you pay.'})).toBeVisible();
 assertNoRuntimeErrors();
});

test('parallel checks keep completed results isolated and switch cleanly',async({page})=>{
 test.setTimeout(120000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');

 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill(`UNITED STATES DISTRICT COURT — DISTRICT OF CONNECTICUT
JURY STATUS CHECK
Call 1-866-388-2430 after 5:30 PM for the status of your jury service.`);
 await page.getByRole('button',{name:'Check this message'}).click();
 let active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(active.locator('.pasted-message')).toContainText('1-866-388-2430');

 await active.locator('.rail-new-check').click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByTestId('entry-shell')).toBeVisible();
 await active.getByRole('button',{name:/Paste text instead/i}).click();
 await active.getByLabel('Paste the court message').fill(`STATE OF NEW HAMPSHIRE
FINAL COURT-ORDERED MANDATORY COLLECTION NOTICE
Remit FULL PAYMENT IN TOTAL of all outstanding tolls, fines, penalties, administrative fees, court costs, and enforcement surcharges.`);
 await active.getByRole('button',{name:'Check this message'}).click();
 await expect(active.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(active.locator('[id^="review-summary"]').getByRole('heading',{level:1,name:'Check it independently before you pay.'})).toBeVisible();

 const checks=active.locator('.rail-check-list .rail-check');
 await expect(checks).toHaveCount(2);
 await checks.nth(0).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.locator('.pasted-message')).toContainText('1-866-388-2430');
 await active.locator('.result-chapters').getByRole('link',{name:'Original'}).click();
 await expect(active.locator('#original-message')).toBeVisible();

 await active.locator('.rail-check-list .rail-check').nth(1).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.locator('[id^="review-summary"]').getByRole('heading',{level:1,name:'Check it independently before you pay.'})).toBeVisible();
 assertNoRuntimeErrors();
});

test('mobile SEAL brand returns a result to the clean entry state',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await dismissAutoReview(page);

 await page.locator('.mobile-brand').click();
 await expect(page.getByTestId('entry-shell')).toBeVisible();
 await expect(page.getByTestId('result-shell')).toHaveCount(0);
 await expect(page).toHaveURL(/\/$/);
 assertNoRuntimeErrors();
});

test('mobile entry shell does not leave body space below its footer',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');

 const metrics=await page.evaluate(()=>{
  const footer=document.querySelector('.seal-footer') as HTMLElement|null;
  const app=document.querySelector('.seal-app') as HTMLElement|null;
  if(!footer||!app)return null;
  const footerBox=footer.getBoundingClientRect();
  const appBox=app.getBoundingClientRect();
  return {
   viewport:window.innerHeight,
   bodyHeight:document.body.getBoundingClientRect().height,
   appBottom:appBox.bottom,
   footerBottom:footerBox.bottom
  };
 });

 expect(metrics).not.toBeNull();
 expect(Math.abs(metrics!.bodyHeight-metrics!.appBottom)).toBeLessThanOrEqual(2);
 expect(metrics!.footerBottom).toBeGreaterThanOrEqual(metrics!.viewport-2);
 assertNoRuntimeErrors();
});

test('official sample keeps review explicit, survives refresh, and can replay',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');

 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.locator('.result-masthead-title')).toHaveText('Check result');
 await expect(page.getByTestId('evidence-review')).toHaveCount(0);
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();
 await page.getByTestId('play-evidence-review').click();
 await expect(page.getByTestId('evidence-review')).toBeVisible({timeout:15000});
 await expect(page.getByRole('dialog',{name:'SEAL verification review'})).toBeVisible();
 await page.getByRole('button',{name:'Back to result'}).click();
 await expect(page.getByTestId('evidence-review')).toHaveCount(0,{timeout:5000});
 await expect(page.getByText('This is a sample form.')).toBeVisible();
 await expect(page.locator('.decision-artifact')).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 await page.reload();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:15000});
 await expect(page.getByTestId('evidence-review')).toHaveCount(0);
 await expect(page.getByText('This is a sample form.')).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 await page.getByTestId('play-evidence-review').click();
 await expect(page.getByTestId('evidence-review')).toBeVisible({timeout:15000});
 await page.getByRole('button',{name:'Back to result'}).click();
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
 await dismissAutoReview(page);
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
 await expect(page.getByTestId('evidence-review')).toHaveCount(0);
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();

 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();
 assertNoRuntimeErrors();
});

test('desktop entry and Browse never create a page-level horizontal scrollbar',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:1214,height:642});
 for(const path of ['/','/browse']){
  await page.goto(path);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow,`${path} should not expose the browser horizontal scrollbar`).toBeLessThanOrEqual(1);
 }
 assertNoRuntimeErrors();
});

test('Browse keeps every sourced document runnable and high-signal cases first',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/browse');
 await expect(page.getByRole('heading',{name:'Browse real cases'})).toBeVisible();
 const titles=await page.locator('.case-card h2').allTextContents();
 expect(titles.slice(0,3)).toEqual([
  'Court text with a fake hearing and payment route',
  'Public notice to interested parties',
  'Sample federal jury summons'
 ]);
 const cardCount=await page.locator('.case-card').count();
 expect(cardCount).toBeGreaterThanOrEqual(7);
 await expect(page.getByRole('link',{name:'Run in SEAL'})).toHaveCount(cardCount);
 const international=await page.request.get('/api/browse-case?id=brazil-parana-citation-notice');
 expect(international.ok()).toBe(true);
 expect(await international.json()).toMatchObject({assetType:'pdf',ocrLanguage:'por',title:'Public citation notice with response period'});
 assertNoRuntimeErrors();
});


test('cinematic review stays fixed to the viewport after the result page has scrolled',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/');
 await chooseFile(page,'tests/fixtures/connecticut-sample-jury-summons.pdf');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByTestId('evidence-review')).toHaveCount(0);
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();
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
 await page.getByRole('button',{name:'Back to result'}).click();
 assertNoRuntimeErrors();
});


test('curated Dallas example preserves its source-backed resolution',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.goto('/?case=dallas-traffic-qr-scam');
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:60000});
 await dismissAutoReview(page);
 await expect(page.locator('#review-summary').getByRole('heading',{name:'Do not scan or pay from this message'})).toBeVisible();
 await expect(page.locator('#review-summary .decision-summary')).toContainText(/City of Dallas published this exact example as a scam/i);
 await expect(page.getByTestId('primary-next-step').getByRole('link',{name:/View the City of Dallas source/i})).toBeVisible();
 await expect(page.getByTestId('play-evidence-review')).toBeVisible();
 assertNoRuntimeErrors();
});


test('mobile workspace drawer replaces the numbered strip and can delete checks',async({page})=>{
 test.setTimeout(90000);
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');

 await expect(page.locator('.mobile-check-strip')).toHaveCount(0);
 await page.getByRole('button',{name:'New check'}).click();
 const leaving=page.locator('.seal-workspace-instance.is-leaving');
 await expect(leaving,'old check should remain visible while fading out').toBeVisible();
 let active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active,'new check should rise from the bottom').toHaveClass(/is-entering-forward/);
 const incomingAnimation=await active.evaluate(node=>getComputedStyle(node).animationName);
 const outgoingAnimation=await leaving.evaluate(node=>getComputedStyle(node).animationName);
 expect(incomingAnimation).toContain('workspace-sheet-rise');
 expect(outgoingAnimation).toContain('workspace-page-recede');
 await expect(active.getByTestId('entry-shell')).toBeVisible();
 await page.waitForTimeout(760);
 await expect(leaving).toBeHidden();

 const previousActiveId=await active.getAttribute('data-workspace-id');
 await page.getByRole('button',{name:'New check'}).click();
 const secondLeaving=page.locator('.seal-workspace-instance.is-leaving');
 await expect(secondLeaving,'the immediately previous check should remain visible on repeated new-check transitions').toBeVisible();
 const outgoingId=await secondLeaving.getAttribute('data-workspace-id');
 expect(outgoingId).toBe(previousActiveId);
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active).toHaveClass(/is-entering-forward/);
 await page.waitForTimeout(760);

 await expect(page.locator('.seal-workspace-stack')).toHaveClass(/has-multiple/);
 await expect(page.locator('.mobile-workspace-count')).toHaveCount(0);
 await expect(page.locator('.workspace-page-edges')).toBeVisible();

 await page.getByRole('button',{name:/Open checks, 3 open/}).click();
 let drawer=page.getByRole('dialog',{name:'Checks'});
 await expect(drawer).toBeVisible();
 await expect(drawer.locator('.workspace-drawer-row')).toHaveCount(3);
 const drawerCopyWidth=await drawer.locator('.workspace-drawer-copy').first().evaluate(node=>node.getBoundingClientRect().width);
 expect(drawerCopyWidth,'workspace row copy must not collapse to a single character').toBeGreaterThan(120);
 await expect(drawer.getByRole('button',{name:/Delete check 3:/})).toBeVisible();

 await drawer.getByRole('button',{name:/Delete check 3:/}).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByRole('dialog',{name:'Checks',includeHidden:true})).not.toBeVisible();
 await expect(active.getByTestId('entry-shell')).toBeVisible();

 await page.getByRole('button',{name:/Open checks, \d+ open/}).click();
 drawer=page.getByRole('dialog',{name:'Checks'});
 await expect(drawer.locator('.workspace-drawer-row')).toHaveCount(2);
 await drawer.getByRole('button',{name:/Delete check 2:/}).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByRole('dialog',{name:'Checks',includeHidden:true})).not.toBeVisible();
 await expect(active.getByTestId('entry-shell')).toBeVisible();

 await page.getByRole('button',{name:/Open checks, \d+ open/}).click();
 drawer=page.getByRole('dialog',{name:'Checks'});
 await expect(drawer.locator('.workspace-drawer-row')).toHaveCount(1);
 await drawer.getByRole('button',{name:/Delete check 1:/}).click();
 active=page.locator('.seal-workspace-instance[aria-hidden="false"]');
 await expect(active.getByRole('dialog',{name:'Checks',includeHidden:true})).not.toBeVisible();
 await expect(active.getByTestId('entry-shell')).toBeVisible();

 await page.getByRole('button',{name:/Open checks, \d+ open/}).click();
 drawer=page.getByRole('dialog',{name:'Checks'});
 await expect(drawer.locator('.workspace-drawer-row')).toHaveCount(1);
 await expect(drawer.getByText('New check',{exact:true})).toBeVisible();
 await expect(page.locator('.mobile-check-strip')).toHaveCount(0);
 assertNoRuntimeErrors();
});


test('entry layout stays inside the viewport across desktop compression',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 for(const width of [1208,1100,1024]){
  await page.setViewportSize({width,height:646});
  await page.goto('/');
  await expect(page.getByTestId('entry-shell')).toBeVisible();
  const metrics=await page.evaluate(()=>{
   const shell=document.querySelector<HTMLElement>('[data-testid="entry-shell"]')!;
   const intro=shell.querySelector<HTMLElement>('.entry-copy')!;
   const intake=shell.querySelector<HTMLElement>('.intake')!;
   const html=document.documentElement;
   return {
    viewport:window.innerWidth,
    scrollWidth:html.scrollWidth,
    shell:shell.getBoundingClientRect().toJSON(),
    intro:intro.getBoundingClientRect().toJSON(),
    intake:intake.getBoundingClientRect().toJSON()
   };
  });
  expect(metrics.scrollWidth,`horizontal overflow at ${width}px`).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.shell.left,`shell clipped left at ${width}px`).toBeGreaterThanOrEqual(0);
  expect(metrics.intro.left,`intro clipped left at ${width}px`).toBeGreaterThanOrEqual(0);
  expect(metrics.intake.right,`intake clipped right at ${width}px`).toBeLessThanOrEqual(metrics.viewport+1);
 }
 assertNoRuntimeErrors();
});


test('desktop entry keeps sidebar and canvas in proportion',async({page})=>{
 const assertNoRuntimeErrors=guardRuntime(page);
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await expect(page.getByTestId('entry-shell')).toBeVisible();
 const metrics=await page.evaluate(()=>{
  const rail=document.querySelector<HTMLElement>('.workspace-rail')!;
  const shell=document.querySelector<HTMLElement>('[data-testid="entry-shell"]')!;
  const heading=shell.querySelector<HTMLElement>('.entry-copy h1')!;
  const intake=shell.querySelector<HTMLElement>('.intake')!;
  const railTitle=rail.querySelector<HTMLElement>('.rail-brand-word')!;
  return {
   railWidth:rail.getBoundingClientRect().width,
   shellWidth:shell.getBoundingClientRect().width,
   intakeWidth:intake.getBoundingClientRect().width,
   headingSize:Number.parseFloat(getComputedStyle(heading).fontSize),
   railTitleSize:Number.parseFloat(getComputedStyle(railTitle).fontSize),
   overflow:document.documentElement.scrollWidth-window.innerWidth
  };
 });
 expect(metrics.railWidth).toBeGreaterThanOrEqual(228);
 expect(metrics.railWidth).toBeLessThanOrEqual(244);
 expect(metrics.shellWidth).toBeLessThanOrEqual(1082);
 expect(metrics.intakeWidth).toBeLessThanOrEqual(532);
 expect(metrics.headingSize).toBeLessThanOrEqual(47);
 expect(metrics.headingSize).toBeGreaterThanOrEqual(44);
 expect(metrics.railTitleSize).toBeGreaterThanOrEqual(16);
 expect(metrics.overflow).toBeLessThanOrEqual(1);
 assertNoRuntimeErrors();
});
