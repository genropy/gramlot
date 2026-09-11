// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * layout — container web components. Unlike the input widgets (leaf, value),
 * these ACCEPT CHILDREN: the grammar opens sub_tags to `*`, and the custom
 * element projects the light-DOM children through a shadow `<slot>`.
 *
 * The renderer already appends the rendered children to the host (light
 * DOM); the slot shows them. Events from children bubble normally (they
 * live in the light DOM), so the write-back reaches them as usual.
 *
 *   panel  — a framed box with an optional `caption` header.
 *   box    — a plain framed box.
 *   borderContainer — CSS-grid layout, children go to named regions via
 *                     `slot` (top/left/right/bottom; unslotted → center);
 *                     a region child with `splitter` gets a drag-resize bar.
 *   tabContainer / tab — a tab shell whose selection lives IN THE DATA:
 *                     `value="^ui.tab"` (a pointer). A click sets the value
 *                     and re-emits `change` composed → the SAME write-back as
 *                     the input widgets (no data-set-pointer needed). The
 *                     shadow only draws the strip + shows the active pane;
 *                     the panes are slotted light-DOM (real, reactive) nodes.
 *
 * Ported from ws-web `widgets/containers.py` + `resources/lib/container.js`.
 * DIFF-WS-WEB: ws-web made these @container (real nodes, no shadow — an
 * iframe inside survives a morph); here they are web components (more
 * reusable/self-contained) with the invariant that CONTENT stays in the
 * light-DOM slot (still real, still patched by the reactive engine) and only
 * the chrome lives in the shadow.
 */
import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';
import {defineLabledBoxComponent} from './decoration/labled-box.js';
import {WidgetLabel} from './decoration/widget-label.js';
import {defineGroupBoxComponent} from './layout/group-box.js';
import {defineFormletComponent} from './layout/formlet.js';



const PANEL_CSS =
    ':host { display: block; margin: 8px 0; }'
    + '.p { border: 1px solid var(--panel-border, #ccc); border-radius: 3px; }'
    + '.hdr { background: var(--panel-hdr-bg, #f4f4f4); padding: 4px 8px;'
    + '  font-weight: 600; border-bottom: 1px solid var(--panel-border, #ccc);'
    + '  border-radius: 3px 6px 0 0; }'
    + '.hdr:empty { display: none; border-bottom: none; }'
    + '.body { padding: 8px; display: flex; flex-direction: column; gap: 8px; }';

const BOX_CSS =
    ':host { display: block; margin: 8px 0; }'
    + '.b { border: 1px solid var(--box-border, #bbb); border-radius: 3px;'
    + '  padding: 8px; display: flex; flex-direction: column; gap: 8px; }';

//: the two legacy designs (dijit BorderContainer): headline = top and bottom
//: span the full width; sidebar = left and right span the full height.
const BORDER_DESIGNS = {
    headline: '"top top top" "left center right" "bottom bottom bottom"',
    sidebar: '"left top right" "left center right" "left bottom right"',
};

const BORDER_CSS =
    ':host { display: grid; height: 100%; box-sizing: border-box;'
    + '  grid-template-rows: auto minmax(0,1fr) auto; grid-template-columns: auto minmax(0,1fr) auto; }'
    + '.region { position: relative; overflow: hidden; min-width: 0; min-height: 0; box-sizing:border-box; }'
    + '.region-content { height:100%; overflow:auto; min-width:0; min-height:0; }'
    + '.region.split-left {padding-right:6px}.region.split-right {padding-left:6px}'
    + '.region.split-top {padding-bottom:6px}.region.split-bottom {padding-top:6px}'
    + '.region.center { border: 0; }'
    + '.handle { position: absolute; z-index: 5; background:var(--splitter-bg,#e4e7eb);touch-action:none;user-select:none; }'
    + '.handle.x { top: 0; bottom: 0; width: 6px; cursor: col-resize; }'
    + '.handle.y { left: 0; right: 0; height: 6px; cursor: row-resize; }'
    + '.handle:hover { background: var(--splitter-hover, rgba(74,144,217,.4)); }'
    // drawer: a collapsible region — closed shrinks to a thin strip that
    // keeps the toggle reachable; the slot content and the splitter hide.
    + '.drawer-toggle { position: absolute; z-index: 6; cursor: pointer;'
    + '  background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 3px;'
    + '  font-size: 11px; line-height: 1; padding: 2px 5px; user-select: none; }'
    + '.drawer-toggle.left { right: 2px; top: 2px; }'
    + '.drawer-toggle.right { left: 2px; top: 2px; }'
    + '.drawer-toggle.top { left: 2px; bottom: 2px; }'
    + '.drawer-toggle.bottom { left: 2px; top: 2px; }'
    + '.region.left.drawer-closed, .region.right.drawer-closed'
    + '  { width: 24px !important; overflow: hidden; }'
    + '.region.top.drawer-closed, .region.bottom.drawer-closed'
    + '  { height: 24px !important; overflow: hidden; }'
    + '.region.drawer-closed > .region-content { display: none; }'
    + '.region.drawer-closed > .handle { display: none; }';

