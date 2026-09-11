// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {UrlResolver, OpenApiResolver, jsonBag} from './http.js';

/** Source-owned asynchronous Data loads; only the latest request can publish. */
export class ResolverService {
    constructor(app) { this.app = app; this.requests = new Map(); }
    cancel(node) { this.requests.get(node)?.controller.abort(); this.requests.delete(node); }
    dispose() { for (const node of this.requests.keys()) this.cancel(node); }
    async load(node, kind, options) {
        this.cancel(node);
        if (!options.url || this.app._disposed) return;
        const controller = new AbortController();
        const request = {controller};
        this.requests.set(node, request);
        const current = () => !this.app._disposed && this.requests.get(node) === request;
        const write = (path, value) => this.app.data.setItem(node.absDatapath(path), value);
        const status = (state, error = null) => {if (options.status) write(options.status, jsonBag({state,error}));};
        // Startup controllers run while the application is still mounting.
        await Promise.resolve();
        if (!current()) return;
        this.app.live(() => status('loading'));
        try {
            const Type = kind === 'openapi' ? OpenApiResolver : UrlResolver;
            const resolver = new Type(options.url, {...options, signal:controller.signal});
            let result = await resolver.resolve();
            if (!current()) return;
            this.app.live(() => {
                if (options._onResult) {
                    const transformed = this.app._recipeRuntime.evaluate(node, options._onResult, {result});
                    if (transformed !== undefined) result = transformed;
                }
                write(options.destination, result);
                status('ready');
            });
            return result;
        } catch (error) {
            if (!current()) return;
            this.app.live(() => {
                status('error', error.message);
                if (options._onError) this.app._recipeRuntime.evaluate(node, options._onError, {error});
            });
        }
    }
}

/** Compile nested bindings to ordinary dataController parameters. */
export function resolverDeclaration(kind, destination, url, options = {}) {
    if (typeof destination !== 'string' || !destination.trim()) throw new Error('Resolver destination must be a non-empty data path');
    const bindings = {};
    const encode = (value, bind = true) => {
        if (bind && typeof value === 'string' && /^[\^=][^=]/.test(value)) {
            const name = `resolverArg${Object.keys(bindings).length}`;
            bindings[name] = value;
            return name;
        }
        if (Array.isArray(value)) return `[${value.map(item=>encode(item)).join(',')}]`;
        if (value && typeof value === 'object') return `{${Object.entries(value).map(([k,v])=>`${JSON.stringify(k)}:${encode(v)}`).join(',')}}`;
        return JSON.stringify(value);
    };
    const {_on_start = true, ...parameters} = options;
    const props = {destination, url, ...parameters};
    const encoded = Object.entries(props).map(([key,value]) => `${JSON.stringify(key)}:${encode(value, !['destination','status','_onResult','_onError'].includes(key))}`).join(',');
    return {func:`genro.resolvers.load(this, ${JSON.stringify(kind)}, {${encoded}});`, _on_start, ...bindings};
}
