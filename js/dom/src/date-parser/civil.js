// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Gregorian civil calendar arithmetic. No clock, timezone, or Date object.
export function daysInMonth(year, month) {
    if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function civil(year, month, day) {
    if (![year, month, day].every(Number.isInteger) || year < 1 || year > 9999 ||
        month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
        throw new RangeError('Date must exist in Gregorian years 0001–9999.');
    }
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parts(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new RangeError('Expected a civil date in YYYY-MM-DD format.');
    }
    const result = date.split('-').map(Number);
    civil(...result);
    return result;
}

function ordinal(year, month, day) {
    const previous = year - 1;
    let result = 365 * previous + Math.floor(previous / 4) - Math.floor(previous / 100) +
        Math.floor(previous / 400) + day - 1;
    for (let m = 1; m < month; m++) result += daysInMonth(year, m);
    return result;
}

export function addDays(date, offset) {
    let target = ordinal(...parts(date)) + offset;
    if (!Number.isSafeInteger(target) || target < 0 || target > ordinal(9999, 12, 31)) {
        throw new RangeError('Date offset exceeds Gregorian years 0001–9999.');
    }
    // Binary search keeps arbitrarily large supported offsets bounded.
    let low = 1, high = 10000;
    while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (ordinal(middle, 1, 1) <= target) low = middle;
        else high = middle;
    }
    target -= ordinal(low, 1, 1);
    let month = 1;
    while (target >= daysInMonth(low, month)) target -= daysInMonth(low, month++);
    return civil(low, month, target + 1);
}

export function monday(date) {
    return addDays(date, -(ordinal(...parts(date)) % 7));
}

export function monthPeriod(year, month, offset = 0, count = 1) {
    const index = year * 12 + month - 1 + offset;
    const y = Math.floor(index / 12), m = ((index % 12) + 12) % 12 + 1;
    const endIndex = index + count - 1;
    const ey = Math.floor(endIndex / 12), em = ((endIndex % 12) + 12) % 12 + 1;
    return {start: civil(y, m, 1), end: civil(ey, em, daysInMonth(ey, em))};
}
