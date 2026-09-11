// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Resident grid formula lifecycle, including Decimal-backed arithmetic. */
import {getDecimalLibrary, isDecimal} from 'genro-tytx';

let managerSerial = 0;

function identifiers(code) {
    return new Set(String(code).match(/[A-Za-z_$][\w$]*/g) || []);
}

function compileJavascript(code) {
    // This intentionally retains the legacy JavaScript-expression contract.
    // eslint-disable-next-line no-new-func
    return new Function('scope', `with (scope) { return (${code}); }`);
}

function tokenize(code) {
    const result = [];
    let offset = 0;
    while (offset < code.length) {
        const rest = code.slice(offset);
        const whitespace = /^\s+/.exec(rest);
        if (whitespace) { offset += whitespace[0].length; continue; }
        const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
        if (number) { result.push({type:'number', value:number[0]}); offset += number[0].length; continue; }
        const name = /^[A-Za-z_$][\w$]*/.exec(rest);
        if (name) { result.push({type:'name', value:name[0]}); offset += name[0].length; continue; }
        const operator = /^(?:\*\*|[()+\-*/%])/.exec(rest);
        if (operator) { result.push({type:'operator', value:operator[0]}); offset += operator[0].length; continue; }
        throw new SyntaxError(`unsupported Decimal formula token at ${offset}`);
    }
    result.push({type:'eof', value:''});
    return result;
}

function compileDecimal(code) {
    const tokens = tokenize(code);
    let position = 0;
    const peek = () => tokens[position];
    const take = value => {
        if (peek().value !== value) throw new SyntaxError(`expected '${value}' in Decimal formula`);
        return tokens[position++];
    };
    const primary = () => {
        const token = peek();
        if (token.type === 'number') { position++; return {kind:'number', value:token.value}; }
        if (token.type === 'name') { position++; return {kind:'name', value:token.value}; }
        if (token.value === '(') { position++; const node = expression(0); take(')'); return node; }
        if (token.value === '+' || token.value === '-') {
            position++;
            return {kind:'unary', operator:token.value, child:primary()};
        }
        throw new SyntaxError(`unexpected '${token.value || 'end'}' in Decimal formula`);
    };
    const precedence = {'+':1, '-':1, '*':2, '/':2, '%':2, '**':3};
    const expression = minimum => {
        let left = primary();
        while (precedence[peek().value] >= minimum) {
            const operator = tokens[position++].value;
            const right = expression(precedence[operator] + (operator === '**' ? 0 : 1));
            left = {kind:'binary', operator, left, right};
        }
        return left;
    };
    const ast = expression(0);
    if (peek().type !== 'eof') throw new SyntaxError(`unexpected '${peek().value}' in Decimal formula`);
    return ast;
}

function decimalValue(value, Decimal) {
    if (isDecimal(value)) return value;
    if (value == null || value === '') return null;
    if (typeof value !== 'number' && typeof value !== 'string') throw new TypeError('Decimal arithmetic requires numeric values');
    return new Decimal(String(value));
}

function evaluateDecimal(node, scope, Decimal) {
    if (node.kind === 'number') return new Decimal(node.value);
    if (node.kind === 'name') {
        if (!Object.hasOwn(scope, node.value)) throw new ReferenceError(`${node.value} is not defined`);
        return decimalValue(scope[node.value], Decimal);
    }
    if (node.kind === 'unary') {
        const value = evaluateDecimal(node.child, scope, Decimal);
        if (value == null) return null;
        return node.operator === '-' ? value.neg() : value;
    }
    const left = evaluateDecimal(node.left, scope, Decimal);
    const right = evaluateDecimal(node.right, scope, Decimal);
    if (left == null || right == null) return null;
    if (node.operator === '**') return left.pow(Number(right.toString()));
    const method = ({'+':'plus', '-':'minus', '*':'times', '/':'div', '%':'mod'})[node.operator];
    return left[method](right);
}

function sameValue(left, right) {
    if (Object.is(left, right)) return true;
    if (isDecimal(left) && isDecimal(right)) {
        try { return left.eq(right); } catch { return false; }
    }
    return false;
}

function addNumeric(left, right) {
    if (right == null || right === '') return left;
    if (isDecimal(left) || isDecimal(right)) {
        if (getDecimalLibrary() === 'number') throw new Error('A Decimal backend is required for exact grid formulas');
        const Decimal = isDecimal(left) ? left.constructor : right.constructor;
        return decimalValue(left, Decimal).plus(decimalValue(right, Decimal));
    }
    if (typeof right !== 'number' || !Number.isFinite(right)) throw new TypeError('Grid aggregate formulas require numeric values');
    return left + right;
}

function dividePercent(value, total) {
    const zero = isDecimal(total) ? total.eq(0) : Object.is(total, 0);
    if (value == null || value === '' || total == null || total === '' || zero) return null;
    if (isDecimal(value) || isDecimal(total)) {
        const Decimal = isDecimal(value) ? value.constructor : total.constructor;
        return decimalValue(value, Decimal).div(decimalValue(total, Decimal)).times(new Decimal(100));
    }
    if (typeof value !== 'number' || typeof total !== 'number') throw new TypeError('Percentage formulas require numeric values');
    return value / total * 100;
}

