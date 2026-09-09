// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: editor decoration preserves content, bindings and fallback lifecycle.
import assert from 'node:assert/strict';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
setupDom();
const {Application} = await import('gramlot-dom');
const {PlaygroundBuilder} = await import('../js/pages/src/playground-page.js');
class Page extends PlaygroundBuilder {
    setup() { this.setData('label', 'Recipe'); this.setData('code', 'const value = 1;'); }
    main(root) { root.codeMirror({value:'^code', lbl:'^label', lbl_position:'TL',
        lbl_color:'blue', box_padding:'8px', 'aria-label':'Recipe code'}); }
}
const host = document.createElement('div');
document.body.append(host);
const app = new Application(host, new Page('main'));
const editor = host.querySelector('gnr-codemirror');
const textarea = editor.shadowRoot.querySelector('textarea');
const label = editor.shadowRoot.querySelector('.labledBox_label');
assert.equal(label.textContent, 'Recipe');
assert.equal(label.style.color, 'blue');
assert.equal(editor.shadowRoot.querySelector('[role=group]').getAttribute('aria-labelledby'), label.id);
assert.equal(textarea.getAttribute('aria-label'), 'Recipe code');
textarea.focus();
textarea.setSelectionRange(3, 5);
app.live(() => app.builder.data.setItem('label', 'Updated recipe'));
assert.equal(host.querySelector('gnr-codemirror'), editor);
assert.equal(editor.shadowRoot.querySelector('textarea'), textarea);
assert.equal(editor.shadowRoot.activeElement, textarea);
assert.equal(textarea.selectionStart, 3);
assert.equal(label.textContent, 'Updated recipe');
textarea.value = 'const changed = true;';
textarea.dispatchEvent(new window.Event('input', {bubbles:true}));
assert.equal(app.builder.data.getItem('code'), 'const changed = true;');
app.live(() => app.builder.data.setItem('label', ''));
assert.equal(host.querySelector('gnr-codemirror'), editor, 'label change after writeback preserves editor');
assert.equal(label.hidden, true);
assert.equal(editor.shadowRoot.querySelector('[role=group]').hasAttribute('aria-labelledby'), false);
editor.remove();
assert.equal(editor._widgetLabel.observer, null);
host.append(editor);
assert.equal(editor.value, 'const changed = true;');
assert.equal(editor.shadowRoot.querySelectorAll('.labledBox').length, 1);
assert.equal(editor.shadowRoot.querySelectorAll('textarea').length, 1);
app.dispose();
assert.equal(editor._widgetLabel.observer, null);
console.log('CodeMirror labels: grouped caption, fallback, binding, focus and reconnect passed.');
