// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import '../src/collections/clipboard.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';
import {Application} from '../src/application.js';

test('clipboard confirms only success, reports rejection, and ignores disabled clicks', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['clipboard'];
        main(root) { root.copyButton({value:'Hello clipboard'}); }
    }
    const host = document.createElement('div');document.body.append(host);
    new Application(host, new Page('main'));
    const widget = host.querySelector('gnr-copybutton');
    let copied;
    Object.defineProperty(window.navigator, 'clipboard', {configurable:true, value:{writeText:async value => {copied=value;}}});
    await widget.copy();
    assert.equal(copied,'Hello clipboard');
    assert.equal(widget.shadowRoot.querySelector('button').title,'Copied');
    window.navigator.clipboard.writeText = async () => {throw new Error('Denied');};
    await widget.copy();
    assert.equal(widget.shadowRoot.querySelector('button').title,'Retry copy');
    assert.match(widget.shadowRoot.textContent,/Copy failed/);
    widget.setAttribute('disabled','');copied=null;
    await widget.copy();assert.equal(copied,null);
    widget.remove();
});
