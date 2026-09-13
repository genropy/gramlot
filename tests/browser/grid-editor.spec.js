// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test,expect} from '@playwright/test';

test('resident Source cell editor: typed confirmation, scroll, cancellation and RPC choice',async({page})=>{
    test.skip(!process.env.GRAMLOT_GRID_EDITOR_URL,'Requires the Python grid-editor example');
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.GRAMLOT_GRID_EDITOR_URL);
    const grid=page.locator('gnr-grid').first();await expect(grid).toBeVisible();
    const cell=(n)=>grid.locator('.row').first().locator('.cell').nth(n);
    await cell(0).dblclick();let input=grid.locator('gnr-textbox input');await expect(input).toBeVisible();
    await input.fill('Browser edit');
    await grid.evaluate(g=>{g._frame.scrollTop=800});await page.waitForTimeout(100);
    await grid.evaluate(g=>{g._frame.scrollTop=0});await page.waitForTimeout(100);
    await expect(input).toHaveValue('Browser edit');await input.press('Tab');
    await expect(page.getByText('First description in Data: Browser edit',{exact:true})).toBeVisible();
    input=grid.locator('gnr-numbertextbox input');await expect(input).toBeVisible();
    const editorHeight=await grid.evaluate(g=>g.gridEditor.layer.getBoundingClientRect().height);
    await input.fill('0');await input.press('Enter');await expect(input).toBeVisible();
    const message=grid.locator('[data-validation-message]');
    await expect(message).toHaveText('Enter a value greater than or equal to 1.');
    await expect(message).toBeVisible();
    await expect.poll(()=>grid.evaluate(g=>g.gridEditor.layer.getBoundingClientRect().height)).toBe(editorHeight);
    await expect(grid.locator('.cell.invalidCell')).toHaveCount(1);
    await grid.evaluate(g=>{g._frame.scrollTop=800});
    await expect(grid.locator('.cell.invalidCell')).toHaveCount(0);
    await grid.evaluate(g=>{g._frame.scrollTop=0});
    await expect(grid.locator('.cell.invalidCell')).toHaveCount(1);
    await expect(grid.locator('.cell.invalidCell')).toHaveAttribute('aria-invalid','true');
    await expect(input).toHaveValue('0');
    const messageBox=await message.boundingBox(), inputBox=await input.boundingBox();
    expect(messageBox.y+messageBox.height).toBeLessThanOrEqual(inputBox.y);

    await input.fill('4');await input.press('Tab');await expect(page.getByText('First quantity in Data: 4',{exact:true})).toBeVisible();await grid.locator('gnr-numbertextbox input').press('Escape');
    await expect(grid.locator('.cell.invalidCell')).toHaveCount(0);
    await cell(0).dblclick();input=grid.locator('gnr-textbox input');await input.fill('Discard');await input.press('Escape');await expect(cell(0)).toHaveText('Browser edit');
    await cell(3).dblclick();input=grid.locator('gnr-dbselect input');await expect(input).toHaveValue('Desk lamp');await input.fill('Note');
    await expect(grid.getByRole('option',{name:'Notebook',exact:true})).toBeVisible();await grid.getByRole('option',{name:'Notebook',exact:true}).click();await input.press('Tab');
    await expect(page.getByText('First product ID in Data: book',{exact:true})).toBeVisible();
    await expect.poll(()=>grid.evaluate(g=>g.storeBag.getItem('r0.total').toString())).toBe('50');
    expect(errors).toEqual([]);
});


