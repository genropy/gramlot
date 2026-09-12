import {test, expect} from '@playwright/test';

test('Python triangle page keeps local formula and dataRpc results aligned', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
        window.gramlotReadiness = [];
        document.addEventListener('gramlot:application-ready', event => {
            window.gramlotReadiness.push({
                phase: 'application', hasServer: Boolean(event.detail.application.server),
            });
        });
        document.addEventListener('gramlot:content-ready', () => {
            window.gramlotReadiness.push({phase: 'content'});
        });
    });
    await page.route('**/page/triangle/rpc/source/main', async route => {
        await new Promise(resolve => setTimeout(resolve, 400));
        await route.continue();
    });
    await page.goto('/page/triangle/');
    await expect(page.locator('#root')).toHaveAttribute('data-gramlot-state', 'loading-content');
    expect(await page.evaluate(() => window.gramlotReadiness)).toEqual([
        {phase: 'application', hasServer: true},
    ]);
    await expect(page.locator('#root')).toHaveAttribute('data-gramlot-state', 'ready');
    await expect(page.locator('#rpc-state')).toHaveText('RPC state: ready');
    await expect(page.locator('#local-result')).toHaveText('Area: 6');
    await expect(page.locator('#python-result')).toHaveText('Area: 6');
    await expect(page.locator('#remote-note')).toHaveText(
        'This fragment was built in Python for base 3.',
    );

    await page.getByLabel('Base', {exact: true}).fill('5');
    await page.getByLabel('Base', {exact: true}).press('Tab');
    await expect(page.locator('#python-result')).toHaveText('Area: 10');
    await page.getByLabel('Height', {exact: true}).fill('8');
    await page.getByLabel('Height', {exact: true}).press('Tab');
    await expect(page.locator('#rpc-state')).toHaveText('RPC state: ready');
    await expect(page.locator('#local-result')).toHaveText('Area: 20');
    await expect(page.locator('#python-result')).toHaveText('Area: 20');
    await expect(page.locator('#remote-note')).toHaveText(
        'This fragment was built in Python for base 5.',
    );
    expect(await page.evaluate(() => window.gramlotReadiness.map(item => item.phase))).toEqual([
        'application', 'content',
    ]);
    expect(errors).toEqual([]);
});

test('busy refuses an overlapping browser RPC without replaying it', async ({page}) => {
    let calls = 0;
    await page.goto('/page/triangle/');
    await expect(page.locator('#python-result')).toHaveText('Area: 6');
    await page.evaluate(() => {
        window.busyCount = 0;
        document.addEventListener('gramlot:busy', () => window.busyCount++);
    });
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/rpc/data/triangle_area', async route => {
        calls++;
        if (calls === 1) await held;
        await route.continue();
    });
    await page.getByLabel('Base', {exact: true}).fill('5');
    await page.getByLabel('Base', {exact: true}).press('Tab');
    await expect.poll(() => calls).toBe(1);
    await page.getByLabel('Height', {exact: true}).fill('8');
    await page.getByLabel('Height', {exact: true}).press('Tab');
    await expect.poll(() => page.evaluate(() => window.busyCount)).toBeGreaterThan(0);
    release();
    await expect(page.locator('#python-result')).toHaveText('Area: 10');
    await expect(page.locator('#local-result')).toHaveText('Area: 20');
    expect(calls).toBe(1);
    await page.getByLabel('Height', {exact: true}).fill('10');
    await page.getByLabel('Height', {exact: true}).press('Tab');
    await expect(page.locator('#python-result')).toHaveText('Area: 25');
    expect(calls).toBe(2);
});

test('example has live/code split, actual CodeMirror and inspector control below the live pane', async ({page}) => {
    await page.goto('/page/triangle/');
    await expect(page.locator('#python-result')).toHaveText('Area: 6');
    await expect(page.locator('.gramlot-inspector-launcher')).toHaveCount(0);
    const editor = page.locator('gnr-codemirror');
    await expect(editor.locator('.cm-editor')).toBeVisible({timeout: 20000});
    expect(await editor.evaluate(node => node.value)).toContain('class Page(WebPage):');
    expect(await editor.evaluate(node => node.value)).toContain('@endpoint');
    await expect(page.getByRole('button', {name:'Open inspector',exact:true})).toBeVisible();
    const live = await page.locator('.example-live').boundingBox();
    const code = await page.locator('.example-code').boundingBox();
    expect(code.x).toBeGreaterThan(live.x);
    expect(live.width).toBeGreaterThan(400);
    const handle = page.locator('gnr-bordercontainer').first().locator('.handle.x').first();
    const bar = await handle.boundingBox();
    await page.mouse.move(bar.x + bar.width / 2, bar.y + 30);
    await page.mouse.down();
    await page.mouse.move(bar.x + 80, bar.y + 30);
    await page.mouse.up();
    expect((await page.locator('.example-live').boundingBox()).width).toBeGreaterThan(live.width + 60);
    await page.getByLabel('Base', {exact: true}).fill('7');
    await page.getByLabel('Base', {exact: true}).press('Tab');
    await expect(page.locator('#python-result')).toHaveText('Area: 14');
    expect((await page.locator('.example-live').boundingBox()).width).toBeGreaterThan(live.width + 60);
});
