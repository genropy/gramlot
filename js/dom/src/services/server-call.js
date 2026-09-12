// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {fromTytx, toTytx} from 'genro-tytx';

const TYTX_MEDIA_TYPE = 'application/vnd.tytx+json';

export class ServerCallError extends Error {
    constructor(message, {kind = 'transport', status = null, details = null} = {}) {
        super(message);
        this.name = 'ServerCallError';
        this.kind = kind;
        this.status = status;
        this.details = details;
    }
}

/** Shared asynchronous service used by imperative serverCall and dataRpc. */
export class ServerCallService {
    constructor(application, endpoint = null) {
        this.application = application;
        this.endpoint = typeof endpoint === 'string' && endpoint ? endpoint.replace(/\/$/, '') : null;
        this.requests = new Map();
        this.allRequests = new Set();
        this.ownerGenerations = new WeakMap();
    }

    requireCapability(role = 'data') {
        if (!this.endpoint) {
            throw new Error(
                `${role === 'source' ? 'remote Source' : 'dataRpc'} requires a configured `
                + 'Gramlot server; standalone pages cannot install Python services',
            );
        }
    }

    prepareProvider(node, role = 'data') {
        this.requireCapability(role);
        if (Object.hasOwn(node.getAttr() || {}, '_concurrency')) {
            throw new Error('_concurrency is not supported; dataRpc owns one pending call');
        }
    }

    _track(owner, request) {
        this.allRequests.add(request);
        if (!owner) return;
        if (!this.requests.has(owner)) this.requests.set(owner, new Set());
        this.requests.get(owner).add(request);
    }

    _forget(owner, request) {
        this.allRequests.delete(request);
        if (!owner) return;
        const requests = this.requests.get(owner);
        requests?.delete(request);
        if (!requests?.size) this.requests.delete(owner);
    }

    cancel(owner) {
        this.ownerGenerations.set(owner, (this.ownerGenerations.get(owner) || 0) + 1);
        const requests = this.requests.get(owner);
        if (!requests) return;
        this.requests.delete(owner);
        for (const request of requests) request.controller.abort();
    }

    dispose() {
        for (const owner of [...this.requests.keys()]) this.cancel(owner);
        for (const request of this.allRequests) request.controller.abort();
        this.allRequests.clear();
    }

    async call(method, params = {}, options = {}) {
        const role = options.role || 'data';
        if (!['data', 'source'].includes(role)) {
            throw new TypeError("serverCall role must be 'data' or 'source'");
        }
        this.requireCapability(role);
        if (typeof method !== 'string' || !method) {
            throw new TypeError('serverCall requires a nonempty logical method name');
        }
        if (!params || typeof params !== 'object' || Array.isArray(params)) {
            throw new TypeError('serverCall params must be an object');
        }
        const timeout = options.timeout === undefined ? 50000 : Number(options.timeout);
        if (!Number.isFinite(timeout) || timeout < 0) {
            throw new TypeError('serverCall timeout is expressed in nonnegative milliseconds');
        }
        const controller = new AbortController();
        const owner = options.owner || null;
        const request = {controller};
        this._track(owner, request);
        const externalSignal = options.signal;
        const abort = () => controller.abort(externalSignal?.reason);
        if (externalSignal?.aborted) abort();
        else externalSignal?.addEventListener('abort', abort, {once: true});
        const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null;
        try {
            const response = await fetch(
                `${this.endpoint}/${role}/${encodeURIComponent(method)}`, {
                method: 'POST',
                headers: {'Content-Type': TYTX_MEDIA_TYPE, Accept: TYTX_MEDIA_TYPE},
                body: toTytx(params, 'json'),
                signal: controller.signal,
                },
            );
            const body = await response.text();
            let envelope;
            try {
                envelope = fromTytx(body, 'json');
            } catch (error) {
                throw new ServerCallError(`Invalid TYTX RPC response: ${error.message}`, {
                    kind: 'protocol', status: response.status,
                });
            }
            if (!response.ok) {
                throw new ServerCallError(
                    envelope?.error?.message || `RPC HTTP ${response.status}`,
                    {kind: 'http', status: response.status, details: envelope?.error || null},
                );
            }
            if (!envelope || envelope.ok !== true || !Object.hasOwn(envelope, 'result')) {
                throw new ServerCallError(envelope?.error?.message || 'Invalid RPC result envelope', {
                    kind: envelope?.ok === false ? 'application' : 'protocol',
                    status: response.status,
                    details: envelope?.error || null,
                });
            }
            return envelope.result;
        } catch (error) {
            if (error instanceof ServerCallError) throw error;
            if (controller.signal.aborted) {
                throw new ServerCallError('RPC request was cancelled', {kind: 'cancelled'});
            }
            throw new ServerCallError(error.message || 'RPC transport failed', {kind: 'transport'});
        } finally {
            if (timer) clearTimeout(timer);
            externalSignal?.removeEventListener('abort', abort);
            this._forget(owner, request);
        }
    }

