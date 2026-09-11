// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
// Package self-reference verifies the isolated public entry in a DOM-free process.
import {parseDateExpression} from 'gramlot-dom/date-parser';

const context = {locale: 'it-IT', workdate: '2026-09-11'};
const parse = (text, options = {}) => parseDateExpression(text, {...context, ...options});
const date = value => ({ok: true, kind: 'date', date: value});
const period = (start, end) => ({ok: true, kind: 'period', start, end});

test('civil date formats and locale-specific compact/local ordering', () => {
    for (const text of ['010325', '01032025', '01/03/25', '1/3/2025', '1-3-2025', '1.3.2025', '1 3 2025', '2025-03-01']) {
        assert.deepEqual(parse(text), date('2025-03-01'), text);
    }
    assert.deepEqual(parse('1/3'), date('2026-03-01'));
    for (const locale of ['en', 'en-US', 'en_us']) {
        assert.deepEqual(parse('010325', {locale}), date('2025-01-03'));
    }
    for (const locale of ['en-GB', 'en-AU', 'en-NZ', 'en-IE', 'it-CH']) {
        assert.deepEqual(parse('010325', {locale}), date('2025-03-01'));
    }
});

test('localized relative days and optional editor prefix', () => {
    const cases = [['oggi', 'today', '2026-09-11'], ['ieri', 'yesterday', '2026-09-10'],
        ['domani', 'tomorrow', '2026-09-12'], ['oggi-3', 'today-3', '2026-09-08'],
        ['oggi + 15', 'today + 15', '2026-09-26']];
    for (const [it, en, expected] of cases) {
        assert.deepEqual(parse(it), date(expected));
        assert.deepEqual(parse(en, {locale: 'en'}), date(expected));
    }
    assert.deepEqual(parse(' / OGGI  +  15 '), date('2026-09-26'));
});

test('relative weeks and months share calculations across languages', () => {
    const cases = [
        ['settimana', 'week', '2026-09-07', '2026-09-13'],
        ['settimana prossima', 'next week', '2026-09-14', '2026-09-20'],
        ['settimana scorsa', 'last week', '2026-08-31', '2026-09-06'],
        ['questa settimana + 2', 'this week + 2', '2026-09-21', '2026-09-27'],
        ['mese', 'month', '2026-09-01', '2026-09-30'],
        ['mese prossimo', 'next month', '2026-10-01', '2026-10-31'],
        ['mese scorso', 'last month', '2026-08-01', '2026-08-31'],
        ['questo mese - 12', 'this month - 12', '2025-09-01', '2025-09-30'],
        ['mese prossimo + 4', 'next month + 4', '2027-02-01', '2027-02-28'],
    ];
    for (const [it, en, start, end] of cases) {
        assert.deepEqual(parse(it), period(start, end), it);
        assert.deepEqual(parse(en, {locale: 'en'}), period(start, end), en);
    }
});

test('month names, abbreviations and quarters use explicit or reference years', () => {
    for (const text of ['marzo', 'mar', 'mar.', 'marzo 26']) assert.deepEqual(parse(text), period('2026-03-01', '2026-03-31'));
    assert.deepEqual(parse('december', {locale: 'en'}), period('2026-12-01', '2026-12-31'));
    assert.deepEqual(parse('february 24', {locale: 'en'}), period('2024-02-01', '2024-02-29'));
    for (const text of ['T2', '2 trimestre', '2° trimestre', '2º trimestre', '2o trimestre']) {
        assert.deepEqual(parse(text), period('2026-04-01', '2026-06-30'));
    }
    for (const text of ['Q2', '2 quarter', '2nd quarter']) {
        assert.deepEqual(parse(text, {locale: 'en'}), period('2026-04-01', '2026-06-30'));
    }
    assert.deepEqual(parse('1 trimestre 2024'), period('2024-01-01', '2024-03-31'));
    assert.deepEqual(parse('4th quarter 25', {locale: 'en'}), period('2025-10-01', '2025-12-31'));
    assert.deepEqual(parse('2024'), period('2024-01-01', '2024-12-31'));
});

test('weekdays refer to the Monday–Sunday week containing workdate', () => {
    for (const text of ['lunedì', 'LUNEDI', 'lun.']) assert.deepEqual(parse(text), date('2026-09-07'));
    assert.deepEqual(parse('sunday', {locale: 'en'}), date('2026-09-13'));
    assert.deepEqual(parse('monday', {locale: 'en', workdate: '2026-09-13'}), date('2026-09-07'));
});

