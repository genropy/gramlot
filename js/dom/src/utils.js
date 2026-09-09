// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

/**
 * Check if a value is a Bag instance (duck typing via _htraverse).
 *
 * @param {*} value - Value to check.
 * @returns {boolean} True if value is a Bag.
 */
export function isBag(value) {
    return value !== null && typeof value === 'object' && typeof value._htraverse === 'function';
}