function eventPath(event) {
    const parts = [...(event?.pathlist || [])];
    if (event?.evt === 'ins' && event.node?.label != null && parts.at(-1) !== event.node.label) parts.push(event.node.label);
    return parts.join('.');
}

export class GridChangeManager {
    constructor(grid) {
        this.grid = grid;
        this.formulas = new Map();
        this.order = [];
        this.triggered = new Map();
        this.parameterPaths = new Map();
        this.errors = new Map();
        this._running = false;
        this._subscriber = `grid-formulas-${++managerSerial}`;
        this._unsubscribeStore = grid.collectionStore()?.subscribe(change => this._storeChanged(change)) || null;
        this._data = grid.sourceNode?.handler?.data || null;
        this._data?.subscribe(this._subscriber, {any:event => this._dataChanged(event)});
    }

    configure(columns) {
        const formulas = new Map();
        for (const column of columns || []) {
            if (typeof column.formula !== 'string') continue;
            const field = String(column.field);
            if (formulas.has(field)) throw new Error(`Duplicate grid formula field '${field}'`);
            const formula = column.formula.trim();
            const special = formula === '#' ? {kind:'index'}
                : formula.startsWith('+=') ? {kind:'running', field:formula.slice(2).trim()}
                : formula.startsWith('%=') ? {kind:'percent', field:formula.slice(2).trim()}
                : null;
            if (special && special.kind !== 'index' && !special.field) throw new Error(`Grid formula '${formula}' requires a field`);
            let javascript = null, compileError = null, decimal = null;
            if (!special) {
                try { javascript = compileJavascript(formula); } catch (error) { compileError = error; }
                try { decimal = compileDecimal(formula); } catch { /* Decimal support is a bounded arithmetic grammar. */ }
            }
            const parameters = new Map();
            for (const [name, raw] of Object.entries(column)) {
                if (name.startsWith('formula_') && name.length > 8) parameters.set(name.slice(8), raw);
            }
            const references = special?.field ? new Set([special.field]) : identifiers(formula);
            formulas.set(field, {field, column, formula, special, javascript, decimal, compileError, parameters, references});
        }
        const {triggered, order} = this._dependencies(formulas);
        this.formulas = formulas;
        this.triggered = triggered;
        this.order = order;
        this.errors.clear();
        this._registerParameters();
        const initial = new Set([...formulas.values()].filter(item => item.column.calculated).map(item => item.field));
        this.recalculate(this._closure(initial));
    }

    _dependencies(formulas) {
        const triggered = new Map();
        for (const definition of formulas.values()) {
            for (const dependency of definition.references) {
                if (!triggered.has(dependency)) triggered.set(dependency, new Set());
                triggered.get(dependency).add(definition.field);
            }
        }
        const visiting = new Set(), visited = new Set(), order = [];
        const visit = field => {
            if (visited.has(field)) return;
            if (visiting.has(field)) throw new Error(`Grid formula dependency cycle at '${field}'`);
            visiting.add(field);
            const definition = formulas.get(field);
            for (const dependency of definition.references) if (formulas.has(dependency)) visit(dependency);
            visiting.delete(field); visited.add(field); order.push(field);
        };
        for (const field of formulas.keys()) visit(field);
        return {triggered, order};
    }

    _registerParameters() {
        this.parameterPaths = new Map();
        const source = this.grid.sourceNode;
        if (!source) return;
        for (const definition of this.formulas.values()) {
            for (const raw of definition.parameters.values()) {
                if (typeof raw !== 'string' || !raw.startsWith('^')) continue;
                const path = source.absDatapath(raw);
                if (!this.parameterPaths.has(path)) this.parameterPaths.set(path, new Set());
                this.parameterPaths.get(path).add(definition.field);
            }
        }
    }

    _closure(fields) {
        const result = new Set(fields);
        const pending = [...fields];
        while (pending.length) {
            for (const dependent of this.triggered.get(pending.shift()) || []) {
                if (!result.has(dependent)) { result.add(dependent); pending.push(dependent); }
            }
        }
        return result;
    }

    _storeChanged(change) {
        if (this._running || change.type === 'error' || !this.formulas.size) return;
        const event = change.event;
        let eventRow = null;
        if (event?.node) {
            const store = this.grid.collectionStore();
            for (let index = 0; index < store.size; index++) {
                const candidate = store.rowAt(index);
                if (candidate.node === event.node || candidate.value === event.node.parentBag) {
                    eventRow = candidate; break;
                }
            }
        }
        const rowStructureChange = ['ins','del'].includes(event?.evt)
            && (!eventRow || eventRow.node === event.node);
        if (change.type === 'reset' || !event || rowStructureChange) {
            const calculated = new Set([...this.formulas.values()].filter(item => item.column.calculated).map(item => item.field));
            const specials = new Set([...this.formulas.values()].filter(item => item.special).map(item => item.field));
            this.recalculate(this._closure(new Set([...calculated, ...specials])));
            return;
        }
        const fields = new Set();
        if (event.evt === 'upd_attrs') for (const name of Object.keys(event.attrs_diff || {})) fields.add(name);
        else if (event.node?.label) fields.add(event.node.label);
        const affected = new Set();
        for (const field of fields) for (const formula of this.triggered.get(field) || []) affected.add(formula);
        const closure = this._closure(affected);
        const global = [...closure].some(field => this.formulas.get(field)?.special);
        this.recalculate(closure, !global && eventRow ? [eventRow] : null);
    }

