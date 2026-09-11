// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Bag, BagResolver} from 'genro-bag-js';

/** JSON keys remain literal, including dots in operation IDs and schema names. */
export function jsonBag(value) {
    if (value === null || typeof value !== 'object' || value instanceof Bag) return value;
    const bag = new Bag();
    Object.defineProperty(bag, '_jsonArray', {value:Array.isArray(value)});
    for (const [key, item] of Object.entries(value)) bag.setItem([Array.isArray(value) ? `r_${key}` : key], jsonBag(item));
    return bag;
}
export function plainJson(value) {
    if (Array.isArray(value)) return value.map(plainJson);
    if (!(value instanceof Bag)) return value;
    if (value._jsonArray) return value.getNodes().map(node => plainJson(node.getValue()));
    return Object.fromEntries(value.getNodes().map(node => [node.label, plainJson(node.getValue())]));
}

export class UrlResolver extends BagResolver {
    static classKwargs = {cacheTime:300, readOnly:false, asBag:false, retryPolicy:null, timeout:30};
    constructor(url, options = {}) { super({...options, url}); }
    async load(options) {
        const url = new URL(options.url, globalThis.document?.baseURI);
        for (const [key, value] of Object.entries(plainJson(options.qs) || {})) {
            if (value == null) continue;
            for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, String(item));
        }
        const controller = new AbortController();
        const abort = () => controller.abort(options.signal?.reason);
        if (options.signal?.aborted) abort();
        else options.signal?.addEventListener('abort', abort, {once:true});
        const timer = options.timeout > 0 ? setTimeout(() => controller.abort(new Error('Request timed out')), options.timeout * 1000) : null;
        try {
            const headers = new Headers(plainJson(options.headers) || {});
            const init = {method:options.method || 'GET', headers, signal:controller.signal};
            if (options.body !== undefined) {
                if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
                init.body = JSON.stringify(plainJson(options.body));
            }
            const started = performance.now();
            const response = await fetch(url, init);
            if (!response.ok && !options.envelope) throw new Error(`HTTP ${response.status} ${response.statusText}`);
            const text = await response.text();
            let value = text;
            if (options.responseType !== 'text') {
                if (!text) value = null;
                else {try {value = JSON.parse(text);} catch (error) {if (options.responseType !== 'auto') throw error;}}
            }
            if (options.envelope) return jsonBag({status:response.status, statusText:response.statusText,
                ok:response.ok, duration:Math.round(performance.now()-started),
                headers:Object.fromEntries(response.headers), body:value, text});
            return options.raw ? value : jsonBag(value);
        } finally {
            if (timer) clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
        }
    }
}

/** Discover an OpenAPI 3 JSON document; discovery never invokes its operations. */
export class OpenApiResolver extends UrlResolver {
    static classKwargs = {...UrlResolver.classKwargs, cacheTime:-1};
    async load(options) {
        const spec = await super.load({...options, raw:true, method:'GET', body:undefined});
        if (!spec || !/^3\./.test(spec.openapi || '') || !spec.paths || typeof spec.paths !== 'object') {
            throw new Error('Expected an OpenAPI 3.x JSON document with paths');
        }
        this.document = spec;
        const specUrl = new URL(options.url, globalThis.document?.baseURI).href;
        const result = new Bag();
        result.setItem('info', spec.info?.description || '', {title:spec.info?.title || '', version:spec.info?.version || ''});
        for (const key of ['servers', 'externalDocs', 'components', 'security']) if (spec[key] != null) result.setItem(key, jsonBag(spec[key]));
        result.setItem('spec', jsonBag(spec));
        const api = new Bag();
        result.setItem('api', api);
        const tagBag = name => {
            let node = api.getNode([name]);
            if (!node) {api.setItem([name], new Bag(), {name}); node = api.getNode([name]);}
            return node.getValue();
        };
        for (const tag of spec.tags || []) {
            tagBag(tag.name);
            api.getNode([tag.name]).setAttr({description:tag.description || ''});
        }
        for (const [path, pathItem] of Object.entries(spec.paths)) {
            for (const method of ['get','post','put','delete','patch','options','head','trace']) {
                const operation = pathItem[method];
                if (!operation) continue;
                const server = (operation.servers || pathItem.servers || spec.servers || [])[0] || {url:'/'};
                let base = server.url;
                base = base.replace(/\{([^}]+)\}/g, (all, name) => server.variables?.[name]?.default ?? all);
                const fullUrl = new URL(base, specUrl).href.replace(/\/$/, '') + path;
                const id = operation.operationId || `${method}_${path}`;
                const parameters = new Map();
                for (const parameter of [...(pathItem.parameters || []), ...(operation.parameters || [])]) {
                    parameters.set(`${parameter.in}:${parameter.name}`, parameter);
                }
                for (const tag of operation.tags?.length ? operation.tags : ['untagged']) {
                    const group = tagBag(tag);
                    if (group.getNode([id])) throw new Error(`Duplicate operationId '${id}' in tag '${tag}'`);
                    const op = jsonBag({...operation, operationId:id, method, path, url:fullUrl});
                    op.setItem('parameters', jsonBag([...parameters.values()]));
                    const qs = new Bag();
                    for (const param of parameters.values()) if (param.in === 'query') qs.setItem([param.name], null);
                    op.setItem('qs', qs);
                    if (operation.security == null && spec.security) op.setItem('security', jsonBag(spec.security));
                    group.setItem([id], op, {caption:operation.summary || id, method, path});
                }
            }
        }
        return result;
    }
    /** Explicit opt-in invocation. Loading or inspecting a schema cannot call an endpoint. */
    operationResolver(operation, {pathParams = {}, ...options} = {}) {
        let url = operation.getItem('url');
        url = url.replace(/\{([^}]+)\}/g, (_, name) => {
            if (pathParams[name] == null) throw new Error(`Missing path parameter '${name}'`);
            return encodeURIComponent(String(pathParams[name]));
        });
        return new UrlResolver(url, {method:operation.getItem('method'), qs:operation.getItem('qs'),
            cacheTime:operation.getItem('method') === 'get' ? 20 : 0, ...options});
    }
}
