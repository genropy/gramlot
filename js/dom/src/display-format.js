// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Scalar presentation only: never use this on model/editor or logic bindings. */
import {formatNumber} from './number-format.js';
import {isDecimal} from 'genro-tytx';
import {toTytx} from 'genro-tytx';

export const FORMATTED_CELLS = Symbol('formatted cells require row rendering');

const STYLES = new Set(['short', 'medium', 'long', 'full']);
const TOKENS = /('(?:[^']|'')*'|[a-zA-Z]+|[^a-zA-Z']+)/g;

function temporal(value, dtype) {
    if (!(value instanceof Date)) throw new TypeError('Temporal formats require a typed Date value');
    if (!Number.isFinite(value.getTime())) throw new RangeError('Invalid date');
    // TYTX D and H use UTC fields as civil carriers, not browser-local instants.
    const kind = dtype || toTytx(value).split('::').at(-1);
    if (!['D', 'H', 'DH', 'DHZ'].includes(kind)) throw new RangeError(`Unsupported temporal dtype: ${kind}`);
    return kind;
}

function patternDate(value, pattern, locale, kind) {
    const parts = pattern.match(TOKENS) || [];
    if (parts.join('') !== pattern) throw new RangeError('Unclosed format literal');
    const pad = (v, n=2) => String(v).padStart(n, '0');
    const name = options => new Intl.DateTimeFormat(locale, {timeZone:'UTC', ...options}).format(value);
    const date = {y:()=>String(value.getUTCFullYear()), yy:()=>pad(value.getUTCFullYear()%100), yyyy:()=>pad(value.getUTCFullYear(),4),
        M:()=>String(value.getUTCMonth()+1), MM:()=>pad(value.getUTCMonth()+1), MMM:()=>name({month:'short'}), MMMM:()=>name({month:'long'}),
        d:()=>String(value.getUTCDate()), dd:()=>pad(value.getUTCDate()), EEE:()=>name({weekday:'short'}), EEEE:()=>name({weekday:'long'})};
    const time = {H:()=>String(value.getUTCHours()), HH:()=>pad(value.getUTCHours()),
        h:()=>String(value.getUTCHours()%12||12), hh:()=>pad(value.getUTCHours()%12||12),
        m:()=>String(value.getUTCMinutes()), mm:()=>pad(value.getUTCMinutes()), s:()=>String(value.getUTCSeconds()), ss:()=>pad(value.getUTCSeconds()),
        a:()=>new Intl.DateTimeFormat(locale,{hour:'numeric',hour12:true,timeZone:'UTC'}).formatToParts(value).find(p=>p.type==='dayPeriod').value};
    const tokens = {...(kind==='H'?{}:date), ...(kind==='D'?{}:time)};
    return parts.map(part => {
        if (part.startsWith("'")) return part === "''" ? "'" : part.slice(1,-1).replaceAll("''", "'");
        if (!/^[a-zA-Z]/.test(part)) return part;
        if (!tokens[part]) throw new RangeError(`Unsupported date format token: ${part}`);
        return tokens[part]();
    }).join('');
}

export function formatDisplay(value, {format, mask, locale, dtype, places} = {}) {
    let text = value == null ? '' : String(value);
    if (value != null && value !== '' && (format != null && format !== '' || places != null)) {
        if (typeof value === 'number' || isDecimal(value)) {
            text = formatNumber(value, {format, locale, places});
        } else {
        const kind = temporal(value, dtype);
        if (STYLES.has(format)) {
            const options = {timeZone:'UTC'};
            if (kind !== 'H') options.dateStyle = format;
            if (kind !== 'D') options.timeStyle = format;
            text = new Intl.DateTimeFormat(locale || undefined, options).format(value);
        } else text = patternDate(value, String(format), locale || undefined, kind);
    }
    }
    return mask == null ? text : String(mask).replaceAll('%s', () => text);
}

/** Inherited locale pointers resolve in the declaring scope; register the
 * consumer with the existing handler, so partial renders follow the same rules. */
export function displayLocale(node, attrs, doc) {
    if (attrs.locale) return attrs.locale;
    for (let parent=node.parentNode; parent; parent=parent.parentNode) {
        const raw = parent.getAttr('locale');
        if (raw == null) continue;
        const type = parent.pointerType(raw);
        if (!type) { if (raw) return raw; continue; }
        const path = parent.absDatapath(raw);
        if (type === '^') node.builder.handler._registerPath(node, path);
        const value = node.builder.handler.data.getItem(path);
        if (value) return value;
    }
    return node.builder.handler?.application?.options?.locale || doc.documentElement.lang || undefined;
}
