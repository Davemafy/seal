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