test('Tab selects the value and vertical arrows move the active editor',async({page})=>{
    test.skip(!process.env.GRAMLOT_GRID_EDITOR_URL,'Requires the Python grid-editor example');
    await page.goto(process.env.GRAMLOT_GRID_EDITOR_URL);
    const grid=page.locator('gnr-grid').first();
    await grid.locator('.row').first().locator('.cell').first().dblclick();
    await grid.locator('gnr-textbox input').press('Tab');
    const input=grid.locator('gnr-numbertextbox input');
    await expect.poll(()=>input.evaluate(el=>[el.selectionStart,el.selectionEnd,el.value.length])).toEqual([0,1,1]);
    await input.press('7');
    await input.press('ArrowDown');
    await expect.poll(()=>grid.evaluate(g=>g.gridEditor.active.key)).toBe('r1');
    await expect(page.getByText('First quantity in Data: 7',{exact:true})).toBeVisible();
    await expect(input).toHaveValue('2');
    await expect.poll(()=>input.evaluate(el=>[el.selectionStart,el.selectionEnd])).toEqual([0,1]);
    await input.press('ArrowUp');
    await expect.poll(()=>grid.evaluate(g=>g.gridEditor.active.key)).toBe('r0');
    await expect(input).toHaveValue('7');
    await input.press('ArrowUp');
    await expect(input).toBeVisible();
    await expect.poll(()=>grid.evaluate(g=>g.gridEditor.active.key)).toBe('r0');
    await expect.poll(()=>grid.evaluate(g=>getComputedStyle(g.gridEditor.layer,'::after').boxShadow)).toContain('inset');
    await input.press('Escape');
    await grid.locator('.row').first().locator('.cell').nth(3).dblclick();
    const select=grid.locator('gnr-dbselect input');
    await expect(select).toHaveValue('Desk lamp');
    await select.press('ArrowDown');
    await expect(grid.getByRole('option',{name:'Notebook',exact:true})).toBeVisible();
    await select.press('ArrowDown');
    await expect.poll(()=>grid.evaluate(g=>g.gridEditor.active.key)).toBe('r0');
    await expect(grid.getByRole('option',{name:'Notebook',exact:true})).toHaveAttribute('aria-selected','true');
    await select.press('Tab');
    await expect(page.getByText('First product ID in Data: book',{exact:true})).toBeVisible();
});

test('dbSelect accepts the visible suggestion on Tab and leaving the field',async({page})=>{
    test.skip(!process.env.GRAMLOT_GRID_EDITOR_URL,'Requires the Python grid-editor example');
    await page.goto(process.env.GRAMLOT_GRID_EDITOR_URL);
    const grid=page.locator('gnr-grid').first();
    const product=()=>grid.locator('.row').first().locator('.cell').nth(3);
    await product().dblclick();
    let input=grid.locator('gnr-dbselect input');
    await expect(input).toHaveValue('Desk lamp');
    await input.fill('n');
    await expect(grid.getByRole('option',{name:'Notebook',exact:true})).toBeVisible();
    await input.press('Tab');
    await expect(page.getByText('First product ID in Data: book',{exact:true})).toBeVisible();
    await grid.locator('gnr-textbox input').press('Escape');
    await product().dblclick();
    input=grid.locator('gnr-dbselect input');
    await expect(input).toHaveValue('Notebook');
    await input.fill('oak');
    await expect(grid.getByRole('option',{name:'Oak desk',exact:true})).toBeVisible();
    await page.getByText('First product ID in Data: book',{exact:true}).click();
    await expect(input).toHaveValue('Oak desk');
    await input.press('Tab');
    await expect(page.getByText('First product ID in Data: desk',{exact:true})).toBeVisible();
    await grid.locator('gnr-textbox input').press('Escape');
    await product().dblclick();
    input=grid.locator('gnr-dbselect input');
    await expect(input).toHaveValue('Oak desk');
    await input.fill('no-match');
    await expect(grid.getByText('No results',{exact:true})).toBeVisible();
    await input.press('Tab');
    await expect(input).toBeVisible();
    await expect(grid.locator('#choice-error')).toBeHidden();
    await expect(grid.locator('[data-validation-message]')).toBeVisible();
    await expect(grid.locator('.cell.invalidCell')).toHaveCount(1);
    await expect(page.getByText('First product ID in Data: desk',{exact:true})).toBeVisible();
    await input.press('Escape');
});

