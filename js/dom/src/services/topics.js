// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Application-local synchronous topics, coordinated by the genro facade. */
export class TopicService {
    constructor(application) {
        this.application = application;
        this._topics = new Map();
        this._subscriptions = new Set();
        this._disposed = false;
    }

    nodeTopic(node, message) {
        if (typeof message !== 'string' || !message) throw new TypeError('A message must be a non-empty string');
        const identity = node.getAttr('nodeId') || node.getAttr('node_id') || this.application.builder.targetId(node);
        return `${identity}_${message}`;
    }

    subscribe(topic, callback, {signal, sourceNode} = {}) {
        if (typeof topic !== 'string' || !topic) throw new TypeError('A topic must be a non-empty string');
        if (typeof callback !== 'function') throw new TypeError('A subscriber must be a function');
        if (this._disposed || signal?.aborted) return () => {};
        if (sourceNode && !this._liveNodes().includes(sourceNode)) {
            throw new Error('Subscription sourceNode must belong to this application');
        }
        const entries = this._topics.get(topic) || new Set();
        this._topics.set(topic, entries);
        const entry = {callback, sourceNode};
        entries.add(entry);
        let active = true;
        const unsubscribe = () => {
            if (!active) return;
            active = false;
            entries.delete(entry);
            if (!entries.size) this._topics.delete(topic);
            signal?.removeEventListener('abort', unsubscribe);
            this._subscriptions.delete(entry);
        };
        entry.unsubscribe = unsubscribe;
        this._subscriptions.add(entry);
        signal?.addEventListener('abort', unsubscribe, {once:true});
        return unsubscribe;
    }

    /** Source removal and branch replacement release all owned callbacks. */
    disposeSource(node) {
        const branch = new Set([node]);
        this._walk(node.getValue(), branch);
        for (const entry of this._subscriptions) {
            if (branch.has(entry.sourceNode)) entry.unsubscribe();
        }
    }

    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        for (const entry of this._subscriptions) entry.unsubscribe();
        this._topics.clear();
    }

    _walk(bag, nodes) {
        if (!bag?.getNodes) return;
        for (const node of bag.getNodes()) {
            nodes.add(node);
            this._walk(node.getValue(), nodes);
        }
    }

    _liveNodes() {
        const nodes = new Set();
        this._walk(this.application.builder?.source, nodes);
        return [...nodes];
    }

    publish(topic, payload) {
        if (typeof topic !== 'string' || !topic) throw new TypeError('A topic must be a non-empty string');
        if (this._disposed) return;
        const entries = this._topics.get(topic);
        for (const entry of [...(entries || [])]) {
            if (this._disposed) return;
            if (entries.has(entry)) entry.callback.call(entry.sourceNode, payload);
        }
        // Resolve declarations live: dynamic insertion works without registration,
        // and removed declarations retain neither callbacks nor Source nodes.
        for (const node of this._liveNodes()) {
            if (this._disposed) return;
            const handler = node.getAttr(`subscribe_${topic}`);
            if (handler && this._liveNodes().includes(node)) {
                const fields = payload && Object.getPrototypeOf(payload) === Object.prototype ? payload : {};
                const extra = {...fields, payload, _kwargs:payload, _topic:topic};
                if (handler === true && node.nodeTag === 'dataController') {
                    this.application.live(() => this.application.builder._logic.compute(node,
                        {trigger_reason:'topic', topic, kw:payload}, extra));
                } else if (typeof handler === 'string' || typeof handler === 'function') {
                    this.application._runRecipe(node, handler, extra);
                }
            }
            // Existing container commands use the same application-local lane.
            if (['tabContainer', 'stackContainer'].includes(node.nodeTag)
                && node.getAttr('nodeId') && topic === `${node.getAttr('nodeId')}_switchPage`) {
                const element = this.application.target._byId(node.getAttr('id') || this.application.builder.targetId(node));
                element?.switchPage(payload);
            }
        }
    }
}
