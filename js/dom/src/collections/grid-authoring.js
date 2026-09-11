// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Bag} from 'genro-bag-js';

/** Return an ordinary transportable Bag with legacy structure authoring helpers. */
export function GridStruct() {
    const bag = new Bag();
    const label = tag => {
        let index = 0;
        while (bag.getNode(`${tag}_${index}`)) index++;
        return `${tag}_${index}`;
    };
    const branch = (tag, attrs) => {
        const child = new GridStruct();
        bag.setItem(label(tag), child, {...attrs, tag});
        return child;
    };
    Object.defineProperties(bag, {
        view:{value:(attrs = {}) => branch('view', attrs)},
        rows:{value:(attrs = {}) => branch('rows', attrs)},
        cell:{value:(field, attrs = {}) => {
            const key = label('cell');
            bag.setItem(key, '', {...attrs, tag:'cell', field, name:attrs.name || field});
            return bag.getNode(key);
        }},
    });
    return bag;
}
