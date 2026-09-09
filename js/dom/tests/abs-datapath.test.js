// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * SourceBagNode.absDatapath — JS port of tests/test_abs_datapath.py.
 *
 * Composes the absolute datastore path for a node's pointer/path. The
 * builder is mounted under a data segment (`main`), so every resolved
 * path is prefixed with it. Covers every supported form: absolute,
 * `^`/`=` marks, `volume:`, `?attr` tail, relative `.x` (ancestor walk),
 * `#parent`, and the symbolic scopes `#FORM` / `#ANCHOR` / `#<id>`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { BuilderHandler } from '../src/builder-handler.js';

function leaf(mainFn, nodeId = 'leaf') {
    class Page extends HtmlBuilder {
        main(root) { mainFn(root); }
    }
    const page = new Page('main');
    const handler = new BuilderHandler();   // no application: not reactive
    handler.addBuilder(page);
    return [page, page.nodeById(nodeId)];
}

function simple() {
    return leaf((root) => root.body({ node_id: 'leaf' }));
}

// --- absolute + marks ------------------------------------------------

test('absolute field gets segment prefix', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('field'), 'main.field');
});

test('absolute dotted path gets segment prefix', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('user.name'), 'main.user.name');
});

test('^ pointer mark is stripped', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('^field'), 'main.field');
    assert.equal(lf.absDatapath('^user.name'), 'main.user.name');
});

test('= eager mark is stripped (symmetric to ^)', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('=field'), 'main.field');
    assert.equal(lf.absDatapath('=vol:field'), 'vol.field');
    assert.equal(lf.absDatapath('=field?color'), 'main.field?color');
});

// --- volume + attr tail ----------------------------------------------

test('volume is the leading segment', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('vol:field'), 'vol.field');
    assert.equal(lf.absDatapath('^vol:field'), 'vol.field');
    assert.equal(lf.absDatapath('vol:user.name'), 'vol.user.name');
});

test('?attr tail preserved (with mark/volume combos)', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('field?color'), 'main.field?color');
    assert.equal(lf.absDatapath('^field?color'), 'main.field?color');
    assert.equal(lf.absDatapath('vol:field?color'), 'vol.field?color');
    assert.equal(lf.absDatapath('^vol:user.name?size'), 'vol.user.name?size');
});

// --- relative (ancestor walk) ----------------------------------------

function withDatapath() {
    return leaf((root) => root.body({ datapath: 'myform' }).div({ node_id: 'leaf' }));
}

test('relative resolves via ancestor datapath', () => {
    const [, lf] = withDatapath();
    assert.equal(lf.absDatapath('.name'), 'main.myform.name');
    assert.equal(lf.absDatapath('.name?color'), 'main.myform.name?color');
    assert.equal(lf.absDatapath('^.name'), 'main.myform.name');
    assert.equal(lf.absDatapath('=.name'), 'main.myform.name');
});

test('relative chains through a relative ancestor datapath', () => {
    const [, lf] = leaf((root) => {
        const outer = root.body({ datapath: 'form' });
        const inner = outer.div({ datapath: '.row' });
        inner.span({ node_id: 'leaf' });
    });
    assert.equal(lf.absDatapath('.name'), 'main.form.row.name');
});

test('relative without anchor raises', () => {
    const [, lf] = leaf((root) => root.body().div({ node_id: 'leaf' }));
    assert.throws(() => lf.absDatapath('.name'));
});

test('relative walk uses the leaf datapath too', () => {
    const [, lf] = leaf((root) => root.body().div({ node_id: 'leaf', datapath: 'own' }));
    assert.equal(lf.absDatapath('.name'), 'main.own.name');
});

// --- #parent ---------------------------------------------------------

test('#parent collapses preceding segment(s)', () => {
    const [, lf] = simple();
    assert.equal(lf.absDatapath('a.b.#parent.c'), 'main.a.c');
    assert.equal(lf.absDatapath('a.b.c.#parent.#parent.d'), 'main.a.d');
    assert.equal(lf.absDatapath('vol:a.b.#parent.c?color'), 'vol.a.c?color');
});

test('#parent after relative resolution', () => {
    const [, lf] = withDatapath();
    assert.equal(lf.absDatapath('.row.#parent.name'), 'main.myform.name');
});

test('#parent with nothing to cancel raises', () => {
    const [, lf] = simple();
    assert.throws(() => lf.absDatapath('a.#parent.#parent.b'));
});

// --- symbolic scopes: #FORM / #ANCHOR / #<id> ------------------------

test('#FORM resolves to nearest ancestor with formId', () => {
    const [, lf] = leaf((root) => root.body({ formId: 'inv', datapath: 'f' }).div({ node_id: 'leaf' }));
    assert.equal(lf.absDatapath('#FORM.x'), 'main.f.x');
});

test('#FORM also matches form=true', () => {
    const [, lf] = leaf((root) => root.body({ form: true, datapath: 'f' }).div({ node_id: 'leaf' }));
    assert.equal(lf.absDatapath('#FORM.x'), 'main.f.x');
});

test('#FORM walks past an unmarked intermediate', () => {
    const [, lf] = leaf((root) => {
        const outer = root.body({ formId: 'inv', datapath: 'f' });
        outer.div().span({ node_id: 'leaf' });
    });
    assert.equal(lf.absDatapath('#FORM.x'), 'main.f.x');
});

test('#FORM without a marked ancestor raises', () => {
    const [, lf] = leaf((root) => root.body().div({ node_id: 'leaf' }));
    assert.throws(() => lf.absDatapath('#FORM.x'));
});

test('#ANCHOR matches nearest ancestor with _anchor present (any value)', () => {
    const [, a] = leaf((root) => root.body({ _anchor: 'whatever', datapath: 'a' }).div({ node_id: 'leaf' }));
    assert.equal(a.absDatapath('#ANCHOR.x'), 'main.a.x');
    const [, b] = leaf((root) => root.body({ _anchor: true, datapath: 'a' }).div({ node_id: 'leaf' }));
    assert.equal(b.absDatapath('#ANCHOR.x'), 'main.a.x');
});

test('#ANCHOR without marker raises', () => {
    const [, lf] = leaf((root) => root.body().div({ node_id: 'leaf' }));
    assert.throws(() => lf.absDatapath('#ANCHOR.x'));
});

test('#<id> resolves via node_by_id and composes with its datapath', () => {
    const [, lf] = leaf((root) => root.body({ node_id: 'hub', datapath: 'rec' }).div({ node_id: 'leaf' }));
    assert.equal(lf.absDatapath('#hub.x'), 'main.rec.x');
});

test('#<unknown-id> raises', () => {
    const [, lf] = simple();
    assert.throws(() => lf.absDatapath('#totally-unknown.x'));
});

test('^#FORM.x: mark stripped, then symbolic dispatch', () => {
    const [, lf] = leaf((root) => root.body({ formId: 'inv', datapath: 'f' }).div({ node_id: 'leaf' }));
    assert.equal(lf.absDatapath('^#FORM.x'), 'main.f.x');
});
