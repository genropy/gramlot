// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * TargetWrapper — JS port of builder/target_wrapper.py.
 *
 * The render destination as an object. `full(document)` consumes a
 * total render; `partial(patches)` a batch of per-node patches when
 * `acceptsPartial` is true. `renderOpts` are the walk options the
 * destination dictates (a patch consumer needs the DOM ids, hence
 * `{includeDatapath: true}`).
 *
 * `DomTarget` is the browser destination: `full` replaces the children
 * of a root element with a freshly rendered fragment; `partial` applies
 * the patch ops (`replace`/`insert`/`remove`) by DOM id. Patch ids are
 * the `targetId` serials the reactive render emits as the element id.
 */

export class TargetWrapper {
    get acceptsPartial() {
        return false;
    }

    get renderOpts() {
        return {};
    }

    full(_document) {
        throw new Error(`${this.constructor.name} does not implement full()`);
    }

    partial(_patches) {
        throw new Error(
            `${this.constructor.name} declares acceptsPartial but does not `
            + 'implement partial()',
        );
    }
}

export class DomTarget extends TargetWrapper {
    /** @param {Element} rootElement host element for this render. */
    constructor(rootElement) {
        super();
        this._disposed = false;
        this.root = rootElement;
        this.recipes = new WeakMap();
    }

    get acceptsPartial() {
        return true;
    }

    get renderOpts() {
        return { includeDatapath: true };
    }

    /** Replace the root's children with the rendered fragment. */
    full(document) {
        if (this._disposed) return;
        this._remember(document);
        if (!this._disposed) this.root.replaceChildren(document);
    }

    /** Snapshot renderer output BEFORE connection mutates tabs/styles/content. */
    _remember(node) {
        // Track text nodes too: the Application removes only its own output.
        this.recipes.set(node, node.cloneNode(false));
        for (const child of node.childNodes) { this._remember(child); }
    }

    /** DIFF-PYTHON: patch container attributes without destroying browser state.
     * Reconcile matching children; structural differences use normal replacement.
     * Compare recipe attributes, not runtime styles (drag position, hidden tabs).
     */
    _reconcile(el, next, direct = false) {
        if (this._disposed) return true;
        const prior = this.recipes.get(el);
        if (!prior || next.nodeType !== 1 || el.localName !== next.localName) return false;
        const container = ['gnr-formlet', 'gnr-labledbox', 'gnr-groupbox', 'gnr-form', 'div', 'gnr-palette', 'gnr-tabcontainer', 'gnr-tab',
            'gnr-bordercontainer', 'gnr-panel', 'gnr-box', 'gnr-stackcontainer', 'gnr-contentpane'].includes(el.localName);
        const names = new Set([...prior.attributes, ...next.attributes].map(a => a.name));
        const changes = [...names].filter(name => prior.getAttribute(name) !== next.getAttribute(name));
        const decorationChanges = changes.filter(name => !(
            (name === 'value' && next.hasAttribute('data-value-pointer') && String(el.value) === String(next.value))
            || (name === 'checked' && next.hasAttribute('data-checked-pointer') && el.checked === next.checked)));
        if (el._widgetLabel && decorationChanges.length && decorationChanges.every(name => name === 'style' || el._widgetLabel.isDecoration(name))
            && el.innerHTML === next.innerHTML) {
            // Decoration changes must not overwrite a focused control's uncommitted value.
            this._patchAttributes(el, next, prior, names);
            el._widgetLabel.apply();
            return true;
        }
        if (el.editorPresentationAttributes && decorationChanges.every(name => el.editorPresentationAttributes.includes(name))
            && el.innerHTML === next.innerHTML) {
            this._patchAttributes(el,next,prior,names);
            return true;
        }
        if (el._formField && el._nullState && el.innerHTML === next.innerHTML) {
            this._patchAttributes(el,next,prior,names);
            el._widgetLabel?.apply();
            return true;
        }
        const oldChildren = [...el.childNodes];
        const newChildren = [...next.childNodes];
        if (!container) {
            // Preserve unchanged leaves, including their live input/store properties.
            if (direct && next.hasAttribute('data-value-pointer') && String(el.value) !== String(next.value)) return false;
            if (direct && next.hasAttribute('data-checked-pointer') && el.checked !== next.checked) return false;
            return prior.isEqualNode(next.cloneNode(false)) && el.innerHTML === next.innerHTML;
        }
        if (oldChildren.length !== newChildren.length || oldChildren.some((child, i) => {
            const fresh = newChildren[i];
            return child.nodeType !== fresh.nodeType || (child.nodeType === 1
                && (child.localName !== fresh.localName || child.id !== fresh.id));
        })) return false;
        this._patchAttributes(el, next, prior, names);
        // A widget can change its own value attribute (e.g. closing a palette).
        // Restoring the same recipe value must still update its live state.
        if (direct && next.hasAttribute('data-value-pointer') && String(el.value) !== String(next.value)) {
            el.value = next.value;
        }
        oldChildren.forEach((child, i) => {
            if (this._disposed) return;
            const fresh = newChildren[i];
            if (child.nodeType === 3) { if (child.data !== fresh.data) child.data = fresh.data; }
            else if (!this._reconcile(child, fresh)) {
                this._remember(fresh);
                if (!this._disposed) child.replaceWith(fresh);
            }
        });
        return true;
    }

