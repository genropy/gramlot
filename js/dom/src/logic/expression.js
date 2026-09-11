// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Shared evaluator for inline attributes and local logical declarations. */

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const FUNCTION_TEXT = /^(?:async\s+)?(?:function\b|\(?\s*[A-Za-z_$][\w$]*(?:\s*,[^)]*)?\)?\s*=>|\([^)]*\)\s*=>)/;
const RESERVED = new Set([
    'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
    'finally', 'for', 'function', 'if', 'implements', 'import', 'in',
    'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private',
    'protected', 'public', 'return', 'static', 'super', 'switch', 'this',
    'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
]);

const expressionCache = new Map();
const inlineExpressionCache = new Map();
const scriptCache = new Map();
const functionCache = new Map();

function argumentNames(values) {
    return Object.keys(values).filter(name => IDENTIFIER.test(name) && !RESERVED.has(name));
}

function compiled(cache, kind, code, names, body) {
    const cacheKey = `${kind}\0${names.join('\0')}\0${code}`;
    let fn = cache.get(cacheKey);
    if (!fn) {
        // eslint-disable-next-line no-new-func
        fn = new Function(...names, `"use strict"; ${body}`);
        cache.set(cacheKey, fn);
    }
    return fn;
}

export function isFunctionText(code) {
    return typeof code === 'string' && FUNCTION_TEXT.test(code.trim());
}

export function evaluateExpression(node, code, values = {}) {
    const names = argumentNames(values);
    const fn = compiled(expressionCache, 'expression', code, names, `return (${code});`);
    return fn.call(node, ...names.map(name => values[name]));
}

function compileInlineExpression(code) {
    let fn = inlineExpressionCache.get(code);
    if (!fn) {
        // `with` is confined to this non-strict factory. The returned closure
        // is strict and retains the lazy scope in its lexical environment.
        // eslint-disable-next-line no-new-func
        fn = new Function('scope', `
            return (function () {
                with (scope) {
                    return function () { "use strict"; return (${code}); };
                }
            }).call(this).call(this);
        `);
        inlineExpressionCache.set(code, fn);
    }
    return fn;
}

export function executeScript(node, code, values = {}) {
    const names = argumentNames(values);
    const fn = compiled(scriptCache, 'script', code, names, code);
    return fn.call(node, ...names.map(name => values[name]));
}

export function compileFunctionText(code) {
    let fn = functionCache.get(code);
    if (!fn) {
        // eslint-disable-next-line no-new-func
        fn = new Function(`"use strict"; return (${code});`)();
        if (typeof fn !== 'function') throw new Error('logic function text did not evaluate to a function');
        functionCache.set(code, fn);
    }
    return fn;
}

/** Resolve == peers in dependency order. Other attributes are available by name. */
export function resolveInlineExpressions(node, entries) {
    const values = new Map(entries);
    const expressions = new Map();
    for (const [name, value] of values) {
        if (typeof value === 'string' && value.startsWith('==')) {
            expressions.set(name, value.slice(2));
            values.delete(name);
        }
    }
    if (!expressions.size) return values;

    const visiting = new Set();
    const done = new Set();
    const resolve = name => {
        if (done.has(name)) return values.get(name);
        if (visiting.has(name)) {
            throw new Error(`inline expression cycle at '${String(name)}'`);
        }
        visiting.add(name);
        const code = expressions.get(name);
        const peerNames = new Set([...values.keys(), ...expressions.keys()].filter(key => typeof key === 'string'));
        const scope = new Proxy(Object.create(null), {
            has: (_target, key) => typeof key === 'string' && peerNames.has(key),
            get: (_target, key) => {
                if (key === Symbol.unscopables) return undefined;
                if (expressions.has(key)) return resolve(key);
                return values.get(key);
            },
        });
        try {
            values.set(name, compileInlineExpression(code).call(node, scope));
        } catch (error) {
            if (error.message?.startsWith('inline expression cycle')) throw error;
            throw new Error(`inline expression '${String(name)}' failed: ${error.message}`, {cause: error});
        }
        visiting.delete(name);
        done.add(name);
        return values.get(name);
    };
    for (const name of expressions.keys()) resolve(name);
    return values;
}
