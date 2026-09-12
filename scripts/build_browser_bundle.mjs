// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Bundle the prepared browser sources. Packaging and the manifest are handled in Python. */
import {cp, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join, resolve} from 'node:path';

const require = createRequire(new URL('../js/dom/package.json', import.meta.url));
const {build} = require('esbuild');

const [resourcesArg, outputArg] = process.argv.slice(2);
if (!resourcesArg || !outputArg) throw new Error('usage: build_browser_bundle.mjs RESOURCES OUTPUT');
const resources = resolve(resourcesArg);
const output = resolve(outputArg);
const dom = join(resources, 'gramlot-dom/src');
const pages = join(resources, 'pages');
const bag = join(resources, 'genro-bag-js/src');
const tytx = join(resources, 'genro-tytx/js/src');
const msgpack = join(resources, 'genro-tytx/js/node_modules/@msgpack/msgpack/dist.esm');
const frontend = resolve(resources, '../contrib/fastapi/frontend');

const aliases = new Map([
    ['gramlot-dom', join(dom, 'index.js')],
    ['gramlot-dom/date-parser', join(dom, 'date-parser/index.js')],
    ['gramlot-builder', join(pages, 'builder.js')],
    ['genro-bag-js', join(bag, 'index.js')],
    ['#uuid', join(bag, 'browser-uuid.js')],
    ['genro-tytx', join(tytx, 'index.js')],
    ['genro-tytx/msgpack.js', join(tytx, 'msgpack.js')],
    ['decimal.js', join(resources, 'decimal.js/decimal.mjs')],
    ['@msgpack/msgpack', join(msgpack, 'index.mjs')],
    ['@xmldom/xmldom', join(pages, 'xmldom.js')],
    ['module', join(frontend, 'module.js')],
]);
const aliasPlugin = {
    name: 'prepared-gramlot-resources',
    setup(builder) {
        builder.onResolve({filter: /.*/}, args => {
            if (args.path.startsWith('/_assets/dom/')) {
                return {path: join(dom, args.path.slice('/_assets/dom/'.length))};
            }
            const path = aliases.get(args.path);
            return path ? {path} : null;
        });
    },
};
const entries = {
    'gramlot-dom': aliases.get('gramlot-dom'),
    'gramlot-dom-date-parser': aliases.get('gramlot-dom/date-parser'),
    'gramlot-builder': aliases.get('gramlot-builder'),
    'genro-bag-js': aliases.get('genro-bag-js'),
    'genro-tytx': aliases.get('genro-tytx'),
    'genro-tytx-msgpack': aliases.get('genro-tytx/msgpack.js'),
    'decimal': aliases.get('decimal.js'),
    'msgpack': aliases.get('@msgpack/msgpack'),
    'xmldom': aliases.get('@xmldom/xmldom'),
    'module': aliases.get('module'),
    'gramlot-page-startup': join(frontend, 'entry.js'),
    'inspector-component': join(pages, 'inspector-component.js'),
    'inspector-editor': join(pages, 'inspector-editor.js'),
};
await mkdir(output, {recursive: true});
await build({
    entryPoints: entries, outdir: output, bundle: true, splitting: true, format: 'esm',
    platform: 'browser', target: ['es2022'], minify: true, keepNames: true,
    sourcemap: false, entryNames: '[name]', chunkNames: 'chunks/[name]-[hash]',
    plugins: [aliasPlugin], logLevel: 'info',
});
await mkdir(join(output, 'chunks'), {recursive: true});
for (const name of ['inspector.tytx', 'inspector-embedded.tytx',
                    'inspector.css', 'inspector-theme.css']) {
    await cp(join(pages, name), join(output, name));
    // A shared class containing import.meta.url may move under chunks/.
    await cp(join(pages, name), join(output, 'chunks', name));
}
