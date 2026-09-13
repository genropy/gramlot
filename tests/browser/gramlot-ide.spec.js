import {test,expect} from '@playwright/test';

test('temporary IDE workspace edits, saves and guards dirty close',async({page})=>{
    test.skip(!process.env.GRAMLOT_IDE_URL,'Requires the temporary Gramlot IDE example workspace');
    await page.goto(process.env.GRAMLOT_IDE_URL);
    const ide=page.locator('gnr-gramlotide');
    await expect(ide.getByRole('tab',{name:'welcome.py',exact:true})).toBeVisible();
    const code=ide.locator('gnr-codemirror .cm-content');
    await expect(code).toBeVisible({timeout:60000});
    const original=await ide.locator('gnr-codemirror').evaluate(editor=>editor.value);
    const value=original+'\n# Browser verification '+Date.now();
    await expect(code).toHaveAttribute('contenteditable','false');
    await ide.getByRole('button',{name:'Enable editing',exact:true}).click();
    await expect(code).toHaveAttribute('contenteditable','true');
    await code.fill(value);
    await ide.getByRole('button',{name:'Save',exact:true}).click();
    await expect(ide.getByRole('status')).toHaveText('Saved');
    await code.fill(value+'\n# unsaved');
    await ide.getByRole('button',{name:/^Close welcome\.py/}).click();
    await ide.getByRole('button',{name:'Keep editing'}).click();
    await expect(ide.getByRole('tab',{name:'welcome.py •',exact:true})).toBeVisible();
    await ide.getByRole('button',{name:'Revert',exact:true}).click();
    await expect(code).toHaveText(value);
    await code.fill(original);
    await ide.getByRole('button',{name:'Save',exact:true}).click();
    await expect(ide.getByRole('status')).toHaveText('Saved');
});
