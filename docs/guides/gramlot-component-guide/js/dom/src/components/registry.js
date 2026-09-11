// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {registerCollection, getCollection, webcomponent} from '../collections.js';

const descriptions = new Map();
/** Explicit, trusted module registration. Descriptions carry JSON data only;
 * executable implementations arrive through the selected module's callback. */
export function registerComponentCollection(name, {components, defineComponents, css}) {
    if (!name || !Array.isArray(components) || typeof defineComponents !== 'function') {
        throw new TypeError('A component collection needs a name, descriptions and defineComponents');
    }
    if (descriptions.has(name) || getCollection(name)) throw new Error(`Component collection already registered: ${name}`);
    const elements = {};
    const tags = new Set();
    const normalized = components.map(component => {
        const {name: recipe, tag, subTags = '', capabilities = [], meta = {}} = component;
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(recipe) || !/^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(tag)) {
            throw new TypeError('Invalid component recipe name or custom-element tag');
        }
        if (elements[recipe] || tags.has(tag)) throw new Error(`Duplicate component: ${recipe}/${tag}`);
        tags.add(tag);
        const description = Object.freeze({...component, subTags, capabilities:Object.freeze([...capabilities]), meta:Object.freeze({...meta})});
        elements[recipe] = webcomponent(recipe, {subTags, ...meta, render_tag:tag, webcomponent:true});
        return description;
    });
    const frozen = Object.freeze(normalized);
    descriptions.set(name, frozen);
    registerCollection(name, {
        grammar:{elements}, components:frozen, css,
        defineComponents() {
            defineComponents();
            if (typeof customElements === 'undefined') return;
            for (const component of frozen) {
                const implementation = customElements.get(component.tag);
                if (!implementation) throw new Error(`Collection ${name} did not define ${component.tag}`);
                if (!Object.hasOwn(implementation, 'gramlotComponent')) {
                    Object.defineProperty(implementation, 'gramlotComponent', {value:component});
                }
            }
        },
    });
    return frozen;
}

export function getComponentDescriptions(collection) { return descriptions.get(collection); }
