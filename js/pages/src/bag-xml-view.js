// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Diagnostic XML only: retain object attributes as JSON, without mutating the Bag.
export function bagXmlView(bag, rootName) {
    const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;');
    const scalar = value => {
        if (typeof value === 'object' && value !== null) {
            try { return JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? String(item) : item); }
            catch { return '[non-serializable object]'; }
        }
        return value == null ? '' : String(value);
    };
    const rows = (current, depth) => Array.from(current, node => {
        const raw = node.xmlTag || node.nodeTag || node.label;
        const tag = /^[A-Za-z_][\w.-]*$/.test(raw) ? raw : 'node';
        const attrs = {...node.attr};
        if (tag !== raw) { attrs._label = raw; }
        const attributes = Object.entries(attrs).filter(([, v]) => v !== undefined)
            .map(([key, value]) => ` ${key}="${escape(scalar(value))}"`).join('');
        const prefix = '  '.repeat(depth);
        const value = node.getValue(true);
        if (value && typeof value.toXml === 'function' && value[Symbol.iterator]) {
            const inner = rows(value, depth + 1);
            return inner ? `${prefix}<${tag}${attributes}>\n${inner}\n${prefix}</${tag}>` : `${prefix}<${tag}${attributes}/>`;
        }
        return `${prefix}<${tag}${attributes}>${escape(scalar(value))}</${tag}>`;
    }).join('\n');
    return `<${rootName}>\n${rows(bag, 1)}\n</${rootName}>`;
}
