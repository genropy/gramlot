// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Installation and execution of local dataSetter/formula/controller nodes. */
import {SourceBag, wrapSource} from '../source-bag.js';
import {compileFunctionText, evaluateExpression, executeScript, isFunctionText} from './expression.js';

export const DATA_ELEMENT_FIELDS = new Set([
    'destination', 'formula', 'func', '_on_start', '_delay',
]);
export const RPC_ELEMENT_FIELDS = new Set([
    'destination', 'method', '_on_start', '_onCalling', '_onResult', '_onError',
    '_timeout', '_delay', '_lockScreen',
]);

export class LogicRuntime {
    constructor(builder) {
        this.builder = builder;
        this.installed = new WeakSet();
        this.executing = new Set();
    }

    _walk(value, output = []) {
        if (value instanceof SourceBag) {
            for (const node of value.getNodes()) {
                output.push(node);
                this._walk(node.getValue(), output);
            }
        }
        return output;
    }

    /** One installation: setters, missing-only defaults, provider subscriptions,
     * then explicitly requested pre-build providers. */
    prepareBranch(branch) {
        this.prepareBranches([branch]);
    }

    /** Prepare a source mutation batch as one branch. Nodes removed before
     * the flush are excluded by intersecting with the builder's live source. */
    prepareBranches(branches) {
        const live = new Set(this._walk(this.builder.source));
        const candidates = [];
        const seen = new Set();
        for (const branch of branches) {
            const nodes = this._walk(branch instanceof SourceBag ? branch : branch.getValue(),
                branch instanceof SourceBag ? [] : [branch]);
            for (const node of nodes) {
                if (live.has(node) && !seen.has(node)) {
                    seen.add(node);
                    candidates.push(node);
                }
            }
        }
        const fresh = candidates.filter(node => !this.installed.has(node));
        for (const node of fresh) {
            if (node.nodeTag === 'dataSetter') {
                this.compute(node);
                this.installed.add(node);
            }
        }
        for (const node of fresh) this.builder._defaults.initializeNode(node);
        const providers = fresh.filter(node =>
            ['dataFormula', 'dataController', 'dataRpc', 'remoteSource'].includes(node.nodeTag));
        for (const node of fresh) {
            if (node.nodeTag !== 'dataSetter' && !providers.includes(node)) {
                this.installed.add(node);
            }
        }
        // Register ^ dependencies even when startup is opt-in.
        for (const node of providers) {
            if (['dataRpc', 'remoteSource'].includes(node.nodeTag)) {
                const service = node.handler?.application?.server;
                if (!service) throw new Error(`${node.nodeTag} requires an Application RPC service`);
                service.prepareProvider(node, node.nodeTag === 'remoteSource' ? 'source' : 'data');
            }
            this.builder._bindings(node);
        }
        const startup = providers.filter(node => node.getAttr('_on_start'));
        for (const node of providers) {
            if (!startup.includes(node)) this.installed.add(node);
        }
        this._runStartup(startup);
    }

    _runStartup(nodes) {
        const formulas = nodes.filter(node => node.nodeTag === 'dataFormula');
        const formulaSet = new Set(formulas);
        const byDestination = new Map(formulas.map(node => [node.absDatapath(node.getAttr('destination')), node]));
        const visiting = new Set(), done = new Set(), ordered = [];
        const visit = node => {
            if (done.has(node)) return;
            if (visiting.has(node)) throw new Error('dataFormula startup dependency cycle');
            visiting.add(node);
            for (const [key, pointer] of Object.entries(node.getAttr() || {})) {
                if (DATA_ELEMENT_FIELDS.has(key) || !node.pointerType(pointer)) continue;
                const dependency = byDestination.get(node.absDatapath(pointer));
                if (dependency && formulaSet.has(dependency)) visit(dependency);
            }
            visiting.delete(node);
            done.add(node);
            ordered.push(node);
        };
        for (const node of formulas) visit(node);
        for (const node of ordered) {
            this.compute(node);
            this.installed.add(node);
        }
        for (const node of nodes) {
            if (node.nodeTag === 'dataController') {
                this.compute(node);
                this.installed.add(node);
            }
            if (['dataRpc', 'remoteSource'].includes(node.nodeTag)) {
                this.compute(node);
                this.installed.add(node);
            }
        }
    }

