// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Non-modal floating container. Closing hides slotted content without destroying it. */
import {registerCollection, webcomponent} from '../collections.js';
import {WidgetLabel} from '../widget-label.js';

function defineComponents() {
    if (customElements.get('gnr-palette')) { return; }
    class Palette extends HTMLElement {
        static level = 1000;
        static get observedAttributes() { return ['value', 'title', 'keyboard']; }
        constructor() {
            super();
            const shadow = this.attachShadow({mode: 'open'});
            shadow.innerHTML = `<style>
:host{position:fixed;left:80px;top:90px;width:480px;height:320px;min-width:260px;min-height:160px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);display:block;font:var(--font-size,13px)/1.45 var(--font-family,Arial,sans-serif);background:var(--palette-background,white);color:var(--palette-color,#3a3a3c);border:1px solid var(--palette-border,#b9bec5);border-radius:5px;box-shadow:var(--palette-shadow,0 6px 22px #20283026);overflow:hidden}
:host([hidden]){display:none!important}*{box-sizing:border-box}.frame{height:100%;display:flex;flex-direction:column}.bar{display:flex;align-items:center;gap:6px;height:var(--palette-header-height,24px);min-height:var(--palette-header-height,24px);padding:0 4px 0 9px;border-bottom:1px solid var(--gray-300,#d8d8dc);background:var(--palette-header-background,#eceef1);cursor:move;touch-action:none;user-select:none}.title{flex:1;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.body{flex:1;min-height:0;overflow:auto;padding:12px 12px 18px}.resize{position:absolute;right:2px;bottom:2px;width:18px;height:18px;padding:0;cursor:nwse-resize;touch-action:none;background:repeating-linear-gradient(135deg,transparent 0 3px,#aab0b8 3px 4px,transparent 4px 6px);clip-path:polygon(100% 0,100% 100%,0 100%)}button{font:inherit;color:#69727c;background:transparent;border:0;cursor:pointer}.close{width:22px;height:22px;position:relative;border-radius:3px;font-size:0}.close:before,.close:after{content:"";position:absolute;left:6px;top:10px;width:10px;height:1px;background:currentColor;transform:rotate(45deg)}.close:after{transform:rotate(-45deg)}.close:hover{background:#dce1e7;color:#243c53}.bar:focus{outline:none}.bar:focus-visible{background:var(--palette-header-focus-background,#e1e5eb)}button:focus-visible{outline:2px solid var(--accent-color,#356f9f);outline-offset:-2px}.resize:focus-visible{clip-path:none}::slotted(p){font-size:12px;line-height:1.45;margin:0 0 12px;color:#636366}
</style>
<div class="frame" role="dialog" aria-modal="false" aria-labelledby="title">
<div class="bar" tabindex="0" aria-label="Move palette with arrow keys"><span id="title" class="title"></span><button class="close" aria-label="Close palette">×</button></div>
<div class="body"><slot></slot></div><button class="resize" aria-label="Resize palette with arrow keys"></button></div>`;
            this.bar = shadow.querySelector('.bar');
            this.grip = shadow.querySelector('.resize');
            this._widgetLabel = new WidgetLabel(this, null, shadow.querySelector('.frame'), null, {fill: true});
            shadow.querySelector('.close').onclick = () => this.close();
            this.addEventListener('pointerdown', () => this.bringToFront());
            this.addEventListener('focusin', () => this.bringToFront());
            this.bar.addEventListener('pointerdown', event => {
                if (event.target.closest('button')) { return; }
                this.startGesture(event, false);
            });
            this.grip.addEventListener('pointerdown', event => this.startGesture(event, true));
            for (const handle of [this.bar, this.grip]) {
                handle.addEventListener('pointermove', event => this.moveGesture(event));
                handle.addEventListener('pointerup', () => { this.gesture = null; });
                handle.addEventListener('pointercancel', () => { this.gesture = null; });
                handle.addEventListener('keydown', event => {
                    if (!this.keyboardEnabled || event.target !== handle) { return; }
                    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { return; }
                    event.preventDefault();
                    const step = event.shiftKey ? 1 : 10;
                    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
                    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
                    this.adjust(this.getBoundingClientRect(), dx, dy, handle === this.grip);
                });
            }
            this.addEventListener('keydown', event => {
                if (this.keyboardEnabled && event.key === 'Escape') { event.stopPropagation(); this.close(); }
            });
        }
        connectedCallback() {
            this._widgetLabel.connect();
            this.sync();
            if (this.value) { this.bringToFront(); }
        }
        disconnectedCallback() { this._widgetLabel.disconnect(); this.gesture = null; }
        get value() { return this.getAttribute('value') !== null && !['false', 'False', '0'].includes(this.getAttribute('value')); }
        set value(value) { this.setAttribute('value', value === true || value === 'true' ? 'true' : 'false'); }
        attributeChangedCallback() { if (this.bar) { this.sync(); } }
        get keyboardEnabled() {
            return this.hasAttribute('keyboard') && !['false', 'False', '0'].includes(this.getAttribute('keyboard'));
        }
        sync() {
            this.bar.tabIndex = this.keyboardEnabled ? 0 : -1;
            this.grip.tabIndex = this.keyboardEnabled ? 0 : -1;
            this.shadowRoot.querySelector('.title').textContent = this.getAttribute('title') || 'Palette';
            const wasHidden = this.hidden;
            this.hidden = !this.value;
            if (this.isConnected && wasHidden && this.value) {
                this.previousFocus = this.ownerDocument.activeElement;
                this.bringToFront();
                if (this.keyboardEnabled) { this.bar.focus(); }
            }
        }
        bringToFront() { this.style.zIndex = String(++Palette.level); }
        close() {
            this.value = false;
            this.dispatchEvent(new Event('change', {bubbles: true, composed: true}));
            if (this.previousFocus?.isConnected) { this.previousFocus.focus(); }
        }
        startGesture(event, resize) {
            if (event.button !== 0) { return; }
            event.preventDefault();
            event.currentTarget.focus();
            this.gesture = {rect: this.getBoundingClientRect(), x: event.clientX, y: event.clientY, resize};
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        moveGesture(event) {
            if (!this.gesture) { return; }
            const {rect, x, y, resize} = this.gesture;
            this.adjust(rect, event.clientX - x, event.clientY - y, resize);
        }
        adjust(rect, dx, dy, resize) {
            const win = this.ownerDocument.defaultView;
            if (resize) {
                this.style.width = Math.max(260, Math.min(win.innerWidth - rect.left - 8, rect.width + dx)) + 'px';
                this.style.height = Math.max(160, Math.min(win.innerHeight - rect.top - 8, rect.height + dy)) + 'px';
            } else {
                this.style.left = Math.max(8, Math.min(win.innerWidth - Math.min(rect.width, win.innerWidth - 16) - 8, rect.left + dx)) + 'px';
                this.style.top = Math.max(8, Math.min(win.innerHeight - 40, rect.top + dy)) + 'px';
            }
        }
    }
    customElements.define('gnr-palette', Palette);
}
registerCollection('palette', {grammar: {elements: {palette: webcomponent('palette', {subTags: '*'})}}, defineComponents});
