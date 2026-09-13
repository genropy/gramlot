import {test,expect} from '@playwright/test';
const url=process.env.GRAMLOT_CHECKBOXTEXT_URL;
test.beforeEach(async({page})=>{test.skip(!url,'Requires checkBoxText Python example');await page.goto(url);});
test('multi-selection stays open, shares Data and closes with keyboard or outside click',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const popup=page.locator('gnr-checkboxtext').nth(0), inline=page.locator('gnr-checkboxtext').nth(1);
    const display=popup.locator('input[type=text]');
    await popup.getByRole('button',{name:'Choose values'}).click();
    const cost=popup.getByRole('checkbox',{name:'Cost',exact:true}),revenue=popup.getByRole('checkbox',{name:'Revenue',exact:true});
    await cost.check();await revenue.check();
    await expect(cost).toBeVisible();await expect(display).toHaveValue('Cost,Revenue');
    await expect(inline.getByRole('checkbox',{name:'Cost',exact:true})).toBeChecked();
    await expect(page.getByText('Codes: cost,revenue',{exact:true})).toBeVisible();
    await expect(page.getByText('Labels: Cost,Revenue',{exact:true})).toBeVisible();
    await page.screenshot({path:'/tmp/checkboxtext-popup.png'});
    await revenue.press('Escape');await expect(cost).toBeHidden();await expect(display).toBeFocused();
    await display.press('ArrowDown');await expect(cost).toBeFocused();
    await cost.press('Tab');await expect(revenue).toBeFocused();
    await revenue.press('Shift+Tab');await expect(cost).toBeFocused();
    await cost.press('ArrowDown');await expect(revenue).toBeFocused();
    await revenue.press('Space');await expect(revenue).not.toBeChecked();await expect(cost).toBeVisible();
    await page.getByRole('heading',{name:'checkBoxText — multiple selection'}).click();await expect(cost).toBeHidden();
    await page.getByRole('button',{name:'Select Revenue externally'}).click();
    await expect(display).toHaveValue('Revenue');await expect(inline.getByRole('checkbox',{name:'Revenue',exact:true})).toBeChecked();
    await page.getByRole('button',{name:'Clear externally'}).click();await expect(display).toHaveValue('');
    await inline.getByRole('checkbox',{name:'Cost',exact:true}).check();await page.getByRole('button',{name:'Rename Cost',exact:true}).click();
    await expect(display).toHaveValue('Operating cost');
    await page.getByRole('checkbox',{name:'Readonly',exact:true}).check();
    await expect(popup.getByRole('button',{name:'Choose values'})).toBeDisabled();
    await expect(inline.getByRole('checkbox',{name:'Operating cost',exact:true})).toBeDisabled();
    await display.press('ArrowDown');await expect(popup.getByRole('dialog')).toBeHidden();
    await page.getByRole('checkbox',{name:'Readonly',exact:true}).uncheck();
    await page.getByRole('checkbox',{name:'Disabled',exact:true}).check();await expect(display).toBeDisabled();
    await page.getByRole('checkbox',{name:'Disabled',exact:true}).uncheck();
    await expect(display).toBeEnabled();
    expect(errors).toEqual([]);
});
test('Bag mutations/replacement update captions and preserve orphan codes',async({page})=>{
    const popup=page.locator('gnr-checkboxtext').nth(2),display=popup.locator('input[type=text]');
    await expect(display).toHaveValue('Cost');
    await page.getByRole('button',{name:'Rename Bag option'}).click();await expect(display).toHaveValue('Costs renamed');
    await page.getByRole('button',{name:'Replace options Bag'}).click();await expect(display).toHaveValue('cost');
    await expect(page.getByText('Bag codes: cost',{exact:true})).toBeVisible();
    await expect(page.getByText('Bag labels: cost',{exact:true})).toBeVisible();
    await popup.getByRole('button',{name:'Choose values'}).click();
    await expect(popup.getByRole('checkbox')).toHaveCount(2);
    await popup.getByRole('checkbox',{name:'Profit',exact:true}).check();
    await expect(display).toHaveValue('cost,Profit');
    await page.getByRole('button',{name:'Select both externally'}).click();
    await expect(display).toHaveValue('Sales revenue,Profit');
    await popup.getByRole('button',{name:'Choose values'}).click();
    await popup.getByRole('checkbox',{name:'Sales revenue',exact:true}).uncheck();
    await popup.getByRole('checkbox',{name:'Profit',exact:true}).uncheck();
    await expect.poll(()=>popup.evaluate(w=>w.sourceNode.handler.application.data.getItem(w.sourceNode.absDatapath(w.sourceNode.getAttr('value'))))).toBe(null);
    await expect(page.getByText('Bag labels: ',{exact:true})).toBeVisible();
    await popup.getByRole('checkbox',{name:'Profit',exact:true}).press('Escape');
    const cleanup=await popup.evaluate(widget=>{
        const source=widget.sourceNode,app=source.handler.application,bag=widget.values;
        app.live(()=>source.parentBag.popNode(source.label));
        bag.getNode('third').setAttr({caption:'Detached update'});
        return {connected:widget.isConnected,subscriptions:widget._subscriptions.length,
            toolsConnected:widget._controlTools.connected,popupOpen:widget._tool.isOpen};
    });
    expect(cleanup).toEqual({connected:false,subscriptions:0,toolsConnected:false,popupOpen:false});
});

test('ten options can be checked and unchecked by label without closing',async({page})=>{
    const popup=page.locator('gnr-checkboxtext').first();
    await popup.getByRole('button',{name:'Choose values'}).click();
    const boxes=popup.getByRole('checkbox');
    await expect(boxes).toHaveCount(10);
    for(const name of ['Cost','Revenue','Shipping','Profit']) {
        const label=popup.locator('.checkbox-text-options label').filter({hasText:new RegExp(`^${name}$`)});
        await label.click();
        await expect(popup.getByRole('checkbox',{name,exact:true})).toBeChecked();
        await expect(popup.getByRole('dialog')).toBeVisible();
        await label.click();
        await expect(popup.getByRole('checkbox',{name,exact:true})).not.toBeChecked();
        await expect(popup.getByRole('dialog')).toBeVisible();
    }
});

test('editable codes drive checkboxes and checkbox changes update the text',async({page})=>{
    const editor=page.locator('gnr-textbox input');
    const popup=page.locator('gnr-checkboxtext').first();
    const inline=page.locator('gnr-checkboxtext').nth(1);
    await editor.fill('cost,shipping');
    await expect(inline.getByRole('checkbox',{name:'Cost',exact:true})).toBeChecked();
    await expect(inline.getByRole('checkbox',{name:'Shipping',exact:true})).toBeChecked();
    await expect(inline.getByRole('checkbox',{name:'Revenue',exact:true})).not.toBeChecked();
    await popup.getByRole('button',{name:'Choose values'}).click();
    await popup.getByRole('checkbox',{name:'Revenue',exact:true}).check();
    await expect(editor).toHaveValue('cost,shipping,revenue');
    await popup.getByRole('checkbox',{name:'Cost',exact:true}).uncheck();
    await expect(editor).toHaveValue('shipping,revenue');
    await editor.fill('');
    await expect(inline.getByRole('checkbox',{checked:true})).toHaveCount(0);
});
