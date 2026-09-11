import {test,expect} from '@playwright/test';

test('live source editing, insertion, reordering and deletion preserve active data',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/builder/');
 await expect(page.locator('#preview h2')).toHaveText('Hello visual builder');
 await page.getByLabel('Message',{exact:true}).fill('Kept state');
 await expect(page.locator('#preview h2')).toHaveText('Kept state');
 await page.locator('#preview [data-design-id=d1]').dispatchEvent('click');
 await page.locator('[data-widget=p]').hover();
 await page.getByRole('button',{name:'Add p',exact:true}).click();
 await expect(page.locator('#preview p')).toHaveCount(1);
 await page.locator('[data-inspector=source-editor] [data-property=value] [data-cell=value]').fill('New paragraph');
 await page.locator('#selection').click();
 await expect(page.locator('#preview p')).toHaveText('New paragraph');
 await page.getByRole('button',{name:'↑ Up',exact:true}).click();
 await expect(page.locator('#preview [data-design-id=d1] > *').nth(1)).toHaveText('New paragraph');
 await expect(page.getByLabel('Message',{exact:true})).toHaveValue('Kept state');
 await page.getByRole('button',{name:'Delete',exact:true}).click();
 await expect(page.locator('#preview p')).toHaveCount(0);
 await expect(page.locator('#preview h2')).toHaveText('Kept state');
 expect(errors).toEqual([]);
});

test('drag feedback, forbidden leaf drop and accepted container drop',async({page})=>{
 await page.goto('/builder/');
 const payload=await page.evaluateHandle(()=>new DataTransfer());
 await page.locator('[data-widget=p]').dispatchEvent('dragstart',{dataTransfer:payload});
 await page.locator('#preview h2').dispatchEvent('dragover',{dataTransfer:payload});
 await expect(page.locator('.outline.allowed')).toHaveCount(1);
 await expect(page.locator('.outline.forbidden')).toHaveCount(2);
 await page.locator('#preview h2').dispatchEvent('drop',{dataTransfer:payload});
 await expect(page.locator('#preview p')).toHaveCount(0);
 await expect(page.getByRole('status')).toContainText('Drop rejected');
 await page.locator('[data-widget=p]').dragTo(page.locator('#preview [data-design-id=d1]'),{targetPosition:{x:10,y:10}});
 await expect(page.locator('#preview p')).toHaveCount(1);
});

test('move across containers and reject a cycle',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/builder/');
 await page.locator('[data-widget=div]').hover();
 await page.getByRole('button',{name:'Add div',exact:true}).click();
 await expect(page.locator('#preview [data-design-id=d4]')).toBeVisible();
 await page.locator('#preview [data-design-id=d2]').click({position:{x:8,y:8}});
 await page.locator('#move').dragTo(page.locator('#preview [data-design-id=d4]'),{targetPosition:{x:12,y:12}});
 await expect(page.locator('#preview [data-design-id=d4] h2')).toHaveCount(1);
 await expect(page.locator('#preview [data-design-id=d1] h2')).toHaveCount(0);
 await page.locator('#preview [data-design-id=d4]').click({position:{x:8,y:8}});
 await page.locator('#move').dragTo(page.locator('#preview h2'));
 await expect(page.locator('#preview [data-design-id=d4] h2')).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('nested container cycle is rejected',async({page})=>{
 await page.goto('/builder/');
 await page.locator('#preview [data-design-id=d1]').dispatchEvent('click');
 await page.locator('[data-widget=div]').hover();
 await page.getByRole('button',{name:'Add div',exact:true}).click();
 await page.locator('#preview [data-design-id=d1]').click({position:{x:8,y:8}});
 await page.locator('#move').dragTo(page.locator('#preview [data-design-id=d4]'),{targetPosition:{x:10,y:10}});
 await expect(page.getByRole('status')).toContainText(/Forbidden|Drop rejected/);
 await expect(page.locator('#preview [data-design-id=d1] [data-design-id=d4]')).toHaveCount(1);
 await page.locator('#preview [data-design-id=d1]').dispatchEvent('click');
 await page.getByLabel('Message',{exact:true}).fill('Still reactive');
 await expect(page.locator('#preview h2')).toHaveText('Still reactive');
});

test('all catalogue widgets can be added and a labelled formlet can host inputs',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/builder/');
 await page.locator('[data-widget=labledBox]').hover();
 await page.getByRole('button',{name:'Add labledBox',exact:true}).click();
 await page.locator('[data-widget=formlet]').hover();
 await page.getByRole('button',{name:'Add formlet',exact:true}).click();
 for(const tag of ['textBox','numberTextBox','checkbox','colorpicker','button','h2','p']){
  await page.locator('#preview [data-design-id=d5]').dispatchEvent('click');
  await page.locator(`[data-widget=${tag}]`).hover();
  await page.getByRole('button',{name:`Add ${tag}`,exact:true}).click();
 }
 await expect(page.locator('#preview gnr-formlet > [data-design-id]')).toHaveCount(7);
 await page.locator('#preview [data-design-id=d4]').dispatchEvent('click');
 await page.locator('[data-inspector=source-editor] [data-name=label] [data-cell=value]').fill('My panel');
 await page.locator('#selection').click();
 await expect(page.locator('#preview gnr-labledbox [part=label]')).toHaveText('My panel');
 expect(errors).toEqual([]);
});


