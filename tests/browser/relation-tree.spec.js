import {test, expect} from '@playwright/test';

test('relation tree expands through RPC and reuses cached branches', async ({page}) => {
    test.skip(!process.env.GRAMLOT_TEST_GENROPY_INSTANCE, 'Requires the optional invoice model host');
    const errors = [], calls = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
        if (request.url().endsWith('/data/relation_tree')) calls.push(request.postData());
    });
    await page.goto('/database/relation-tree/');
    const tree = page.locator('gnr-relationtree');
    await expect(tree.locator('.caption').first()).toBeVisible();
    const relations = tree.locator('summary .caption').filter({hasText:/^Relations$/});
    if (await relations.count()) await relations.click();
    const invoices = tree.locator('summary .caption').filter({hasText:/^@invoices$/});
    await expect(invoices).toBeVisible();
    expect(calls).toHaveLength(1);
    await invoices.click();
    const rows = tree.locator('summary .caption').filter({hasText:/^@rows$/});
    await expect(rows).toBeVisible();
    expect(calls).toHaveLength(2);
    await rows.click();
    await expect(tree.locator('summary .caption').filter({hasText:/^@Product$/})).toBeVisible();
    expect(calls).toHaveLength(3);
    const product = tree.locator('summary .caption').filter({hasText:/^@Product$/});
    const [rootBox, childBox, grandchildBox] = await Promise.all(
        [invoices, rows, product].map(label => label.boundingBox()));
    expect(childBox.x - rootBox.x).toBeCloseTo(17, 0);
    expect(grandchildBox.x - childBox.x).toBeCloseTo(17, 0);
    await rows.click();
    await rows.click();
    await expect(tree.locator('summary .caption').filter({hasText:/^@Product$/})).toBeVisible();
    expect(calls).toHaveLength(3);
    await expect(page.locator('.cm-editor')).toContainText('class Page');
    expect(errors).toEqual([]);
});
