import {test,expect} from '@playwright/test';

test('international message gets a safe resolution path without an authenticity verdict',async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.getByRole('button',{name:/Paste text instead/i}).click();
 await page.getByLabel('Paste the court message').fill('DISTRICT COURT — NEW DELHI, INDIA\nCase No: DL-2026-4821\nYou must appear at the court registry on October 14, 2026.\nCall +91 11 5555 0199 to confirm your attendance.');
 await page.getByRole('button',{name:'Check this message'}).click();
 await expect(page.getByTestId('result-shell')).toBeVisible({timeout:45000});
 await expect(page.getByTestId('two-risk-result')).toContainText('instructions remain unverified');
 await expect(page.getByTestId('two-risk-result')).toContainText('underlying case is not independently confirmed');
 await expect(page.getByTestId('case-reality-check')).toContainText('Case not independently confirmed');
 await expect(page.getByTestId('case-reality-check').getByRole('link',{name:'Search India eCourts'})).toBeVisible();
 await expect(page.getByTestId('obligation-map')).toContainText('Call +91 11 5555 0199');
 await page.getByTestId('plain-language-explanation').locator('summary').click();
 await expect(page.getByText('In simple terms')).toBeVisible();
 await page.getByTestId('resolution-help').locator('summary').click();
 await expect(page.getByRole('link',{name:'Open NALSA legal aid'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Copy verification summary'})).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});
