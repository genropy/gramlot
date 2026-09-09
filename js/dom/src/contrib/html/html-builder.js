// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * HtmlBuilder + HtmlRenderer — JS port of contrib/html (embryo slice).
 *
 * The grammar is a handful of tags in the `builder_grammar` shape
 * (`{tag: {subTags, meta}}`), so swapping it for the loader of
 * `html.json` later is a replacement, not a rewrite.
 *
 * `HtmlRenderer` overrides `renderedItem` of `RendererBase`. DIFF-PYTHON:
 * the Python `HtmlRenderer.rendered_item` emits a markup STRING; this one
 * emits a DOM `Element` (`document.createElement`) — the model of the
 * legacy `gnrdomsource.js`, the form reactivity needs. Everything else
 * (the walk, `_handleMeta`, `runtimeValues`, include_datapath ids and
 * `data-*-pointer` hooks) follows the Python architecture linearly.
 */
import { RendererBase } from '../../renderer/base.js';
import { BuilderBase } from '../../builder-base.js';
import { HtmlAttributes } from './html-attributes.js';
import { HTML5_GRAMMAR } from './html5-elements.js';

/** HTML5 void elements: rendered without children/closing tag. */
const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'source', 'track', 'wbr',
]);

export class HtmlBuilder extends BuilderBase {
    static _name = 'html';

    static _defaultRenderMode = 'html';

    static { this.defineGrammar(HTML5_GRAMMAR); }   // __init_subclass__ equivalent

    get renderer_html() {
        return new HtmlRenderer(this);
    }
}

export class HtmlRenderer extends RendererBase {
    /** Emit the DOM element for `node` (parity with rendered_item). */
    renderedItem(node, item, runtimeAttrs, { tag, includeDatapath = false }) {
        const el = document.createElement(tag);
        if (node._getMeta('dataWidget') && 'store' in runtimeAttrs) {
            // data-widget (GnrStoreBag channel): hand the resolved Bag branch
            // as a JS property, never a stringified attribute. The path still
            // rides as data-store-pointer (via _datapathAttrs) for addressing.
            el.storeBag = runtimeAttrs.store;
            runtimeAttrs = { ...runtimeAttrs };
            delete runtimeAttrs.store;
        }
        if (tag === 'gnr-labledbox' && runtimeAttrs.style) {
            // The explicit box owns appearance once; outer placement stays on its host.
            const sourceStyle=document.createElement('div').style;
            sourceStyle.cssText=runtimeAttrs.style;
            const outer=document.createElement('div').style, inner=document.createElement('div').style;
            for (const property of Array.from(sourceStyle)) {
                const placement=/^(width|height|min-|max-|margin|grid-|flex|align-self|justify-self|position|top|left|right|bottom|display|z-index)/.test(property);
                (placement ? outer : inner).setProperty(property,sourceStyle.getPropertyValue(property));
            }
            runtimeAttrs={...runtimeAttrs,style:outer.cssText,box_style:inner.cssText+';'+(runtimeAttrs.box_style || '')};
        }
        this._applyAttrs(el, runtimeAttrs);
        el._widgetLabel?.apply();
        el._applyRange?.();
        if (el._nullState) {
            if (Object.hasOwn(runtimeAttrs, 'checked')) el.checked = runtimeAttrs.checked;
            else if (Object.hasOwn(runtimeAttrs, 'value')) el.value = runtimeAttrs.value;
        }
        if (tag === 'button' && (runtimeAttrs.action || runtimeAttrs.publish)) {
            el.setAttribute('data-command-node', this.builder.targetId(node));
        }
        if (includeDatapath) {
            this._autoId(el, node, runtimeAttrs);
            this._datapathAttrs(el, node);
        }
        if (VOID_TAGS.has(tag)) {
            return el;
        }
        if (Array.isArray(item)) {
            for (const child of item) {
                el.appendChild(child);
            }
        } else if (item !== null && item !== undefined) {
            el.textContent = String(item);
        }
        return el;
    }

    /** Serialize the resolved attributes onto the element. */
    _applyAttrs(el, attrs) {
        for (const [name, value] of Object.entries(attrs)) {
            if (value === true) {
                el.setAttribute(name, '');
            } else if (value !== false && value !== null && value !== undefined) {
                el.setAttribute(name, String(value));
            }
        }
    }

    /** Emit the DOM id (target_id) for a node in reactive render mode. */
    _autoId(el, node, runtimeAttrs) {
        const targetId = this.builder.targetId(node);
        if (targetId !== null) {
            // Internal patch identity is stable even when the author changes HTML id.
            el.setAttribute('data-gnr-target-id', targetId);
            if (!('id' in runtimeAttrs)) el.id = targetId;
        }
    }

    /** Emit `data-<name>-pointer` write-back hooks for pointer attributes. */
    _datapathAttrs(el, node) {
        for (const [rawName, value] of Object.entries(node.getAttr() || {})) {
            if (!(typeof value === 'string' && value && (value[0] === '^' || value[0] === '='))) {
                continue;
            }
            const htmlName = this.adapt(rawName);
            el.setAttribute(`data-${htmlName}-pointer`, node.absDatapath(value));
        }
    }

    /** Use the same HTML/CSS rules for ordinary nodes and widget decorations. */
    adaptAttrs(attrs) {
        return new HtmlAttributes(this.builder.constructor._name).adaptAttrs(attrs);
    }
}
