// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {registerCollection, webcomponent} from 'gramlot-dom';
import {WidgetLabel} from '/_assets/dom/widget-label.js';

registerCollection('labEditors', {
    grammar: {elements: {codeMirror: webcomponent('codeMirror')}},
    defineComponents() {
        if (customElements.get('gnr-codemirror')) { return; }
        class CodeMirrorElement extends HTMLElement {
            static get observedAttributes() { return ['value']; }
            constructor() {
                super();
                this.attachShadow({mode: 'open'});
                this._value = '';
                this._content = document.createElement('div');
                const style = document.createElement('style');
                style.textContent = ':host{display:block;border:1px solid var(--gray-300,#d8d8dc);border-radius:3px;background:white}.cm-editor{height:280px;font-size:12px}.cm-scroller{overflow:auto}textarea{box-sizing:border-box;width:100%;height:280px;font:13px monospace}';
                this.shadowRoot.append(style, this._content);
                this._widgetLabel = new WidgetLabel(this, null, this._content);
            }
            get value() { return this.editor ? this.editor.state.doc.toString() : this._value; }
            set value(value) {
                this._value = value == null ? '' : String(value);
                if (this.fallback) { this.fallback.value = this._value; }
                if (this.editor && this.editor.state.doc.toString() !== this._value) {
                    this.editor.dispatch({changes: {from: 0, to: this.editor.state.doc.length, insert: this._value}});
                }
            }
            attributeChangedCallback(_name, _old, value) { this.value = value; }
            async connectedCallback() {
                const generation = this.generation = (this.generation || 0) + 1;
                this.fallback = document.createElement('textarea');
                this.fallback.value = this._value;
                this.fallback.readOnly = this.hasAttribute('readonly');
                this.fallback.setAttribute('aria-label', this.getAttribute('aria-label') || 'Code');
                this.fallback.addEventListener('input', () => {
                    this._value = this.fallback.value;
                    this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
                });
                this._content.replaceChildren(this.fallback);
                this._widgetLabel.connect();
                try {
                    const deps = '?deps=@codemirror/state@6.7.4,@codemirror/view@6.43.11';
                    const [{EditorView, basicSetup}, {EditorState}, language] = await Promise.all([
                        import('https://esm.sh/codemirror@6.0.2' + deps),
                        import('https://esm.sh/@codemirror/state@6.7.4'),
                        this.getAttribute('language') === 'xml'
                            ? import('https://esm.sh/@codemirror/lang-xml@6.1.0' + deps)
                            : import('https://esm.sh/@codemirror/lang-javascript@6.2.3' + deps)
                    ]);
                    if (!this.isConnected || this.generation !== generation) { return; }
                    const readonly = this.hasAttribute('readonly');
                    this.fallback.remove();
                    this.editor = new EditorView({parent: this._content, doc: this._value,
                        extensions: [basicSetup, (language.xml || language.javascript)(),
                            EditorState.readOnly.of(readonly), EditorView.editable.of(!readonly),
                            EditorView.lineWrapping,
                            EditorView.contentAttributes.of({tabindex: '0', 'aria-label': this.getAttribute('aria-label') || 'Code'}),
                            EditorView.updateListener.of(update => {
                                if (update.docChanged && !readonly) {
                                    this._value = update.state.doc.toString();
                                    this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
                                }
                            })]});
                } catch (error) {
                    console.warn('CodeMirror CDN unavailable; textarea retained', error);
                }
            }
            disconnectedCallback() {
                this._value = this.value;
                this.generation++;
                this._widgetLabel.disconnect();
                this.editor?.destroy();
                this.editor = null;
            }
        }
        customElements.define('gnr-codemirror', CodeMirrorElement);
    }
});
