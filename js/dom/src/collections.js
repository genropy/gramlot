// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Web-component collections — pluggable families of custom-element widgets.
 *
 * A collection bundles a grammar (its tags) and the code that defines its
 * custom elements. A page declares the collections it needs with
 * `wc_requires` (static) or `wcRequires()` (in setup); at create time the
 * builder resolves them: merges the grammar and defines the elements.
 *
 * This mirrors ws-web `resources/components/*` (each an `InputsCollection`
 * with `js_requires` + `@webcomponent`), but the page *requires* a
 * collection by name instead of mixing it in — the `wc_requires` member of
 * the `js_requires`/`css_requires` family.
 */

const COLLECTIONS = new Map();

/** Register a collection: name → { grammar, defineComponents, css }.
 *  - grammar: `{ elements: {tag: entry}, abstracts?: {} }`
 *  - defineComponents(): registers the custom elements (idempotent)
 *  - css: optional stylesheet text injected once when required */
export function registerCollection(name, spec) {
    COLLECTIONS.set(name, spec);
}

export function getCollection(name) {
    return COLLECTIONS.get(name);
}

/**
 * Grammar entry for a web-component-backed element (sugar over the plain
 * element entry, JS port of ws-web `@webcomponent`): derives the DOM tag
 * `gnr-<name>` (lowercased — a camelCase name folds to one word) via
 * `render_tag`, and marks the node `webcomponent`.
 */
export function webcomponent(name, { subTags = '', tag = null, ...extraMeta } = {}) {
    return {
        doc: null,
        sub_tags: subTags,
        parent_tags: null,
        inherits_from: null,
        ns: null,
        attributes: null,
        _meta: {
            webcomponent: true,
            render_tag: `gnr-${(tag || name).toLowerCase()}`,
            ...extraMeta,
        },
    };
}

const _injectedCss = new Set();

/** Inject a collection's stylesheet once (browser only; no-op in Node). */
export function injectCollectionCss(name, css) {
    if (!css || _injectedCss.has(name)) {
        return;
    }
    if (typeof document === 'undefined' || !document.head) {
        return;
    }
    const style = document.createElement('style');
    style.setAttribute('data-collection', name);
    style.textContent = css;
    document.head.appendChild(style);
    _injectedCss.add(name);
}
