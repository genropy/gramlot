// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Normalize quick and explicit columns into one small geometry model. */
export function gridColumnsFromStruct(struct) {
    return gridColumnDefinitionsFromStruct(struct).filter(column => !column.hidden);
}

export function gridColumnDefinitionsFromStruct(struct) {
    if (struct == null) return [];
    const views = struct.getNodes().filter(node => node.label !== 'info');
    if (!views.length) return [];
    if (views.length !== 1 || views[0].getValue().getNodes().length > 1) {
        throw new Error('This grid currently supports one structure view and one row');
    }
    const row = views[0].getValue().getNodes()[0];
    const cells = row?.getValue();
    const defaults = Object.fromEntries(['classes', 'cellClasses', 'headerClasses']
        .filter(key => row?.attr[key] != null).map(key => [key, row.attr[key]]));
    return (cells?.getNodes() || []).map(node => ({
        ...defaults, ...node.attr, id:node.label, field:node.attr.field || node.label,
    }));
}

export function normalizeGridColumns(columns) {
    if (!Array.isArray(columns)) throw new TypeError('Grid columns must be an array');
    const ids = new Set();
    return columns.map((source, index) => {
        if (!source || typeof source !== 'object' || !source.field) throw new TypeError(`Grid column ${index} requires a field`);
        const id = String(source.id || source.field);
        if (ids.has(id)) throw new Error(`Duplicate grid column id: ${id}`);
        ids.add(id);
        const width = source.width == null ? 140 : Number(String(source.width).replace(/px$/, ''));
        if (!Number.isFinite(width) || width < 0) throw new RangeError(`Invalid width for grid column '${id}'`);
        return Object.freeze({
            ...source,
            id, field:String(source.field), name:String(source.name ?? source.field), width,
            dtype:source.dtype || null, format:source.format ?? null, mask:source.mask ?? null,
            locale:source.locale || null, places:source.places ?? null,
        });
    });
}

export function layoutGridColumns(columns, viewport) {
    const elastic = columns.filter(column => column.width === 0).length;
    const fixed = columns.reduce((sum, column) => sum + column.width, 0);
    const width = elastic ? Math.max(24, (viewport - fixed) / elastic) : 0;
    return columns.map(column => column.width === 0 ? {...column, width} : column);
}

export function gridTemplate(columns) {
    return columns.map(column => `${column.width}px`).join(' ');
}

export function gridCellValue(row, column, store) {
    return store.getValue(row.node, column.field);
}