    _dataChanged(event) {
        if (this._running || !this.parameterPaths.size) return;
        const changed = eventPath(event);
        if (!changed) return;
        const affected = new Set();
        for (const [path, fields] of this.parameterPaths) {
            const plain = path.split('?')[0];
            if (changed === plain || changed.startsWith(`${plain}.`) || plain.startsWith(`${changed}.`)) {
                for (const field of fields) affected.add(field);
            }
        }
        this.recalculate(this._closure(affected));
    }

    _parameters(definition) {
        const source = this.grid.sourceNode;
        const result = {};
        for (const [name, raw] of definition.parameters) {
            result[name] = typeof raw === 'string' && (raw.startsWith('^') || raw.startsWith('='))
                ? source?.handler?.data.getItem(source.absDatapath(raw)) : raw;
        }
        return result;
    }

    _evaluate(definition, row, index, aggregate) {
        if (definition.special?.kind === 'index') return index;
        if (definition.special?.kind === 'running') return addNumeric(aggregate, this.grid.collectionStore().getValue(row.node, definition.special.field));
        if (definition.special?.kind === 'percent') return dividePercent(
            this.grid.collectionStore().getValue(row.node, definition.special.field), aggregate);
        if (definition.compileError) throw definition.compileError;
        const scope = {...this.grid.collectionStore().rowFromItem(row.node), ...this._parameters(definition),
            _currcell:definition.column, _rowNode:row.node};
        for (const field of this.formulas.keys()) {
            if (!Object.hasOwn(scope, field)) scope[field] = this.grid.collectionStore().getValue(row.node, field);
        }
        if ([...definition.references].some(name => Object.hasOwn(scope, name) && scope[name] == null)) return null;
        const referencedDecimals = [...definition.references].some(name => isDecimal(scope[name]));
        if (referencedDecimals) {
            if (getDecimalLibrary() === 'number') throw new Error('A Decimal backend is required for exact grid formulas');
            if (!definition.decimal) throw new Error('Decimal grid formulas support arithmetic expressions only');
            const sample = [...definition.references].map(name => scope[name]).find(isDecimal);
            return evaluateDecimal(definition.decimal, scope, sample.constructor);
        }
        return definition.javascript(scope);
    }

    recalculate(fields, rows = null) {
        if (this._running || !fields?.size || !this.grid.collectionStore()) return;
        this._running = true;
        this.grid._formulaMutationDepth = (this.grid._formulaMutationDepth || 0) + 1;
        try {
            const store = this.grid.collectionStore();
            store.batch(() => {
                for (const field of this.order) {
                    if (!fields.has(field)) continue;
                    const definition = this.formulas.get(field);
                    let aggregate = definition.special?.kind === 'running' ? 0 : null;
                    let fieldError = null;
                    if (definition.special?.kind === 'percent') {
                        aggregate = 0;
                        try {
                            for (let index = 0; index < store.size; index++) {
                                const row = store.rowAt(index);
                                aggregate = addNumeric(aggregate, store.getValue(row.node, definition.special.field));
                            }
                        } catch (error) {
                            aggregate = null; fieldError = error;
                        }
                    }
                    const targets = rows
                        ? rows.map(row => ({row, index:store.getIdxFromPkey(row.key)}))
                        : Array.from({length:store.size}, (_unused, index) => ({row:store.rowAt(index), index}));
                    for (const {row, index} of targets) {
                        let value = null;
                        try {
                            value = this._evaluate(definition, row, index, aggregate);
                            if (definition.special?.kind === 'running') aggregate = value;
                        } catch (error) {
                            value = null; fieldError = error;
                        }
                        if (!sameValue(store.getValue(row.node, field), value)) store.updateRowNode(row.node, {[field]:value});
                    }
                    if (fieldError) this.errors.set(field, fieldError);
                    else this.errors.delete(field);
                }
            });
        } finally {
            this.grid._formulaMutationDepth--;
            this._running = false;
            if (!this.grid._formulaMutationDepth && this.grid._formulaRenderPending) {
                this.grid._formulaRenderPending = false;
                this.grid._storeChanged();
            }
        }
    }

    dispose() {
        this._unsubscribeStore?.(); this._unsubscribeStore = null;
        this._data?.unsubscribe(this._subscriber, {any:true}); this._data = null;
        this.formulas.clear(); this.triggered.clear(); this.parameterPaths.clear(); this.errors.clear();
    }
}