    invokeProvider(node, params) {
        this.prepareProvider(node, 'data');
        if (node.rpcPending) {
            this.application.feedback.busy(node);
            return Promise.resolve({status: 'busy'});
        }
        const [, attr] = this.application.builder.runtimeValues(node);
        const kwargs = {...params};
        // Reserve before user hooks: a hook can itself trigger this provider.
        const state = {pending: true, promise: null};
        node._rpcState = state;
        const releaseLock = attr._lockScreen ? this.application.feedback.lock(node) : () => {};
        const generation = this.ownerGenerations.get(node) || 0;
        const obsolete = () => this.application._disposed
            || (this.ownerGenerations.get(node) || 0) !== generation;
        const execute = async () => {
            try {
                if (attr._onCalling) {
                    const proceed = this.application._recipeRuntime.evaluate(
                        node, attr._onCalling, {kwargs, ...kwargs},
                    );
                    if (proceed === false) return {status: 'cancelled'};
                }
                if (obsolete()) return {status: 'obsolete'};
                const result = await this.call(attr.method, kwargs, {
                    owner: node, timeout: attr._timeout, role: 'data',
                });
                if (obsolete()) return {status: 'obsolete'};
                let old;
                this.application.live(() => {
                    if (attr.destination) {
                        const path = node.absDatapath(attr.destination);
                        old = this.application.data.getItem(path);
                        this.application.data.setItem(path, result);
                    }
                    if (attr._onResult) this.application._recipeRuntime.evaluate(
                        node, attr._onResult, {result, kwargs, old},
                    );
                });
                return {status: 'ready', result};
            } catch (error) {
                if (obsolete()) return {status: 'obsolete'};
                if (attr._onError) this.application._recipeRuntime.run(
                    node, attr._onError, {error, kwargs},
                );
                return {status: 'error', error};
            } finally {
                state.pending = false;
                state.completedAt = new Date();
                releaseLock();
            }
        };
        state.promise = execute();
        node._rpcPromise = state.promise;
        return state.promise;
    }

    invokeSourceProvider(node, params) {
        this.prepareProvider(node, 'source');
        const [, attr] = this.application.builder.runtimeValues(node);
        const kwargs = {...params};
        if (attr._onCalling) {
            const proceed = this.application._recipeRuntime.evaluate(
                node, attr._onCalling, {kwargs, ...kwargs},
            );
            if (proceed === false) return Promise.resolve({status: 'cancelled'});
        }
        this.cancel(node);
        const generation = this.ownerGenerations.get(node) || 0;
        const call = this.call(attr.method, kwargs, {
            owner: node, timeout: attr._timeout, role: 'source',
        });
        node._rpcPromise = (async () => {
            try {
                const source = await call;
                if (this.application._disposed
                        || (this.ownerGenerations.get(node) || 0) !== generation) {
                    return {status: 'obsolete'};
                }
                const installed = node.builder.replaceRemoteSource(node, source);
                if (attr._onResult) {
                    this.application._recipeRuntime.run(
                        node, attr._onResult, {source, kwargs, installed},
                    );
                }
                return {status: 'ready', source};
            } catch (error) {
                if (this.application._disposed || error.kind === 'cancelled'
                        || (this.ownerGenerations.get(node) || 0) !== generation) {
                    return {status: 'obsolete'};
                }
                if (attr._onError) {
                    this.application._recipeRuntime.run(node, attr._onError, {error, kwargs});
                }
                return {status: 'error', error};
            }
        })();
        return node._rpcPromise;
    }
}
