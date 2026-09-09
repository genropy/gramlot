// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {HtmlBuilder, Application} from 'gramlot-dom';
import {fromTytx} from 'genro-tytx';
setupDom();
const builder = new HtmlBuilder('main');
builder.loadSource(fromTytx(readFileSync(0, 'utf8'), 'json'));
const host = document.createElement('div');
document.body.append(host);
const app = new Application(host, builder);
assert.equal(host.textContent, '14px');
app.live(() => app.data.setItem('main.size', 28));
assert.equal(host.textContent, '28px');
app.dispose();
