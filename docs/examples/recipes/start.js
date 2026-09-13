// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Generic mount plus explicit recipe composition; no application DOM or event wiring.
import {Application, wrapSource} from 'gramlot-dom';
import {GramlotBuilder} from 'gramlot-builder';
import {fromTytx} from 'genro-tytx';
import {messageBoxRecipe} from './recipe.js';

const standalone = location.pathname.endsWith('/standalone.html');
class Standalone extends GramlotBuilder {
    main(root) {
        root.h1('JavaScript recipe · standalone');
        root.p('Two instances, browser Data, no Python execution or RPC.');
        root.checkBox({value: '^showDetail', default: false, lbl: 'Show extra node'});
        instances(root);
        root.a('Back to the Python / JavaScript comparison', {href: './'});
    }
}
function instances(parent) {
    for (const key of ['first', 'second']) {
        messageBoxRecipe(parent, {datapath: `javascript.${key}`,
            title: `JavaScript · ${key}`, showDetail: '^showDetail'});
    }
}
const builder = standalone ? new Standalone('example') : new GramlotBuilder('example');
if (!standalone) {
    const {pythonSource} = await import('./python-source.js');
    builder.loadSource(fromTytx(pythonSource, 'json'));
}
const application = new Application(document.getElementById('root'), builder);
if (!standalone) application.live(() => instances(wrapSource(builder.nodeById('javascript_recipes'))));
// Debugging handle for Source/Data inspection and the browser acceptance test.
window.recipeExample = application;
