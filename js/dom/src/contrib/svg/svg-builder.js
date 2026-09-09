// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * SvgBuilder + SvgRenderer — JS port of contrib/svg, in analogy with
 * contrib/html. Same machinery (grammar object + defineGrammar static
 * block + RendererBase walk); the only real DIFF-PYTHON is the output:
 * SVG nodes must be created in the SVG namespace, so `renderedItem` uses
 * `document.createElementNS(SVG_NS, tag)` instead of `createElement`.
 */
import { RendererBase } from '../../renderer/base.js';
import { BuilderBase } from '../../builder-base.js';
import { SVG_GRAMMAR } from './svg-elements.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class SvgBuilder extends BuilderBase {
    static _name = 'svg';

    static _defaultRenderMode = 'svg';

    static { this.defineGrammar(SVG_GRAMMAR); }   // __init_subclass__ equivalent

    get renderer_svg() {
        return new SvgRenderer(this);
    }
}

export class SvgRenderer extends RendererBase {
    /** Emit the SVG DOM element for `node` (namespaced). */
    renderedItem(node, item, runtimeAttrs, { tag, includeDatapath = false }) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(runtimeAttrs)) {
            if (value === true) {
                el.setAttribute(name, '');
            } else if (value !== false && value !== null && value !== undefined) {
                el.setAttribute(name, String(value));
            }
        }
        if (includeDatapath) {
            if (!('id' in runtimeAttrs)) {
                const targetId = this.builder.targetId(node);
                if (targetId !== null) {
                    el.setAttribute('id', targetId);
                }
            }
            for (const [rawName, value] of Object.entries(node.getAttr() || {})) {
                if (typeof value === 'string' && value && (value[0] === '^' || value[0] === '=')) {
                    el.setAttribute(`data-${this.adapt(rawName)}-pointer`, node.absDatapath(value));
                }
            }
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
}
