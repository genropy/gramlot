// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Style adapter (HtmlRenderer.adaptAttrs) — Genro-style inline styling.
 *
 * A kwarg is a CSS property if its name is a root (width, display, …) or a
 * root_* form (grid_template_columns → grid-template-columns); `style_<p>`
 * is an explicit CSS escape; an explicit `style="..."` is parsed and merged.
 * Everything else is a plain HTML attribute. The dialect escape `html_<x>`
 * forces the literal HTML attribute <x>. Ported from the Python
 * HtmlRenderer._STYLE_ROOTS / adapt_attrs (macros deferred; units are the
 * author's — write `width:'320px'`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { Application } from '../src/application.js';

function render(PageClass) {
    setupDom();
    const host = document.createElement('div');
    document.body.appendChild(host);
    new Application(host, new PageClass('main'));   // eslint-disable-line no-new
    return host;
}

class Page extends HtmlBuilder {
    main(root) {
        root.div({
            id: 'a', class_: 'card',
            width: '320px', display: 'grid', grid_template_columns: '1fr 1fr',
            padding_top: '4px', style_aspect_ratio: '16/9',
            style: 'color:red', title: 't',
        });
        root.input({ html_type: 'range', placeholder: 'p' });
    }
}

test('CSS roots, root_* and style_ escapes fold into one style; explicit style merges', () => {
    const host = render(Page);
    const style = host.querySelector('#a').getAttribute('style');
    for (const decl of [
        'width: 320px', 'display: grid', 'grid-template-columns: 1fr 1fr',
        'padding-top: 4px', 'aspect-ratio: 16/9', 'color: red',
    ]) {
        assert.ok(style.includes(decl), `style should contain "${decl}" — got ${style}`);
    }
});

test('a CSS-root kwarg does NOT leak as an HTML attribute', () => {
    const host = render(Page);
    const div = host.querySelector('#a');
    assert.equal(div.hasAttribute('width'), false);
    assert.equal(div.hasAttribute('display'), false);
});

test('plain HTML attributes pass through untouched', () => {
    const host = render(Page);
    const div = host.querySelector('#a');
    assert.equal(div.getAttribute('title'), 't');
    assert.equal(div.getAttribute('class'), 'card');
});

test('the html_<x> dialect escape emits the literal HTML attribute', () => {
    const host = render(Page);
    const input = host.querySelector('input');
    assert.equal(input.getAttribute('type'), 'range');   // html_type → type
    assert.equal(input.hasAttribute('html_type'), false);
    assert.equal(input.getAttribute('placeholder'), 'p');   // plain attr kept
});
