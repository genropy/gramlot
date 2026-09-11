// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {addDays, civil, monday, monthPeriod, parts} from './civil.js';
import {localeContext, normalize} from './locales.js';

const fail = (code, message) => ({ok: false, error: {code, message}});
const single = date => ({ok: true, kind: 'date', date});
const period = (start, end) => ({ok: true, kind: 'period', start, end});
const own = (object, key) => Object.hasOwn(object, key);

function decodeYear(text, context) {
    if (!text) return context.year;
    const value = Number(text);
    if (text.length !== 2) return value;
    // Exactly 100 years, inclusive: [work year + ahead - 99, work year + ahead].
    const upper = context.year + context.twoDigitYearAhead;
    return upper - ((upper - value) % 100 + 100) % 100;
}

function parseOne(text, context) {
    const {dictionary: words, language, order, workdate, year, month} = context;
    let match;
    if ((match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text))) {
        return single(civil(...match.slice(1).map(Number)));
    }
    if (/^(?:\d{2}|\d{4})$/.test(text)) {
        const y = decodeYear(text, context);
        return period(civil(y, 1, 1), civil(y, 12, 31));
    }
    // Offsets apply only to relative words, never to numeric date separators.
    match = /^(.*?)(?:\s*([+-])\s*(\d+))?$/.exec(text);
    const base = match[1];
    const offset = match[3] ? Number(`${match[2]}${match[3]}`) : 0;
    if (own(words.days, base)) return single(addDays(workdate, words.days[base] + offset));
    if (own(words.weeks, base)) {
        const start = addDays(monday(workdate), (words.weeks[base] + offset) * 7);
        return period(start, addDays(start, 6));
    }
    if (own(words.relativeMonths, base)) {
        const dates = monthPeriod(year, month, words.relativeMonths[base] + offset);
        return period(dates.start, dates.end);
    }
    match = words.quarter.exec(text);
    if (match) {
        const quarter = Number.parseInt(match[1] || match[2] || match[3], 10);
        const y = decodeYear(match[language === 'en' ? 4 : 3], context);
        const dates = monthPeriod(y, quarter * 3 - 2, 0, 3);
        return period(dates.start, dates.end);
    }
    match = /^([a-z]+)\.?(?: (\d{2}|\d{4}))?$/.exec(text);
    if (match) {
        const index = words.months.findIndex(name => name === match[1] || name.slice(0, 3) === match[1]);
        if (index !== -1) {
            const dates = monthPeriod(decodeYear(match[2], context), index + 1);
            return period(dates.start, dates.end);
        }
    }
    const dayName = text.replace(/\.$/, '');
    const weekday = words.weekdays.findIndex(name => name === dayName || name.slice(0, 3) === dayName);
    if (weekday !== -1) return single(addDays(monday(workdate), weekday));

    if (/^(?:\d{6}|\d{8})$/.test(text)) {
        match = [text, text.slice(0, 2), text.slice(2, 4), text.slice(4)];
    } else {
        // Same separator twice. Two-part dates use the reference year.
        const numeric = /^(\d{1,2})([/ .-])(\d{1,2})(?:\2(\d{2}|\d{4}))?$/.exec(text);
        match = numeric && [text, numeric[1], numeric[3], numeric[4]];
    }
    if (match) {
        const first = Number(match[1]), second = Number(match[2]);
        return single(civil(decodeYear(match[3], context), order === 'dmy' ? second : first,
            order === 'dmy' ? first : second));
    }
    return fail('UNRECOGNIZED_EXPRESSION', 'Text is not a supported date expression.');
}

function splitRange(text, words) {
    if (words.always.includes(text)) return ['', ''];
    if (text.includes(';')) return text.split(';').map(item => item.trim());
    let from = false;
    for (const prefix of words.from) {
        if (text.startsWith(`${prefix} `)) {
            from = true;
            text = text.slice(prefix.length + 1);
            break;
        }
    }
    for (const separator of words.to) {
        if (!from && text.startsWith(`${separator} `)) return ['', text.slice(separator.length + 1)];
        if (text.includes(` ${separator} `)) return text.split(` ${separator} `).map(item => item.trim());
    }
    return from ? [text, ''] : null;
}

/**
 * Parse localized civil dates/periods, without reading the clock or touching UI/Data.
 * @param {string} text A complete expression; an optional leading slash is accepted.
 * @param {{locale?: string, workdate: string, twoDigitYearAhead?: number}} options
 * @returns {{ok:true, kind:'date', date:string} |
 *   {ok:true, kind:'period', start:string|null, end:string|null} |
 *   {ok:false, error:{code:string, message:string}}}
 */
export function parseDateExpression(text, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        return fail('INVALID_CONTEXT', 'Options must provide a civil workdate and supported locale.');
    }
    let context;
    try {
        const {locale = 'it-IT', workdate, twoDigitYearAhead = 20} = options;
        const [year, month] = parts(workdate);
        if (!Number.isInteger(twoDigitYearAhead) || twoDigitYearAhead < 0 || twoDigitYearAhead > 99) {
            return fail('INVALID_CONTEXT', 'twoDigitYearAhead must be an integer from 0 to 99.');
        }
        context = {...localeContext(locale), workdate, year, month, twoDigitYearAhead};
    } catch (error) {
        return fail('INVALID_CONTEXT', error.message);
    }
    if (typeof text !== 'string') return fail('INVALID_INPUT', 'Expression must be a string.');
    const expression = normalize(text).replace(/^\/\s*/, '');
    if (!expression) return fail('EMPTY_EXPRESSION', 'Expression is empty.');
    try {
        const range = splitRange(expression, context.dictionary);
        if (!range) return parseOne(expression, context);
        if (range.length !== 2) return fail('INVALID_RANGE', 'A range must have exactly two endpoints.');
        const endpoints = range.map(item => item ? parseOne(item, context) : null);
        for (const result of endpoints) if (result && !result.ok) return result;
        const [left, right] = endpoints;
        const start = left ? (left.kind === 'date' ? left.date : left.start) : null;
        const end = right ? (right.kind === 'date' ? right.date : right.end) : null;
        if (start && end && start > end) return fail('REVERSED_RANGE', 'Start is after end; specify the intended years.');
        return period(start, end);
    } catch (error) {
        if (!(error instanceof RangeError)) throw error;
        return fail('INVALID_DATE', error.message);
    }
}