    /** Patch recipe-owned attributes without replacing the existing element. */
    _patchAttributes(el, next, prior, names) {
        if (next.readDataScope) el.readDataScope = next.readDataScope;
        for (const name of names) {
            if (this._disposed) return true;
            if (prior.getAttribute(name) === next.getAttribute(name)) continue;
            if (name === 'style') {
                for (const property of new Set([...Array.from(prior.style), ...Array.from(next.style)])) {
                    if (prior.style.getPropertyValue(property) === next.style.getPropertyValue(property)
                        && prior.style.getPropertyPriority(property) === next.style.getPropertyPriority(property)) continue;
                    el.style.setProperty(property, next.style.getPropertyValue(property), next.style.getPropertyPriority(property));
                }
            } else if (next.hasAttribute(name)) el.setAttribute(name, next.getAttribute(name));
            else el.removeAttribute(name);
        }
        this.recipes.set(el, next.cloneNode(false));
    }

    /** Advance the recipe snapshot after an anti-echo write-back skips rendering. */
    _recordValue(id, name, value) {
        const prior = this.recipes.get(this._byId(id));
        if (!prior) return;
        if (value === false || value === null || value === undefined) prior.removeAttribute(name);
        else prior.setAttribute(name, value === true ? '' : String(value));
    }

    /** Locate an element by exact id. An attribute selector, dot-safe: a
     *  derived expansion id (`blk.r2.3`) is a valid id but not a valid
     *  `#id` selector, and jsdom's `CSS.escape` is a no-op — the attribute
     *  form works in both jsdom and browsers. */
    _byId(id) {
        const escaped = id.replace(/["\\]/g, '\\$&');
        return this.root.querySelector(`[data-gnr-target-id="${escaped}"]`)
            || this.root.querySelector(`[id="${escaped}"]`);
    }

    /** Apply a batch of per-node patches to the live DOM. */
    partial(patches) {
        for (const patch of patches) {
            if (this._disposed) return;
            if (patch.op === 'insert') {
                // A null container id means the document root.
                const container = patch.id === null ? this.root : this._byId(patch.id);
                const before = patch.before ? this._byId(patch.before) : null;
                if (container) {
                    this._remember(patch.node);
                    if (!this._disposed) container.insertBefore(patch.node, before);
                }
                continue;
            }
            const el = this._byId(patch.id);
            if (patch.op === 'remove') {
                if (el) {
                    el.remove();
                }
            } else if (patch.op === 'replace') {
                if (el) {
                    if (!this._reconcile(el, patch.node, true)) {
                        this._remember(patch.node);
                        if (!this._disposed) el.replaceWith(patch.node);
                    }
                }
            } else if (patch.op === 'text') {
                // Value-only cell patch: a reader span's text content.
                if (el) {
                    el.textContent = patch.value;
                }
            } else if (patch.op === 'attr') {
                // Value-only cell patch: a bound input's attribute.
                if (el) {
                    el.setAttribute(patch.name, patch.value);
                }
            }
        }
    }
}