test('explicit closed ranges select outside period boundaries', () => {
    for (const text of ['da marzo a giugno', 'dal marzo al giugno', 'tra marzo e giugno', 'marzo;giugno']) {
        assert.deepEqual(parse(text), period('2026-03-01', '2026-06-30'));
    }
    assert.deepEqual(parse('between Q1 and Q2', {locale: 'en'}), period('2026-01-01', '2026-06-30'));
    assert.deepEqual(parse('oggi;oggi'), period('2026-09-11', '2026-09-11'));
    assert.deepEqual(parse('da dicembre 2025 a marzo 2026'), period('2025-12-01', '2026-03-31'));
    assert.deepEqual(parse('2026-09-01 to 2026-09-11', {locale: 'en'}), period('2026-09-01', '2026-09-11'));
    assert.equal(parse('da dicembre a marzo').error.code, 'REVERSED_RANGE');
    assert.equal(parse('oggi;ieri').error.code, 'REVERSED_RANGE');
});

test('open intervals retain null endpoints without invented dates', () => {
    for (const text of ['da marzo', 'marzo;']) assert.deepEqual(parse(text), period('2026-03-01', null));
    for (const text of ['al marzo', ';marzo']) assert.deepEqual(parse(text), period(null, '2026-03-31'));
    assert.deepEqual(parse('from march', {locale: 'en'}), period('2026-03-01', null));
    assert.deepEqual(parse('to march', {locale: 'en'}), period(null, '2026-03-31'));
    for (const text of ['sempre', 'senza periodo', '-', ';']) assert.deepEqual(parse(text), period(null, null));
    assert.deepEqual(parse('always', {locale: 'en'}), period(null, null));
});

test('calendar arithmetic covers leap centuries and year/month boundaries', () => {
    const cases = [
        ['oggi+1', '2024-02-28', '2024-02-29'], ['oggi+1', '2024-02-29', '2024-03-01'],
        ['oggi-1', '2025-03-01', '2025-02-28'], ['oggi+1', '2026-12-31', '2027-01-01'],
        ['oggi-1', '2026-01-01', '2025-12-31'], ['oggi+1', '2000-02-28', '2000-02-29'],
        ['oggi+1', '1900-02-28', '1900-03-01'], ['oggi+1', '0099-12-31', '0100-01-01'],
    ];
    for (const [text, workdate, expected] of cases) assert.deepEqual(parse(text, {workdate}), date(expected));
    assert.deepEqual(parse('mese prossimo', {workdate: '2024-01-31'}), period('2024-02-01', '2024-02-29'));
    assert.deepEqual(parse('settimana', {workdate: '2027-01-01'}), period('2026-12-28', '2027-01-03'));
    assert.deepEqual(parse('oggi+146097', {workdate: '2000-03-01'}), date('2400-03-01'));
});

test('two-digit year window is deterministic and configurable', () => {
    assert.deepEqual(parse('010146'), date('2046-01-01'));
    assert.deepEqual(parse('010147'), date('1947-01-01'));
    assert.deepEqual(parse('010127', {twoDigitYearAhead: 0}), date('1927-01-01'));
    assert.deepEqual(parse('010100', {workdate: '2095-01-01'}), date('2100-01-01'));
});

test('invalid, incomplete and unsupported text never produces a date', () => {
    for (const text of ['31/02/2026', '290225', '1900-02-29', '0000-01-01', '2026-13-01', 'oggi+999999999999999999']) {
        assert.equal(parse(text).error.code, 'INVALID_DATE', text);
    }
    for (const text of ['1', '01/', 'oggi+', '1 T', 'hello', 'todayish', 'Q5', '1st quarter extra', '01/03-2026', '2026-09-11T12:30', '//oggi', 'oggi,domani']) {
        assert.equal(parse(text).error.code, 'UNRECOGNIZED_EXPRESSION', text);
    }
    assert.equal(parse('oggi;domani;ieri').error.code, 'INVALID_RANGE');
    assert.equal(parse(' ').error.code, 'EMPTY_EXPRESSION');
    assert.equal(parse(42).error.code, 'INVALID_INPUT');
    assert.equal(parseDateExpression('oggi').error.code, 'INVALID_CONTEXT');
    assert.equal(parse('oggi', {workdate: new Date()}).error.code, 'INVALID_CONTEXT');
    assert.equal(parse('oggi', {locale: 'fr'}).error.code, 'INVALID_CONTEXT');
    assert.equal(parse('oggi', {twoDigitYearAhead: 100}).error.code, 'INVALID_CONTEXT');
    assert.equal(parse('oggi', {workdate: '2026-02-30'}).error.code, 'INVALID_CONTEXT');
    assert.equal(parse('ieri', {workdate: '0001-01-01'}).error.code, 'INVALID_DATE');
    assert.equal(parse('domani', {workdate: '9999-12-31'}).error.code, 'INVALID_DATE');
});

test('parser leaves caller context untouched and has no DOM requirement', () => {
    const options = Object.freeze({...context});
    assert.deepEqual(parseDateExpression('oggi', options), date(context.workdate));
    assert.equal(typeof document, 'undefined');
});
