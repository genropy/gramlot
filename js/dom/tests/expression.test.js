// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveInlineExpressions} from '../src/logic/expression.js';

const resolve = entries => resolveInlineExpressions({}, new Map(Object.entries(entries)));

test('template interpolation resolves another inline peer', () => {
    const result = resolve({label: '==`Total: ${total}`', total: '==qty * 2', qty: 3});
    assert.equal(result.get('total'), 6);
    assert.equal(result.get('label'), 'Total: 6');
});

test('object keys are not dependencies while shorthand properties are', () => {
    assert.equal(resolve({value: '==({value: 1}).value'}).get('value'), 1);
    const result = resolve({record: '==({total})', total: '==qty * 2', qty: 4});
    assert.deepEqual(result.get('record'), {total: 8});
});

test('regex literals and arrow-local identifiers use native JavaScript scope', () => {
    const result = resolve({
        matched: '==/^ab+$/.test(text)',
        mapped: '==[1, 2].map(value => value * factor).join(",")',
        text: 'abbb', factor: 3,
    });
    assert.equal(result.get('matched'), true);
    assert.equal(result.get('mapped'), '3,6');
});

test('true direct and indirect peer cycles fail explicitly', () => {
    assert.throws(() => resolve({value: '==value'}), /inline expression cycle/);
    assert.throws(() => resolve({a: '==b + 1', b: '==c + 1', c: '==a + 1'}),
        /inline expression cycle/);
});

test('lazy peers work through typeof and shadow same-named globals', () => {
    assert.equal(resolve({kind: '==typeof total', total: '==3'}).get('kind'), 'number');
    assert.equal(resolve({answer: '==JSON + 1', JSON: '==2'}).get('answer'), 3);
});

test('an expression executes once while lazily resolving a later peer', () => {
    let calls = 0;
    const result = resolve({answer: '==counter() + total', total: '==3', counter: () => {
        calls += 1;
        return 4;
    }});
    assert.equal(result.get('answer'), 7);
    assert.equal(calls, 1);
});