    _namedFunction(code) {
        if (typeof code !== 'string') return null;
        for (const source of this.builder.dataLogic) {
            const holder = typeof source === 'function' ? source : source.constructor;
            if (typeof holder[code] === 'function') return holder[code];
        }
        return null;
    }

    _formula(node, code, bindings) {
        if (typeof code === 'function') return code(bindings);
        const named = this._namedFunction(code);
        if (named) return named(bindings);
        if (isFunctionText(code)) return compileFunctionText(code)(bindings);
        return evaluateExpression(node, code, bindings);
    }

    _controller(node, code, bindings) {
        if (typeof code === 'function') return code(node, bindings);
        const named = this._namedFunction(code);
        if (named) return named(node, bindings);
        if (isFunctionText(code)) return compileFunctionText(code)(node, bindings);
        return executeScript(node, code, {...bindings, sourceNode: node,
            wrapSource, genro: node.handler?.application});
    }

    resolve(node) {
        const attr = node.getAttr() || {};
        if (node.nodeTag === 'dataFormula') {
            return bindings => this._formula(node, attr.formula, bindings);
        }
        return (context, bindings) => this._controller(context, attr.func, bindings);
    }

    compute(node, trigger = null, extra = {}) {
        if (this.builder._disposed) return;
        // Reject while occupied at the trigger boundary, never queue for later.
        if (node.nodeTag === 'dataRpc' && node.rpcPending) {
            node.handler?.application?.feedback.busy(node);
            return Promise.resolve({status: 'busy'});
        }
        const [, values] = this.builder.runtimeValues(node);
        const delay = values._delay;
        if (node.nodeTag !== 'dataSetter' && delay != null && delay !== false && delay !== 0 && delay !== 'auto') {
            node.delayedCall(() => {
                node.pendingFire = null;
                node.handler.application.live(() => this.computeNow(node, trigger, extra));
            }, delay, 'provider');
            node.pendingFire = node._delayedCalls.get('provider');
            return;
        }
        return this.computeNow(node, trigger, extra);
    }

    computeNow(node, trigger = null, extra = {}) {
        if (this.builder._disposed) return;
        const attr = node.getAttr() || {};
        if (node.nodeTag === 'dataSetter') {
            const attrs = {};
            for (const [key, value] of Object.entries(attr)) {
                if (!['destination', 'formula', 'func', 'value', '_on_start'].includes(key)
                    && !key.startsWith('_')) attrs[key] = value;
            }
            node.setRelativeData(attr.destination, attr.value, {
                attributes: Object.keys(attrs).length ? attrs : null,
            });
        } else if (node.nodeTag === 'dataFormula') {
            if (Object.hasOwn(attr, 'func')) throw new Error('dataFormula requires formula; func is not supported');
            if (typeof attr.formula !== 'string' && typeof attr.formula !== 'function') {
                throw new Error('dataFormula requires formula');
            }
            node.setRelativeData(attr.destination, this._formula(node, attr.formula, this.builder._bindings(node)));
        } else if (node.nodeTag === 'dataController') {
            if (typeof attr.func !== 'string' && typeof attr.func !== 'function') {
                throw new Error('dataController requires func');
            }
            if (this.executing.has(node)) {
                throw new Error('dataController reactive execution cycle');
            }
            this.executing.add(node);
            try {
                this._controller(node, attr.func, {...this.builder._bindings(node),
                    ...extra, sourceNode: node, genro: node.handler?.application,
                    _triggerpars: trigger, _reason: trigger?.trigger_reason ?? null});
            } finally {
                this.executing.delete(node);
            }
        } else if (node.nodeTag === 'dataRpc') {
            if (typeof attr.method !== 'string' || !attr.method) {
                throw new Error('dataRpc requires method');
            }
            return node.handler?.application?.server.invokeProvider(
                node, this.builder._bindings(node),
            );
        } else if (node.nodeTag === 'remoteSource') {
            if (typeof attr.method !== 'string' || !attr.method) {
                throw new Error('remoteSource requires method');
            }
            return node.handler?.application?.server.invokeSourceProvider(
                node, this.builder._bindings(node),
            );
        }
    }

    disposeNode(node) {
        if (['dataRpc', 'remoteSource'].includes(node.nodeTag)) {
            node.handler?.application?.server.cancel(node);
        }
        this.builder.handler?._unregisterPointer(node);
    }
}
