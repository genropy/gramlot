// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPointer, parsePointer, scanForPointers } from '../src/pointer.js';

describe('isPointer', () => {
    it('returns true for ^pointer strings', () => {
        assert.equal(isPointer('^alfa.beta'), true);
        assert.equal(isPointer('^.name'), true);
        assert.equal(isPointer('^x'), true);
    });

    it('returns false for non-pointer values', () => {
        assert.equal(isPointer('alfa.beta'), false);
        assert.equal(isPointer(''), false);
        assert.equal(isPointer(null), false);
        assert.equal(isPointer(undefined), false);
        assert.equal(isPointer(42), false);
        assert.equal(isPointer({}), false);
    });
});

describe('parsePointer', () => {
    it('parses absolute path', () => {
        const info = parsePointer('^alfa.beta');
        assert.deepEqual(info, {
            raw: '^alfa.beta',
            path: 'alfa.beta',
            attr: null,
            isRelative: false,
        });
    });

    it('parses relative path', () => {
        const info = parsePointer('^.name');
        assert.deepEqual(info, {
            raw: '^.name',
            path: '.name',
            attr: null,
            isRelative: true,
        });
    });

    it('parses path with attribute', () => {
        const info = parsePointer('^alfa.beta?color');
        assert.deepEqual(info, {
            raw: '^alfa.beta?color',
            path: 'alfa.beta',
            attr: 'color',
            isRelative: false,
        });
    });

    it('parses relative path with attribute', () => {
        const info = parsePointer('^.field?size');
        assert.deepEqual(info, {
            raw: '^.field?size',
            path: '.field',
            attr: 'size',
            isRelative: true,
        });
    });

    it('parses single segment path', () => {
        const info = parsePointer('^name');
        assert.deepEqual(info, {
            raw: '^name',
            path: 'name',
            attr: null,
            isRelative: false,
        });
    });
});

describe('scanForPointers', () => {
    it('finds pointer in node value', () => {
        const node = { staticValue: '^user.name', attr: {} };
        const results = scanForPointers(node);
        assert.equal(results.length, 1);
        assert.equal(results[0].location, 'value');
        assert.equal(results[0].pointerInfo.path, 'user.name');
    });

    it('finds pointers in node attributes', () => {
        const node = { staticValue: 'hello', attr: { color: '^theme.color', size: '^layout.size' } };
        const results = scanForPointers(node);
        assert.equal(results.length, 2);
        assert.equal(results[0].location, 'attr:color');
        assert.equal(results[1].location, 'attr:size');
    });

    it('skips underscore-prefixed attributes', () => {
        const node = { staticValue: 'hello', attr: { _internal: '^secret', visible: '^show' } };
        const results = scanForPointers(node);
        assert.equal(results.length, 1);
        assert.equal(results[0].location, 'attr:visible');
    });

    it('finds pointers in both value and attributes', () => {
        const node = { staticValue: '^data.value', attr: { label: '^data.label' } };
        const results = scanForPointers(node);
        assert.equal(results.length, 2);
        assert.equal(results[0].location, 'value');
        assert.equal(results[1].location, 'attr:label');
    });

    it('returns empty array when no pointers', () => {
        const node = { staticValue: 'plain text', attr: { id: 'main', class: 'box' } };
        const results = scanForPointers(node);
        assert.equal(results.length, 0);
    });

    it('handles node with null value', () => {
        const node = { staticValue: null, attr: {} };
        const results = scanForPointers(node);
        assert.equal(results.length, 0);
    });

    it('handles node with empty attr', () => {
        const node = { staticValue: '^x', attr: {} };
        const results = scanForPointers(node);
        assert.equal(results.length, 1);
    });
});
