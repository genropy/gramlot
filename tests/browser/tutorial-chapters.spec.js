import {test,expect} from '@playwright/test';
const lessons=['16-date-input','17-text-mask','18-date-format','19-required-validation','20-tree-selection','21-grid-records','22-grid-attributes','23-email-validation','24-number-validation'];
for(const language of ['python','javascript'])for(const slug of lessons){
 test(`${slug} / ${language}`,async({page})=>{
  await page.goto(`/lessons/${slug}/${language}.html`);
  await expect(page.locator('html')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#error')).toBeHidden();
  if(slug==='17-text-mask'){
   await page.getByLabel('Name',{exact:true}).fill('Ada');
   await expect(page.locator('#root p').first()).toHaveText('Hello, Ada!');
   await expect(page.locator('#root p').last()).toHaveText('Ada');
  }
  if(slug==='19-required-validation'||slug==='23-email-validation'||slug==='24-number-validation'){
   const input=page.locator('#root input').first();
   await input.fill(slug==='24-number-validation'?'20':slug==='23-email-validation'?'invalid':'A');
   await page.locator('#root p').click();
   await expect(page.locator('#root [data-validation-message]')).toBeVisible();
   await expect(page.locator('#root [data-validation-message]')).not.toHaveText('');
   await input.fill(slug==='24-number-validation'?'5':slug==='23-email-validation'?'ada@example.com':'ABC');
   await page.locator('#root p').click();
   await expect(page.locator('#root [data-validation-message]')).toBeHidden();
  }
  if(slug==='16-date-input'||slug==='18-date-format'){
   await page.locator('#root input').first().fill('2026-09-11');
   await page.locator('#root input').first().press('Tab');
   await expect(page.locator('#root p').first()).toContainText('11/09/2026');
  }
  if(slug==='20-tree-selection'){
   await page.locator('gnr-storetree summary').click();
   await page.locator('gnr-storetree .leaf').first().click();
   await expect(page.locator('#root p')).toHaveText('Selected path: people.ada');
  }
  if(slug.startsWith('21-')||slug.startsWith('22-')){
   await expect(page.getByRole('gridcell',{name:'Ada',exact:true})).toBeVisible();
   await expect(page.getByRole('gridcell',{name:'Grace',exact:true})).toBeVisible();
   if(slug.startsWith('21-')){
    await page.getByRole('gridcell',{name:'Ada',exact:true}).click();
    await expect(page.locator('#root p')).toHaveText('Selected key: ada');
   }else await expect(page.getByRole('gridcell',{name:'1,234.57',exact:true})).toBeVisible();
  }
 });
}
test('nested chapters link to the new lessons',async({page})=>{
 await page.goto('/lessons/20-tree-selection/');
 await expect(page.locator('[data-nav-group="Trees"] [data-nav-group="Trees / Hierarchy"] a')).toHaveAttribute('aria-current','page');
 await expect(page.locator('[data-nav-group="Grids / Resident data"] a')).toHaveCount(2);
});
