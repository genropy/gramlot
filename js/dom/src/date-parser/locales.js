// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Vocabulary only; both languages use the same parser and calendar arithmetic.
export const locales = {
    it: {
        months: 'gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre'.split(' '),
        weekdays: 'lunedi martedi mercoledi giovedi venerdi sabato domenica'.split(' '),
        days: {oggi: 0, ieri: -1, domani: 1},
        weeks: {'questa settimana': 0, settimana: 0, 'settimana prossima': 1, 'settimana scorsa': -1},
        relativeMonths: {'questo mese': 0, mese: 0, 'mese prossimo': 1, 'mese scorso': -1},
        from: ['da', 'dal', 'dalla', 'tra', 'fra'],
        to: ['a', 'al', 'alla', 'e'],
        always: ['-', 'senza periodo', 'sempre'],
        quarter: /^(?:t([1-4])|([1-4])(?:°|º|o)? trimestre)(?: (\d{2}|\d{4}))?$/,
    },
    en: {
        months: 'january february march april may june july august september october november december'.split(' '),
        weekdays: 'monday tuesday wednesday thursday friday saturday sunday'.split(' '),
        days: {today: 0, yesterday: -1, tomorrow: 1},
        weeks: {'this week': 0, week: 0, 'next week': 1, 'last week': -1},
        relativeMonths: {'this month': 0, month: 0, 'next month': 1, 'last month': -1},
        from: ['from', 'between'],
        to: ['to', 'and'],
        always: ['no period', 'always'],
        quarter: /^(?:q([1-4])|([1-4]) quarter|(1st|2nd|3rd|4th) quarter)(?: (\d{2}|\d{4}))?$/,
    },
};

export function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function localeContext(locale) {
    if (typeof locale !== 'string') throw new RangeError('A supported locale is required.');
    const tag = locale.replaceAll('_', '-').toLowerCase();
    // Explicit support avoids silently guessing another region's numeric order.
    const orders = {it: 'dmy', 'it-it': 'dmy', 'it-ch': 'dmy', en: 'mdy',
        'en-us': 'mdy', 'en-gb': 'dmy', 'en-au': 'dmy', 'en-nz': 'dmy', 'en-ie': 'dmy'};
    if (!Object.hasOwn(orders, tag)) throw new RangeError(`Unsupported locale: ${locale}`);
    return {dictionary: locales[tag.split('-')[0]], order: orders[tag], language: tag.split('-')[0]};
}
