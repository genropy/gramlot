// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Page-owned topic dispatch; public aliases stay on genro. */
export class TopicService {
    constructor(application) { this.application = application; this._topics = new Map(); this._subscriptions = new Set(); this._disposed = false; }
    /** Page-local synchronous topics; unsubscribe handle and optional owner signal. */
    subscribe(topic, callback, {signal} = {}) {
        if (this._disposed || signal?.aborted) return () => {};
        const callbacks = this._topics.get(topic) || new Set();
        this._topics.set(topic, callbacks);
        callbacks.add(callback);
        const unsubscribe = () => {
            callbacks.delete(callback);
            if (!callbacks.size) this._topics.delete(topic);
            signal?.removeEventListener('abort', unsubscribe);
            this._subscriptions.delete(unsubscribe);
        };
        this._subscriptions.add(unsubscribe);
        signal?.addEventListener('abort', unsubscribe, {once:true});
        return unsubscribe;
    }
    /** Release subscription handles, including their external abort listeners. */
    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        for (const unsubscribe of this._subscriptions) unsubscribe();
        this._topics.clear();
    }

    publish(topic, payload) {
        if (this._disposed) return;
        for (const callback of [...(this._topics.get(topic) || [])]) {
            if (this._disposed) return;
            callback(payload);
        }
        if (this._disposed) return;
        // Resolve live source nodes: removed recipes never retain subscriptions.
        const subscribers = [];
        const visit = bag => {
            for (const node of bag.getNodes()) {
                if (node.getAttr(`subscribe_${topic}`)) subscribers.push(node);
                const value = node.getValue();
                if (value?.getNodes) visit(value);
            }
        };
        visit(this.application.builder.source);
        for (const node of subscribers) {
            if (this._disposed) return;
            this.application._runRecipe(node, node.getAttr(`subscribe_${topic}`), {payload, _kwargs:payload});
        }
    }

}
