import {test,expect} from '@playwright/test';
test('all examples share one navigation tree and DB details work on the same host',async({page})=>{
 test.skip(!process.env.GRAMLOT_EXAMPLES_URL, 'Requires the full example host with database enabled');
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let reference;
 for(const path of ['/lessons/08-textbox-area/','/gallery/','/builder/','/page/triangle/','/hello/hello/','/openapi/','/database/states/']){
  await page.goto(process.env.GRAMLOT_EXAMPLES_URL.replace(/\/$/, '')+path);
  await expect(page.locator('#example-navigation')).toBeVisible();
  const nav=page.frameLocator('#example-navigation');
  await expect(nav.getByRole('heading',{name:'Gramlot examples'})).toBeVisible();
  const links=await nav.locator('a').evaluateAll(nodes=>nodes.map(n=>[n.textContent,n.getAttribute('href')]));
  if(reference) expect(links).toEqual(reference);else reference=links;
  await expect(nav.locator('[aria-current="page"]')).toHaveAttribute('href',path);
 }
 await expect(page.locator('gnr-grid')).toHaveCount(3);
 await page.locator('gnr-grid').first().locator('[data-row-key="VIC"]').click();
 await expect(page.locator('.example-live')).toContainText('customers in VIC');
 await expect(page.locator('.example-live')).toContainText('localities in VIC');
 const nav=page.frameLocator('#example-navigation');
 await expect(nav.getByRole('link',{name:'States, localities and customers'})).toBeVisible();
 expect(errors).toEqual([]);
});