test('embedded Source inspector moves branches; Data tree is not draggable',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/builder/');
 const tree=page.locator('#inspector [data-inspector=source]');
 await expect(tree.locator('[data-node=d1]')).toHaveAttribute('draggable','true');
 await tree.locator('[data-node=d1]').click();
 await page.locator('#canvas').click({position:{x:4,y:4}});
 await page.locator('[data-widget=div]').hover();
 await page.getByRole('button',{name:'Add div',exact:true}).click();
 await tree.locator('[data-node=d2]').dragTo(tree.locator('[data-node=d4]'));
 await expect(page.locator('#preview [data-design-id=d4] h2')).toHaveText('Hello visual builder');
 await tree.locator('[data-node=d4]').click();
 const transfer=await page.evaluateHandle(()=>new DataTransfer());
 await tree.locator('[data-node=d4]').dispatchEvent('dragstart',{dataTransfer:transfer});
 await tree.locator('[data-node=d2]').dispatchEvent('dragover',{dataTransfer:transfer});
 await tree.locator('[data-node=d2]').dispatchEvent('drop',{dataTransfer:transfer});
 await expect(page.locator('#status')).toContainText('Drop rejected');
 await expect(page.locator('#preview [data-design-id=d4] h2')).toHaveCount(1);
 await page.locator('#inspector').getByRole('button',{name:'Data',exact:true}).click();
 await expect(page.locator('[data-inspector=data] [draggable=true]')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('hover pencil opens typed parameters and edits the live block',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/builder/');
 await page.locator('#hover-edit').waitFor({state:'attached'});
 await page.locator('#preview h2').hover();
 await expect(page.getByRole('button',{name:'Edit block parameters',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit block parameters',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog).toBeVisible();
 await dialog.getByLabel('Value',{exact:true}).fill('Edited from hover');
 await dialog.locator('strong').click();
 await expect(page.locator('#preview h2')).toHaveText('Edited from hover');
 await dialog.getByRole('button',{name:'Close parameters'}).click();
 await expect(dialog).not.toBeVisible();
 await page.locator('#preview h2').hover();
 await page.getByRole('button',{name:'Edit block parameters',exact:true}).click();
 await expect(dialog.getByLabel('Value',{exact:true})).toHaveValue('Edited from hover');
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 expect(errors).toEqual([]);
});

test('Source tree hover actions edit and delete without toggling the branch',async({page})=>{
 await page.goto('/builder/');
 const tree=page.locator('#inspector [data-inspector=source]');
 const row=tree.locator('[data-node=d1]');
 await row.hover();
 const edit=row.getByRole('button',{name:'Edit parameters',exact:true});
 await expect(edit).toHaveCSS('pointer-events','auto');
 const branch=tree.locator('details').first();
 await expect(branch).not.toHaveAttribute('open','');
 await edit.click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(branch).not.toHaveAttribute('open','');
 await page.keyboard.press('Escape');
 await row.click();
 const leaf=tree.locator('[data-node=d2]');
 await leaf.hover();
 await leaf.getByRole('button',{name:'Delete block',exact:true}).click();
 await expect(page.locator('#preview h2')).toHaveCount(0);
 await expect(page.locator('#inspector [data-inspector=data] .actions')).toHaveCount(0);
});
