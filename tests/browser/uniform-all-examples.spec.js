import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../build/teaching-preview/navigation.json',import.meta.url),'utf8'));
const urls=manifest.map(e=>e.url).filter(u=>u!='/gallery/');
for(const url of urls) test(`uniform panels ${url}`,async({page})=>{
 await page.goto(url);
 const panels=page.locator('.lab-row');
 const count=await panels.count();expect(count).toBeGreaterThan(0);
 await expect(page.locator('.lab-row .cm-editor')).toHaveCount(count,{timeout:30000});
 const checks=await panels.evaluateAll(rows=>rows.map(row=>{
  const live=row.querySelector('iframe'),code=row.querySelector('.code-pane'),divider=row.querySelector('.lab-divider'),tool=row.querySelector('.inspector-tool');
  const l=live.getBoundingClientRect(),c=code.getBoundingClientRect(),d=divider.getBoundingClientRect(),t=tool.getBoundingClientRect();
  return {title:row.querySelector('h3').textContent,language:row.querySelector('.code-language').textContent,
   liveLeft:l.x<c.x,split:d.width,border:parseFloat(getComputedStyle(live).borderTopWidth),
   inspectorBelow:t.top>=l.bottom-1, font:parseFloat(getComputedStyle(code.querySelector('.cm-content')).fontSize),
   scrollerDisplay:getComputedStyle(code.querySelector('.cm-scroller')).display,
   whiteSpace:getComputedStyle(code.querySelector('.cm-content')).whiteSpace,
   background:getComputedStyle(code).backgroundColor,editable:code.querySelector('.cm-content').getAttribute('contenteditable'),
   js:row.dataset.language==='javascript',run:!!row.querySelector('[data-action=run]')};
 }));
 for(const c of checks){
  expect(['Python','JavaScript']).not.toContain(c.title);expect(c.language).toBe('Python');
  expect(c.liveLeft).toBe(true);expect(c.split).toBeLessThanOrEqual(6);expect(c.border).toBe(1);
  expect(c.inspectorBelow).toBe(true);expect(c.font).toBeLessThanOrEqual(12);
  expect(c.background).toBe('rgb(40, 44, 52)');expect(c.run).toBe(false);
  expect(c.scrollerDisplay).toBe('flex');expect(c.whiteSpace).toBe('break-spaces');
  expect(c.js).toBe(false);expect(c.editable).toBe('false');
 }
 console.log('AUDIT',url,count);
});
for(const url of ['/hello/hello/','/hello/alfa/','/hello/beta/','/page/triangle/','/openapi/','/database/states/']) test(`application panels ${url}`,async({page})=>{
 test.skip(url.startsWith('/database/') && !process.env.GRAMLOT_STATES_URL, 'Optional live database host');
 await page.goto(url);
 await expect(page.locator('.example-code .cm-editor')).toBeVisible({timeout:20000});
 const live=await page.locator('.example-live').boundingBox(), code=await page.locator('.example-code').boundingBox();
 const tool=await page.getByRole('button',{name:'Open inspector',exact:true}).boundingBox();
 expect(live.x).toBeLessThan(code.x);expect(tool.y).toBeGreaterThanOrEqual(live.y+live.height-1);
 await expect(page.locator('.gramlot-inspector-launcher')).toHaveCount(0);
 await expect(page.locator('.example-code-label')).toHaveText('Python');
});
