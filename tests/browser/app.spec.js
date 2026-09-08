import {test,expect} from '@playwright/test';
test('local, distance, empirical, download and shared URL',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('.stat-value').first()).toContainText('+5,29');
 await page.selectOption('#preset','tokyo');await expect(page.locator('.stat-value').first()).toContainText('+8,68');
 await page.selectOption('#preset','chambord');await page.click('#distance-tab');await expect(page.locator('#point-b')).toBeVisible();await expect(page.locator('.stat-value')).toHaveCount(4);
 await page.check('#empirical');await expect(page.locator('#block-fields')).toBeVisible();await page.click('#load-observations');await expect(page.locator('#result-title')).toContainText('empirique');
 const download=page.waitForEvent('download');await page.click('#export');expect((await download).suggestedFilename()).toBe('distortion-lab-rapport.json');
 await page.click('#share');const url=page.url();expect(url).toContain('mode=distance');await page.goto(url);await expect(page.locator('#empirical')).toBeChecked();await expect(page.locator('#result-title')).toContainText('empirique');
 await page.fill('#lat-a','');await expect(page.locator('#export')).toBeDisabled();await page.fill('#lat-a','91');await page.click('#calculate');expect(await page.locator('#lat-a').evaluate(el=>el.validity.rangeOverflow)).toBe(true);
 expect(errors).toEqual([]);
});
test('map click, samples and mobile layout',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.stat-value')).toHaveCount(4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 const old=await page.inputValue('#lat-a');await page.locator('#map').click({position:{x:130,y:110}});expect(await page.inputValue('#lat-a')).not.toBe(old);
 await page.check('#grid-toggle');await expect(page.locator('.leaflet-overlay-pane path').first()).toBeVisible();
 await page.click('#method .method-details summary');await expect(page.locator('#method .method-details ol')).toBeVisible();
});
test('grid failure does not silently substitute a model',async({page})=>{
 await page.route('**/conformal.bin',route=>route.abort());await page.goto('/');await expect(page.locator('#engine')).toContainText('indisponible');await expect(page.locator('#calculate')).toBeDisabled();await expect(page.locator('.stat-value')).toHaveCount(0);
});
test('tiles failing leaves bundled geography usable',async({page})=>{
 await page.route('**/*.png',route=>route.abort());await page.goto('/');await expect(page.locator('.stat-value')).toHaveCount(4);await expect(page.locator('.leaflet-offline-pane path:not([d="M0 0"])').first()).toBeVisible();
});

test('PDF case reproduces six pairs and replays a pair without empirical mode',async({page})=>{
 await page.goto('/');await expect(page.locator('#chambord-status')).toContainText('6/6');
 await expect(page.locator('#chambord-rows tr')).toHaveCount(6);
 await expect(page.locator('#chambord-rows .case-match')).toHaveText(Array(6).fill('Reproduit'));
 const download=page.waitForEvent('download');await page.click('#chambord-export');expect((await download).suggestedFilename()).toBe('chambord-verification-pdf.json');
 await page.locator('.case-replay').first().click();await expect(page.locator('#result-title')).toContainText('modèle BTE');await expect(page.locator('#empirical')).not.toBeChecked();await expect(page.locator('.stat-value').nth(1)).toContainText('280,89');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});
