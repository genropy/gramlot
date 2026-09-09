// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Shared HTML attribute/style adaptation for renderers and widget decorations.
/** Root names that classify a kwarg as a CSS property (Genro-style inline
 *  styling): a kwarg is CSS if its name equals a root, or starts with a
 *  root + '_' (underscore→dash yields the property). Ported verbatim from
 *  the Python HtmlRenderer._STYLE_ROOTS. */
const STYLE_ROOTS = new Set([
    'width', 'height', 'top', 'left', 'right', 'bottom',
    'padding', 'margin', 'border', 'position', 'display',
    'overflow', 'float', 'clear', 'resize', 'z_index',
    'min_width', 'min_height', 'max_width', 'max_height',
    'color', 'background', 'font', 'text',
    'line_height', 'white_space', 'vertical_align',
    'flex', 'gap', 'row_gap', 'column_gap', 'grid',
    'align_content', 'justify_content', 'align_items', 'justify_items',
    'visibility', 'opacity', 'cursor',
]);

/** True if `name` matches a CSS root or a `root_*` form. */
function isStyleAttr(name) {
    if (STYLE_ROOTS.has(name)) {
        return true;
    }
    for (const root of STYLE_ROOTS) {
        if (name.startsWith(`${root}_`)) {
            return true;
        }
    }
    return false;
}

/** Parse a `style="k: v; k: v"` literal into an object (last wins). An
 *  entry without ':' is malformed CSS and throws. */
function parseStyleString(value) {
    const result = {};
    if (!value) {
        return result;
    }
    for (const raw of String(value).split(';')) {
        const entry = raw.trim();
        if (!entry) {
            continue;
        }
        const i = entry.indexOf(':');
        if (i === -1) {
            throw new Error(`malformed style declaration: ${entry}`);
        }
        result[entry.slice(0, i).trim()] = entry.slice(i + 1).trim();
    }
    return result;
}

export class HtmlAttributes {
    constructor(dialect = "html") { this.dialect = dialect; }
    /** Collapse CSS roots, `style_*` escapes and an explicit `style` into a
     *  single `style` entry; plain HTML attributes (with the keyword-collision
     *  remap already applied upstream) pass through. Port of the Python
     *  HtmlRenderer.adapt_attrs. DIFF-PYTHON: the Genro CSS macros
     *  (rounded/gradient/shadow/…) and the retained `validate_*` families are
     *  later slices — not handled here. Units are the author's (write
     *  `width:'320px'`), as in the Python `_css_value`. */
    adaptAttrs(attrs) {
        const out = {};
        const styleAttrs = {};
        const dialectPrefix = `${this.dialect}_`;
        for (const [rawName, value] of Object.entries(attrs)) {
            // dialect escape `html_<x>` → the literal HTML attribute <x>
            if (rawName.startsWith(dialectPrefix)) {
                out[rawName.slice(dialectPrefix.length)] = value;
                continue;
            }
            if (this._isStyleContribution(rawName)) {
                styleAttrs[rawName] = value;
                continue;
            }
            out[rawName] = value;
        }
        const style = this._adaptStyle(styleAttrs);
        if (style) {
            out.style = style;
        }
        return out;
    }

    /** Whether `rawName` feeds the composed `style` entry (vs a plain attr). */
    _isStyleContribution(rawName) {
        if (rawName === 'style' || rawName.startsWith('style_')) {
            return true;
        }
        return isStyleAttr(rawName);
    }

    /** Compose the CSS `style` text: explicit `style` seeded first, then
     *  `style_<prop>` escapes and CSS roots (kwargs win on collision). */
    _adaptStyle(attrs) {
        const css = parseStyleString(attrs.style);
        for (const [rawName, value] of Object.entries(attrs)) {
            if (rawName === 'style') {
                continue;
            } else if (rawName.startsWith('style_')) {
                css[rawName.slice('style_'.length).replace(/_/g, '-')] = this._cssValue(value);
            } else {
                css[rawName.replace(/_/g, '-')] = this._cssValue(value);
            }
        }
        return Object.entries(css).map(([k, v]) => `${k}: ${v}`).join('; ');
    }

    /** Render a CSS value verbatim (units are the author's). */
    _cssValue(value) {
        if (value === true) { return 'true'; }
        if (value === false) { return 'false'; }
        return String(value);
    }
}