test('widget playground confirms multiline, choices and typed editors',async({page})=>{
    test.skip(!process.env.GRAMLOT_GRID_EDITOR_URL,'Requires the Python grid-editor example');
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.GRAMLOT_GRID_EDITOR_URL);
    const choices=page.locator('gnr-grid').nth(1), typed=page.locator('gnr-grid').nth(2);
    const open=async(grid,index)=>{await grid.locator('.row').first().locator('.cell').nth(index).dblclick()};
    const stored=(grid,field)=>grid.evaluate((g,f)=>g.storeBag.getItem(`r0.${f}`),field);
    await open(choices,0);
    const area=choices.locator('textarea');
    await area.fill('First');await area.press('End');await area.press('Enter');await area.press('S');
    await expect(area).toHaveValue('First\nS');
    await area.press('ArrowUp');
    await expect.poll(()=>choices.evaluate(g=>g.gridEditor.active.key)).toBe('r0');
    await area.press('Control+Enter');
    await expect.poll(()=>stored(choices,'notes')).toBe('First\nS');
    await open(choices,1);
    await choices.locator('gnr-filteringselect input').fill('France');
    await choices.locator('gnr-filteringselect input').press('Tab');
    await expect.poll(()=>stored(choices,'country')).toBe('fr');
    await choices.locator('gnr-combobox input').fill('Custom choice');
    await choices.locator('gnr-combobox input').press('Tab');
    await expect.poll(()=>stored(choices,'free_choice')).toBe('Custom choice');
    const remote=choices.locator('gnr-remoteselect input');
    await expect(remote).toHaveValue('Desk lamp');await remote.fill('note');
    await expect(choices.getByRole('option',{name:'Notebook',exact:true})).toBeVisible();
    await remote.press('Tab');
    await expect.poll(()=>stored(choices,'remote')).toBe('book');
    const checkbox=choices.locator('input[type=checkbox]');
    await checkbox.uncheck();await checkbox.press('Enter');
    await expect.poll(()=>stored(choices,'enabled')).toBe(false);
    await open(typed,0);
    const day=typed.locator('gnr-datetextbox input');
    await day.fill('14/09/2026');await day.press('Tab');
    await expect.poll(()=>typed.evaluate(g=>g.storeBag.getItem('r0.day').toISOString().slice(0,10))).toBe('2026-09-14');
    const hour=typed.locator('input[type=time]');await hour.fill('16:45');await hour.press('Tab');
    await expect(hour).toHaveCount(0);
    await expect.poll(()=>typed.evaluate(g=>g.storeBag.getItem('r0.hour').toISOString().slice(11,19))).toBe('16:45:00');
    const range=typed.locator('input[type=range]');await range.press('ArrowUp');await range.press('Tab');
    await expect.poll(()=>stored(typed,'level')).toBe(45);
    await range.press('ArrowUp');await range.press('Tab');
    await expect.poll(()=>stored(typed,'vertical')).toBe(45);
    const color=typed.locator('input[type=color]');await color.fill('#ff0000');await color.press('Tab');
    await expect.poll(()=>stored(typed,'color')).toBe('#ff0000');
    const password=typed.locator('input[type=password]');await password.fill('changed');await password.press('Enter');
    await expect.poll(()=>stored(typed,'password')).toBe('changed');
    expect(errors).toEqual([]);
});

test('Down opens closed choice menus without leaving the edited row',async({page})=>{
    test.skip(!process.env.GRAMLOT_GRID_EDITOR_URL,'Requires the Python grid-editor example');
    await page.goto(process.env.GRAMLOT_GRID_EDITOR_URL);
    const grid=page.locator('gnr-grid').nth(1);
    for (const [column,tag,caption,next] of [
        [1,'gnr-filteringselect','Italy','England'],
        [2,'gnr-combobox','Italy','England'],
        [3,'gnr-remoteselect','Desk lamp','Notebook'],
    ]) {
        await grid.locator('.row').first().locator('.cell').nth(column).dblclick();
        const input=grid.locator(`${tag} input`);
        await expect(input).toHaveValue(caption);
        await expect(input).toHaveAttribute('aria-expanded','false');
        await input.press('ArrowDown');
        await expect(input).toHaveAttribute('aria-expanded','true');
        await expect.poll(()=>grid.evaluate(g=>g.gridEditor.active.key)).toBe('r0');
        await input.press('ArrowDown');
        await expect(grid.getByRole('option',{name:next,exact:true})).toHaveAttribute('aria-selected','true');
        await input.press('Escape');
        await expect(input).toHaveAttribute('aria-expanded','false');
        await input.press('Escape');
    }
});