const TABS_CSS =
    ':host { display: flex; flex-direction: column; min-height: 0; }'
    + '.tabbar { display: flex; gap: 2px; border-bottom: 1px solid var(--tab-border,#c8c8c8); }'
    + '.tab { padding: var(--tab-padding,4px 11px); color:var(--tab-color,inherit); border: 1px solid var(--tab-border,#c8c8c8); border-bottom: none;'
    + '  background: var(--tab-background,#f4f4f4); cursor: pointer; border-radius: 3px 3px 0 0;'
    + '  font: inherit; font-size:var(--tab-font-size,inherit);font-weight:var(--tab-font-weight,normal); }'
    + '.tab.active { color:var(--tab-active-color,inherit); background: var(--tab-active-background,#fff); font-weight: 600; margin-bottom: -1px; }'
    + '.panes { flex: 1; min-height: 0; overflow: auto; padding: var(--tab-pane-padding,8px 2px); }';

function defineComponents() {
    if (typeof customElements === 'undefined') {
        return;
    }
    defineFormletComponent();
    defineGroupBoxComponent();
    defineLabledBoxComponent();
    if (customElements.get('gnr-panel')) return;

    class GnrPanel extends HTMLElement {
        static get observedAttributes() { return ['caption']; }

        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = PANEL_CSS;
            root.appendChild(style);
            const wrap = document.createElement('div');
            wrap.className = 'p';
            this._hdr = document.createElement('div');
            this._hdr.className = 'hdr';
            const body = document.createElement('div');
            body.className = 'body';
            body.appendChild(document.createElement('slot'));   // the children
            wrap.appendChild(this._hdr);
            wrap.appendChild(body);
            root.appendChild(wrap);
            this._widgetLabel = new WidgetLabel(this, null, wrap);
        }

        connectedCallback() { this._hdr.textContent = this.getAttribute('caption') || ''; this._widgetLabel.connect(); }
        disconnectedCallback() { this._widgetLabel.disconnect(); }

        attributeChangedCallback(name, _old, fresh) {
            if (name === 'caption') { this._hdr.textContent = fresh || ''; }
        }
    }

    class GnrBox extends HTMLElement {
        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = BOX_CSS;
            root.appendChild(style);
            const wrap = document.createElement('div');
            wrap.className = 'b';
            wrap.appendChild(document.createElement('slot'));
            root.appendChild(wrap);
            this._widgetLabel = new WidgetLabel(this, null, wrap);
        }
        connectedCallback() { this._widgetLabel.connect(); }
        disconnectedCallback() { this._widgetLabel.disconnect(); }
    }

    class GnrBorderContainer extends HTMLElement {
        static get observedAttributes() { return ['design']; }

        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = BORDER_CSS;
            root.appendChild(style);
            this._cells = {};
            for (const name of ['top', 'left', 'center', 'right', 'bottom']) {
                const cell = document.createElement('div');
                cell.className = `region ${name}`;
                cell.style.gridArea = name;
                const slot = document.createElement('slot');
                if (name !== 'center') { slot.name = name; }   // center = default slot
                const content = document.createElement('div');
                content.className = 'region-content';
                content.appendChild(slot);
                cell.appendChild(content);
                this._cells[name] = cell;
                root.appendChild(cell);
            }
            this._widgetLabel = new WidgetLabel(this, null, Object.values(this._cells), null, {
                fill: true, contentStyle: {display: 'grid', gridTemplateRows: 'auto minmax(0,1fr) auto',
                    gridTemplateColumns: 'auto minmax(0,1fr) auto', gridTemplateAreas: 'inherit'},
            });
        }

        connectedCallback() {
            this._widgetLabel.connect();
            this._applyDesign();
            this._setupSplitters();
            this._setupDrawers();
        }

        attributeChangedCallback(name) {
            if (name === 'design') { this._applyDesign(); }
        }

        disconnectedCallback() {
            this._widgetLabel.disconnect();
            this._stopResize?.();
        }

        _applyDesign() {
            const d = this.getAttribute('design') || 'headline';
            this.style.gridTemplateAreas = BORDER_DESIGNS[d] || BORDER_DESIGNS.headline;
            if (this._widgetLabel?.box) this._widgetLabel.content.style.gridTemplateAreas = this.style.gridTemplateAreas;
        }

        _regionChild(name) {
            return Array.from(this.children).find(
                (c) => c.getAttribute && c.getAttribute('slot') === name,
            ) || null;
        }

        // A region child marked `splitter` (or `drawer`, which implies it —
        // legacy: `drawer && region → splitter=true`) gets a drag bar on its
        // inner edge: left/right resize width, top/bottom resize height.
        _setupSplitters() {
            const axis = { left: 'x', right: 'x', top: 'y', bottom: 'y' };
            for (const name of ['left', 'right', 'top', 'bottom']) {
                const child = this._regionChild(name);
                const cell = this._cells[name];
                const wants = child
                    && ((child.hasAttribute('splitter') && !['false', 'False', '0'].includes(child.getAttribute('splitter')))
                        || child.hasAttribute('drawer'));
                if (!wants || cell._handled) {
                    continue;
                }
                cell._handled = true;
                cell.classList.add(`split-${name}`);
                const dimension = axis[name] === 'x' ? 'width' : 'height';
                if (child.style[dimension]) cell.style[dimension] = child.style[dimension];
                // The region owns its resized dimension; the slotted content fills it.
                child.style[dimension] = '100%';
                const bar = document.createElement('div');
                bar.className = `handle ${axis[name]}`;
                if (name === 'left') { bar.style.right = '0'; }
                if (name === 'right') { bar.style.left = '0'; }
                if (name === 'top') { bar.style.bottom = '0'; }
                if (name === 'bottom') { bar.style.top = '0'; }
                cell.appendChild(bar);
                const pointerEvents = Boolean(this.ownerDocument.defaultView.PointerEvent);
                bar.addEventListener(pointerEvents ? 'pointerdown' : 'mousedown', (down) => {
                    if (down.button !== 0) return;
                    const hostWindow = this.ownerDocument.defaultView;
                    this._stopResize?.();
                    down.preventDefault();
                    const r = cell.getBoundingClientRect();
                    const center = this._cells.center.getBoundingClientRect();
                    const horizontal = axis[name] === 'x';
                    const size = horizontal ? r.width : r.height;
                    const minimum = horizontal ? 40 : 30;
                    const available = horizontal ? center.width : center.height;
                    const maximum = available > 0 ? Math.max(minimum, size + available - minimum) : Infinity;
                    const start = horizontal ? down.clientX : down.clientY;
                    const sign = ['left', 'top'].includes(name) ? 1 : -1;
                    const moveEvent = pointerEvents ? 'pointermove' : 'mousemove';
                    const upEvent = pointerEvents ? 'pointerup' : 'mouseup';
                    const move = (ev) => {
                        if (pointerEvents && ev.pointerId !== down.pointerId) return;
                        const delta = ((horizontal ? ev.clientX : ev.clientY) - start) * sign;
                        cell.style[dimension] = `${Math.min(maximum, Math.max(minimum, size + delta))}px`;
                    };
                    const up = () => {
                        hostWindow.removeEventListener(moveEvent, move);
                        hostWindow.removeEventListener(upEvent, up);
                        hostWindow.removeEventListener('pointercancel', up);
                        hostWindow.removeEventListener('blur', up);
                        if (pointerEvents && bar.hasPointerCapture?.(down.pointerId)) bar.releasePointerCapture(down.pointerId);
                        this._stopResize = null;
                    };
                    this._stopResize = up;
                    if (pointerEvents) bar.setPointerCapture?.(down.pointerId);
                    hostWindow.addEventListener(moveEvent, move);
                    hostWindow.addEventListener(upEvent, up);
                    hostWindow.addEventListener('pointercancel', up);
                    hostWindow.addEventListener('blur', up);
                });
            }
        }

        // A region child marked `drawer` becomes COLLAPSIBLE: a toggle on the
        // inner edge opens/closes it (closed → the cell shrinks to a thin
        // strip, content + splitter hidden). `drawer="close"` starts closed;
        // any other value starts open (legacy: drawer=true|'close').
        _setupDrawers() {
            const sym = {
                left: { open: '‹', closed: '›' }, right: { open: '›', closed: '‹' },
                top: { open: '⌃', closed: '⌄' }, bottom: { open: '⌄', closed: '⌃' },
            };
            for (const name of ['left', 'right', 'top', 'bottom']) {
                const child = this._regionChild(name);
                const cell = this._cells[name];
                if (!child || !child.hasAttribute('drawer') || cell._drawered) {
                    continue;
                }
                cell._drawered = true;
                const toggle = document.createElement('div');
                toggle.className = `drawer-toggle ${name}`;
                const render = () => {
                    const closed = cell.classList.contains('drawer-closed');
                    toggle.textContent = closed ? sym[name].closed : sym[name].open;
                };
                toggle.addEventListener('click', () => {
                    cell.classList.toggle('drawer-closed');
                    render();
                });
                cell.appendChild(toggle);
                if (child.getAttribute('drawer') === 'close') {
                    cell.classList.add('drawer-closed');
                }
                render();
            }
        }
    }

    class GnrTab extends HTMLElement {
        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = ':host { display: block; }';
            root.appendChild(style);
            const slot = document.createElement('slot');
            root.appendChild(slot);   // the pane content
            this._widgetLabel = new WidgetLabel(this, null, [slot]);
        }
        connectedCallback() { this._widgetLabel.connect(); }
        disconnectedCallback() { this._widgetLabel.disconnect(); }
    }

    class GnrTabContainer extends HTMLElement {
        static get observedAttributes() { return ['value', 'selected', 'selectedpage']; }

        constructor() {
            super();
            const root = this.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = TABS_CSS;
            root.appendChild(style);
            this._bar = document.createElement('div');
            this._bar.className = 'tabbar';
            const panes = document.createElement('div');
            panes.className = 'panes';
            panes.appendChild(document.createElement('slot'));
            root.appendChild(this._bar);
            root.appendChild(panes);
            this._widgetLabel = new WidgetLabel(this, null, [this._bar, panes], null,
                {fill: true, contentStyle: {display: 'flex', flexDirection: 'column'}});
            this._value = null;
        }

        connectedCallback() {
            this._widgetLabel.connect();
            this._mode = this.hasAttribute('selectedPage') ? 'selectedpage' : this.hasAttribute('selected') ? 'selected' : 'value';
            this._requested = this.getAttribute(this._mode);
            this._rebuild();
            // A tab added/removed reactively rebuilds the strip (browser only;
            // MutationObserver is absent in some headless test setups).
            if (this.ownerDocument.defaultView.MutationObserver) {
                this._obs = new this.ownerDocument.defaultView.MutationObserver(() => this._rebuild());
                this._obs.observe(this, {childList:true, subtree:true, attributes:true, attributeFilter:['pagename','key','title','label','hidden','disabled','closable']});
            }
        }

        disconnectedCallback() {
            this._widgetLabel.disconnect();
            if (this._obs) { this._obs.disconnect(); }
        }

        attributeChangedCallback(name, _old, fresh) {
            this._mode = name; this._requested = fresh; this._apply();
        }

        // The kernel's delegated listener reads `el.value` on change.
        get value() { return this._value; }

        set value(v) { this._mode = 'value'; this._requested = v; this._apply(); }

        _tabs() {
            return Array.from(this.children).filter(
                (c) => c.tagName && ['gnr-tab','gnr-contentpane'].includes(c.tagName.toLowerCase()),
            );
        }

        _pageName(tab, index) { return tab.getAttribute('pageName') ?? tab.getAttribute('key') ?? String(index); }

        _flag(tab, name) {
            return tab.hasAttribute(name) && !['false','False','0'].includes(tab.getAttribute(name));
        }
        _available(tab) { return tab && !this._flag(tab, 'hidden') && !this._flag(tab, 'disabled'); }
        _button(tab, index) {
            const shell = document.createElement('span');
            shell.style.display = this._flag(tab, 'hidden') ? 'none' : 'inline-flex';
            const button = document.createElement('button');
            button.className = 'tab'; button.type = 'button';
            button.dataset.key = this._pageName(tab, index);
            button.textContent = tab.getAttribute('title') || tab.getAttribute('label') || button.dataset.key;
            button.disabled = this._flag(tab, 'disabled');
            button.classList.toggle('active', this.value === button.dataset.key);
            button.setAttribute('aria-pressed', String(this.value === button.dataset.key));
            button.addEventListener('click', () => this.selectIndex(index));
            shell.append(button);
            if (this._flag(tab, 'closable')) {
                const close = document.createElement('button'); close.type = 'button';
                close.textContent = '×'; close.setAttribute('aria-label', `Close ${button.textContent}`);
                close.style.cssText = 'font:inherit;border:1px solid #c8c8c8;border-left:0;background:#f4f4f4;padding:2px 5px;cursor:pointer';
                close.disabled = button.disabled;
                close.addEventListener('click', () => this.closePage(index));
                shell.append(close);
            }
            return shell;
        }
        closePage(index) {
            const tab = this._tabs()[index];
            if (!this._available(tab) || !this._flag(tab, 'closable')) return;
            const detail = {id:tab.id, pageName:this._pageName(tab, index)};
            if (!this.dispatchEvent(new CustomEvent('gnr-before-close', {bubbles:true, composed:true, cancelable:true, detail}))) return;
            this.dispatchEvent(new CustomEvent('gnr-close-page', {bubbles:true, composed:true, detail}));
        }
        _rebuild() {
            this._bar.replaceChildren(...this._tabs().map((tab, index) => this._button(tab, index)));
            this._apply();
        }

        _publishTransition() {
            if (this._announced === this._value) return;
            const previous = this._announced;
            this._announced = this._value;
            const prefix = this.getAttribute('nodeId') || this.id;
            const publish = (name, payload) => this.dispatchEvent(new CustomEvent('gnr-topic', {
                bubbles:true, composed:true, detail:{topic:`${prefix}_${name}`, payload},
            }));
            if (previous != null) {
                publish('hiding', {pageName:previous});
                publish('selected', {page:previous, selected:false, change:`${previous}_hide`});
            }
            if (this._value != null) {
                publish('showing', {pageName:this._value});
                publish('selected', {page:this._value, selected:true, change:`${this._value}_show`});
            }
        }

        switchPage(destination) {
            const index = this._tabs().findIndex((tab, i) => this._pageName(tab, i) === this._value);
            if (destination === '*next*' || destination === '*prev*') {
                const step = destination === '*next*' ? 1 : -1;
                const tabs = this._tabs();
                let next = index + step;
                while (next >= 0 && next < tabs.length && !this._available(tabs[next])) next += step;
                this.selectIndex(next);
            }
            else if (typeof destination === 'number' || /^\d+$/.test(String(destination))) this.selectIndex(Number(destination));
            else {
                const target = this._tabs().findIndex((tab, i) => this._pageName(tab, i) === destination);
                this.selectIndex(target);
            }
        }

        selectIndex(index) {
            const tabs = this._tabs();
            if (!this._available(tabs[index])) return;
            const name = this._pageName(tabs[index], index);
            this._mode = 'value'; this._requested = name; this._apply();
            // Named and positional bindings share the existing widget command lane.
            for (const [attribute, value] of [['selected', index], ['selectedPage', name], ['value', name]]) {
                const pointer = this.getAttribute(`data-${attribute}-pointer`);
                if (pointer) this.dispatchEvent(new CustomEvent('gnr-set', {
                    bubbles:true, composed:true, detail:{pointer, value},
                }));
            }
        }

        _apply() {
            if (!this._bar) return;
            const tabs = this._tabs();
            if (!tabs.some(tab => this._available(tab))) {
                tabs.forEach(tab => { tab.style.display = 'none'; });
                this._bar.querySelectorAll('.tab').forEach(button => {
                    button.classList.remove('active');
                    button.setAttribute('aria-pressed', 'false');
                });
                this._value = null;
                this.dispatchEvent(new CustomEvent('gnr-stack-selection', {detail:{index:null, pageName:null}}));
                if (!this._emptyQueued) {
                    this._emptyQueued = true;
                    queueMicrotask(() => {
                        this._emptyQueued = false;
                        if (!this.isConnected || this._tabs().some(tab => this._available(tab))) return;
                        this._publishTransition();
                        for (const attr of ['selected', 'selectedPage', 'value']) {
                            const pointer = this.getAttribute(`data-${attr}-pointer`);
                            if (pointer) this.dispatchEvent(new CustomEvent('gnr-set', {bubbles:true, composed:true, detail:{pointer,value:null}}));
                        }
                    });
                }
                return;
            }
            let index = this._mode === 'selected' && this._requested != null && this._requested !== ''
                ? Number(this._requested)
                : tabs.findIndex((tab, i) => this._pageName(tab, i) === String(this._requested));
            // Legacy ignores an unknown destination; keep the current page.
            if (!Number.isInteger(index) || !this._available(tabs[index])) {
                index = tabs.findIndex((tab, i) => this._available(tab) && this._pageName(tab, i) === this._value);
                if (index < 0) index = tabs.findIndex(tab => this._available(tab));
            }
            this._value = this._pageName(tabs[index], index);
            [...this._bar.querySelectorAll('.tab')].forEach((button, i) => {
                button.classList.toggle('active', i === index);
                button.setAttribute('aria-pressed', String(i === index));
            });
            tabs.forEach((tab, i) => { tab.style.display = i === index ? '' : 'none'; });
            this.dispatchEvent(new CustomEvent('gnr-stack-selection', {detail:{index, pageName:this._value}}));
            // Wait for the renderer's complete attribute batch before synchronizing
            // the alternate name/index bindings. Do not publish while detached.
            if (!this._selectionQueued) {
                this._selectionQueued = true;
                queueMicrotask(() => {
                    this._selectionQueued = false;
                    if (!this.isConnected) return;
                    this._publishTransition();
                    const current = this._tabs().findIndex((tab, i) => this._pageName(tab, i) === this._value);
                    if (current < 0) return;
                    for (const [attribute, value] of [['selected', current], ['selectedPage', this._value], ['value', this._value]]) {
                        const pointer = this.getAttribute(`data-${attribute}-pointer`);
                        if (pointer && String(this.getAttribute(attribute)) !== String(value)) {
                            this.dispatchEvent(new CustomEvent('gnr-set', {bubbles:true, composed:true, detail:{pointer,value}}));
                        }
                    }
                });
            }
        }
    }

    class GnrStackContainer extends GnrTabContainer {
        connectedCallback() { super.connectedCallback(); this._bar.style.display = 'none'; }
    }
    class GnrContentPane extends GnrTab {}

    /** A local stack controller; stackNodeId follows the legacy reference syntax. */
    class GnrStackButtons extends HTMLElement {
        static get observedAttributes() { return ['stacknodeid']; }
        constructor() {
            super();
            const shadow = this.attachShadow({mode:'open'});
            const style = document.createElement('style'); style.textContent = TABS_CSS;
            this._bar = document.createElement('div'); this._bar.className = 'tabbar';
            shadow.append(style, this._bar);
            this._widgetLabel = new WidgetLabel(this, null, this._bar);
            this._refresh = () => this._render();
        }
        connectedCallback() {
            this._widgetLabel.connect();
            this._connect();
            this._observer = new this.ownerDocument.defaultView.MutationObserver(() => this._connect());
            this._observer.observe(this.ownerDocument.body, {childList:true, subtree:true});
        }
        disconnectedCallback() {
            this._widgetLabel.disconnect();
            this._observer?.disconnect();
            this._stack?.removeEventListener('gnr-stack-selection', this._refresh);
            this._stack = null;
        }
        attributeChangedCallback() { if (this.isConnected) this._connect(); }
        _connect() {
            const name = this.getAttribute('stackNodeId');
            const stack = [...this.ownerDocument.querySelectorAll('gnr-stackcontainer,gnr-tabcontainer')]
                .find(node => name && node.getAttribute('nodeId') === name);
            if (stack === this._stack) return;
            this._stack?.removeEventListener('gnr-stack-selection', this._refresh);
            this._stack = stack;
            stack?.addEventListener('gnr-stack-selection', this._refresh);
            this._render();
        }
        _render() {
            this._bar.replaceChildren();
            this._stack?._tabs().forEach((tab, index) => {
                this._bar.append(this._stack._button(tab, index));
            });
        }
    }

    customElements.define('gnr-panel', GnrPanel);
    customElements.define('gnr-box', GnrBox);
    customElements.define('gnr-bordercontainer', GnrBorderContainer);
    customElements.define('gnr-tab', GnrTab);
    customElements.define('gnr-tabcontainer', GnrTabContainer);
    customElements.define('gnr-stackcontainer', GnrStackContainer);
    customElements.define('gnr-stackbuttons', GnrStackButtons);
    customElements.define('gnr-contentpane', GnrContentPane);
}

registerComponentCollection('layout', { components: builtinComponents('layout'), defineComponents });
