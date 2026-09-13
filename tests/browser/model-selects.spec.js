import {test, expect} from '@playwright/test';

test('remote and callback model cascades share selection behavior', async ({page}) => {
    test.skip(!process.env.GRAMLOT_MODEL_SELECTS_URL, 'Requires the optional GenroPy example host');
    let calls = 0;
    page.on('request', request => {
        if (request.url().includes('/data/model_choices')) calls++;
    });
    await page.goto(process.env.GRAMLOT_MODEL_SELECTS_URL);
    for (const mode of ['remote', 'callback']) {
        const before = calls;
        for (const [kind, value] of [['package', 'invc'], ['table', 'customer'], ['field', 'email']]) {
            await page.locator(`#${mode}-${kind} input`).fill(value);
            await page.getByRole('option', {name: value, exact: true}).click();
        }
        await expect(page.locator(`#${mode}-field input`)).toHaveValue('email');
        if (mode === 'callback') expect(calls).toBe(before);
        else expect(calls).toBeGreaterThan(before);
        await page.locator(`#${mode}-package input`).fill('adm');
        await page.getByRole('option', {name: 'adm', exact: true}).click();
        await expect(page.locator(`#${mode}-table input`)).toHaveValue('');
        await expect(page.locator(`#${mode}-field input`)).toHaveValue('');
    }
    await expect(page.locator('.cm-editor')).toContainText('@endpoint');
});
