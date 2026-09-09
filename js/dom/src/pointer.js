// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

/**
 * Pointer utilities for ^path syntax detection and parsing.
 *
 * Pointer syntax:
 *     ^alfa.beta        — absolute path to data value
 *     ^.beta            — relative to current node's datapath
 *     ^alfa.beta?color  — attribute 'color' of data node 'alfa.beta'
 */

/**
 * Check if a value is a ^pointer string.
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if value is a string starting with '^'.
 */
export function isPointer(value) {
    return typeof value === 'string' && value.startsWith('^');
}

/**
 * Parse a ^pointer string into its components.
 *
 * @param {string} raw - The raw pointer string (must start with '^').
 * @returns {{ raw: string, path: string, attr: string|null, isRelative: boolean }}
 *
 * @example
 *     parsePointer('^alfa.beta?color')
 *     // → { raw: '^alfa.beta?color', path: 'alfa.beta', attr: 'color', isRelative: false }
 *     parsePointer('^.name')
 *     // → { raw: '^.name', path: '.name', attr: null, isRelative: true }
 */
export function parsePointer(raw) {
    let body = raw.slice(1); // strip ^

    let attr = null;
    const qIdx = body.indexOf('?');
    if (qIdx !== -1) {
        attr = body.slice(qIdx + 1);
        body = body.slice(0, qIdx);
    }

    const isRelative = body.startsWith('.');

    return { raw, path: body, attr, isRelative };
}

/**
 * Scan a node's value and attributes for ^pointers.
 *
 * @param {Object} node - A BagNode to scan.
 * @returns {Array<{ pointerInfo: Object, location: string }>}
 *     Each entry has pointerInfo (from parsePointer) and location
 *     ('value' or 'attr:attributeName').
 */
export function scanForPointers(node) {
    const results = [];

    // Check node value
    const value = node.staticValue !== undefined ? node.staticValue : node._value;
    if (isPointer(value)) {
        results.push({ pointerInfo: parsePointer(value), location: 'value' });
    }

    // Check attributes
    const attrDict = node.attr || {};
    for (const [attrName, attrValue] of Object.entries(attrDict)) {
        if (attrName.startsWith('_')) {
            continue;
        }
        if (isPointer(attrValue)) {
            results.push({ pointerInfo: parsePointer(attrValue), location: `attr:${attrName}` });
        }
    }

    return results;
}
