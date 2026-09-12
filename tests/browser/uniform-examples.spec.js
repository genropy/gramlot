import {test,expect} from '@playwright/test';
test('uniform tutorial and focus-out execution',async({page})=>{
 await page.goto('/lessons/10-local-logic/');
 const row=page.locator('.lab-row[data-language=javascript]').first();
 await expect(row.locator('.cm-editor')).toBeVisible({timeout:20000});
 await expect(row.locator('h3')).not.toHaveText('JavaScript');
 await expect(row.locator('.code-language')).toHaveText('JavaScript');
 await expect(row.locator('[data-action=run]')).toHaveCount(0);
 const editor=row.locator('.cm-content');
 await editor.fill("root.p('Focus-out applied');");
 await editor.press('Tab');
 await expect(row.frameLocator('iframe').locator('#root')).toContainText('Focus-out applied');
 await row.getByRole('button',{name:'Open inspector',exact:true}).click();
 await expect.poll(()=>page.locator('gramlot-inspector').evaluate(node=>node.opened)).toBe(true);
});
test('all generated examples share presentation',async({page})=>{
 await page.goto('/lessons/01-text/');
 await expect(page.locator('.inspector-tool')).toHaveCount(2);
 await expect(page.locator('.code-language')).toHaveCount(2);
 await expect(page.locator('.lab-divider')).toHaveCount(2);
});
