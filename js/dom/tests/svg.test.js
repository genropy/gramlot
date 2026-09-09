// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * SVG dialect + grammar-from-object. The SvgBuilder mirrors HtmlBuilder
 * (grammar object + defineGrammar static block), the only DIFF being the
 * namespaced DOM output (createElementNS). Also checks the HTML grammar
 * is now the full set loaded from the generated grammar object.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { SvgBuilder } from '../src/contrib/svg/svg-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';
import { DomTarget } from '../src/target-wrapper.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

class Chart extends SvgBuilder {
    main(root) {
        const s = root.svg({ width: 120, height: 120, viewBox: '0 0 120 120' });
        s.circle({ cx: 60, cy: 60, r: 40, fill: 'red' });
        s.rect({ x: 10, y: 10, width: 30, height: 30 });
    }
}

test('SvgBuilder renders namespaced SVG DOM', () => {
    setupDom();
    const root = document.createElement('div');
    const page = new Chart('main');
    page.setRenderTarget(new DomTarget(root));

    const handler = new BuilderHandler();
    handler.addBuilder(page);
    handler.activate();

    const svg = root.querySelector('svg');
    assert.ok(svg, 'svg element rendered');
    assert.equal(svg.namespaceURI, SVG_NS);
    assert.equal(svg.getAttribute('viewBox'), '0 0 120 120');

    const circle = root.querySelector('circle');
    assert.equal(circle.namespaceURI, SVG_NS);   // namespaced, not HTML
    assert.equal(circle.getAttribute('r'), '40');
    assert.equal(circle.getAttribute('fill'), 'red');

    assert.equal(svg.childNodes.length, 2);        // circle + rect
});

test('grammar loaded from the object: HTML has the full element set', () => {
    const html = new HtmlBuilder('main');
    // tags that were NOT in the old 17-tag hard-coded SCHEMA
    for (const tag of ['article', 'section', 'table', 'form', 'label', 'canvas', 'video']) {
        assert.equal(html.schemaTag(tag), tag, `HTML grammar knows <${tag}>`);
    }
    assert.ok(Object.keys(html.schema).length > 100, 'full HTML grammar');

    const svg = new SvgBuilder('main');
    for (const tag of ['circle', 'rect', 'path', 'g', 'defs']) {
        assert.equal(svg.schemaTag(tag), tag, `SVG grammar knows <${tag}>`);
    }
});
