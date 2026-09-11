// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Decorated, getComponentBases} from '../../components/bases.js';
import {WIDGET_LABEL_CSS} from '../decoration/widget-label.js';
import {COPY_ICON, COPIED_ICON, writeClipboardText} from '../../components/clipboard.js';
import {dataScopeJson} from '../../components/data-scope.js';

const enabled = (host, name) => host.hasAttribute(name) && !['false','False','0'].includes(host.getAttribute(name));

/** A decorated group; drag offers data and never moves Source or Data itself. */
export function defineGroupBoxComponent() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-groupbox')) return;
    const {GramlotElement} = getComponentBases();
    class GroupBox extends Decorated(GramlotElement) {
        static observedAttributes = ['copy', 'draggable', 'disabled', 'lbl_variant'];
        constructor() {
            super();
            const root = this.attachShadow({mode:'open'}), doc = this.ownerDocument;
            const style = doc.createElement('style');
            style.textContent = WIDGET_LABEL_CSS + `
:host{display:block;min-width:0;font:inherit}:host([hidden]){display:none}
.labledBox{border:1px solid var(--group-border,#c8cfd8);border-radius:var(--group-radius,4px);gap:0}
.labledBox_labelRegion{position:relative;display:grid;grid-template-columns:28px 1fr 28px;gap:6px;padding:5px 8px;background:var(--group-label-bg,#34465b);color:var(--group-label-color,#fff);border-radius:var(--group-radius,4px) var(--group-radius,4px) 0 0}
.labledBox_labelRegion[hidden]{display:none}
.labledBox_label{grid-column:2;color:inherit;font-size:inherit;white-space:normal;overflow-wrap:anywhere}
.labledBox_content{padding:var(--group-padding,12px)}
:host([lbl_variant=underline]) .labledBox{border:0}
:host([lbl_variant=underline]) .labledBox_labelRegion{background:transparent;color:inherit;border-radius:0;border-bottom:1px solid var(--group-border,#c8cfd8)}
.labledBox_labelRegion[draggable=true]{cursor:grab}
button{grid-column:3;width:26px;height:26px;display:grid;place-items:center;padding:4px;border:0;border-radius:3px;background:transparent;color:inherit;cursor:pointer}
button:hover{background:#ffffff20}button:disabled{opacity:.5;cursor:default}button[hidden]{display:none}
button:focus-visible{outline:2px solid currentColor;outline-offset:2px}
svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7}
[role=status]{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
`;
            const box = doc.createElement('div'), label = doc.createElement('div');
            this._header = doc.createElement('div');
            this._copy = doc.createElement('button'); this._copy.type = 'button';
            this._copy.innerHTML = COPY_ICON;
            this._copy.title = 'Copy group data as JSON'; this._copy.setAttribute('aria-label', this._copy.title);
            this._status = doc.createElement('span'); this._status.setAttribute('role','status');
            const content = doc.createElement('div'); content.append(doc.createElement('slot'));
            this._header.append(label, this._copy, this._status); box.append(this._header,content);root.append(style,box);
            this.installDecoration(null, content, {box, label, labelRegion:this._header},
                {defaultPosition:'TC', reservedLabelAttributes:['variant']});
            this._copy.addEventListener('click', () => this.copyData());
            this._header.addEventListener('pointerdown', event => { this._dragBlocked = Boolean(event.target.closest('button')); });
            this.addEventListener('dragstart', event => this._startDrag(event));
        }
        connectedCallback() { super.connectedCallback(); this._syncActions(); }
        onDisconnect() { clearTimeout(this._timer); this._generation = (this._generation || 0) + 1; this._busy = false; }
        attributeChangedCallback() { if (this._copy) this._syncActions(); }
        _validateAttributes(attrs) {
            if (attrs.lbl_variant != null && !['bar','underline'].includes(attrs.lbl_variant)) {
                throw new Error('groupBox lbl_variant must be bar or underline');
            }
        }
        _syncActions() {
            this._copy.hidden = !enabled(this,'copy');
            this._copy.disabled = enabled(this,'disabled') || Boolean(this._busy);
            this._header.draggable = enabled(this,'draggable') && !enabled(this,'disabled');
        }
        get readDataScope() { return this._readDataScope; }
        set readDataScope(reader) {
            this._readDataScope = reader;
            if (this._copy) { this._copy.innerHTML = COPY_ICON; this._status.textContent = ''; }
        }
        _snapshot() {
            if (!this.readDataScope) throw new Error('No Data scope reader is installed');
            const {datapath, sourceId, value} = this.readDataScope();
            return {datapath, sourceId, json:dataScopeJson(value)};
        }
        _error(error, eventName = 'gnr-copy-error') {
            this._status.textContent = error.message;
            this.dispatchEvent(new this.ownerDocument.defaultView.CustomEvent(eventName, {
                detail:{error}, bubbles:true, composed:true,
            }));
        }
        async copyData() {
            if (!enabled(this,'copy') || enabled(this,'disabled') || this._busy) return;
            const generation = this._generation = (this._generation || 0) + 1;
            clearTimeout(this._timer); this._copy.innerHTML = COPY_ICON;
            this._busy = true; this._syncActions(); this._status.textContent = '';
            try {
                const snapshot = this._snapshot();
                await writeClipboardText(this, snapshot.json);
                if (!this.isConnected || generation !== this._generation) return;
                this._copy.innerHTML = COPIED_ICON; this._status.textContent = 'Copied';
                this._timer = setTimeout(() => { this._copy.innerHTML = COPY_ICON; this._status.textContent = ''; },1600);
                this.dispatchEvent(new this.ownerDocument.defaultView.CustomEvent('gnr-copied', {
                    detail:{datapath:snapshot.datapath}, bubbles:true, composed:true,
                }));
            } catch (error) {
                if (this.isConnected && generation === this._generation) this._error(error);
            } finally {
                if (generation === this._generation) { this._busy = false; this._syncActions(); }
            }
        }
        _startDrag(event) {
            // Never hijack input/text/content drags or a gesture on the copy control.
            if (event.composedPath()[0] !== this._header || this._dragBlocked || !this._header.draggable || !event.dataTransfer) {
                event.preventDefault(); return;
            }
            try {
                const {datapath, sourceId, json} = this._snapshot();
                event.dataTransfer.setData('application/x-gramlot-group+json', JSON.stringify({datapath,sourceId,data:JSON.parse(json)}));
                event.dataTransfer.setData('application/json',json);
                event.dataTransfer.effectAllowed = 'copy';
                this._status.textContent = 'Group data ready to drag';
            } catch (error) { event.preventDefault(); this._error(error, 'gnr-drag-error'); }
        }
    }
    customElements.define('gnr-groupbox', GroupBox);
}
