// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * @container — a body-carrying method that GENERATES source at call time
 * (JS port of the Python @container, legacy gnrwebstruct parity). The page
 * declares `static containers = [...]`; calling one on a node runs the body
 * (which writes real, addressable source) and returns a fillable handle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { Application } from '../src/application.js';
import '../src/collections/layout.js';   // registers 'layout' (panel, box)

class Page extends HtmlBuilder {
    static containers = ['card'];

    // self is the builder; pane is the (wrapped) target the container runs on.
    card(pane, title) {
        const c = pane.div({ class_: 'card' });
        c.h3(title);
        return c;   // fillable handle
    }

    main(root) {
        const c = root.card('Anagrafica');
        c.p('contenuto');           // fill the returned handle
        root.card('Secondo');       // reusable
    }
}

test('@container builds real source at call time and returns a fillable handle', () => {
    setupDom();
    const root = document.createElement('div');
    new Application(root, new Page('main'));   // eslint-disable-line no-new

    const cards = root.querySelectorAll('.card');
    assert.equal(cards.length, 2, 'container is reusable');
    assert.equal(cards[0].querySelector('h3').textContent, 'Anagrafica');
    assert.equal(cards[0].querySelector('p').textContent, 'contenuto');   // filled
    assert.equal(cards[1].querySelector('h3').textContent, 'Secondo');
});

test('@container nodes are real (addressable) source, patchable like any node', () => {
    setupDom();
    const root = document.createElement('div');
    new Application(root, new Page('main'));   // eslint-disable-line no-new
    // the h3/p live in the source tree as ordinary nodes
    const card = root.querySelector('.card');
    assert.equal(card.tagName.toLowerCase(), 'div');
    assert.ok(card.querySelector('h3') && card.querySelector('p'));
});

test('container web component projects its children through a shadow slot', () => {
    setupDom();
    class LayoutPage extends HtmlBuilder {
        static wc_requires = ['layout'];

        main(root) {
            const p = root.panel({ caption: 'Dati' });
            p.div('figlio 1');
            p.div('figlio 2');
        }
    }
    const root = document.createElement('div');
    document.body.appendChild(root);
    new Application(root, new LayoutPage('main'));   // eslint-disable-line no-new

    const panel = root.querySelector('gnr-panel');
    assert.ok(panel, 'projected as <gnr-panel>');
    assert.equal(panel.getAttribute('caption'), 'Dati');
    // children live in the panel's LIGHT DOM (the renderer appended them)
    assert.equal(panel.querySelectorAll('div').length, 2);
    // the shadow carries the slot + the caption header
    assert.ok(panel.shadowRoot.querySelector('slot'), 'shadow has a slot');
    assert.equal(panel.shadowRoot.querySelector('.hdr').textContent, 'Dati');
});
