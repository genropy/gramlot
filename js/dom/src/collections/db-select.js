// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Remote identity/caption choice. SQL and authorization belong to the endpoint. */
export function defineDbSelect(Base, {callback = false} = {}) {
    return class GnrDbSelect extends Base {
        get options() { return this._options || []; }
        get value() { return this._committed; }
        set value(value) {
            if (value == null || value === '') {
                this._generation = (this._generation || 0) + 1;
                this._options = [];
                clearTimeout(this._searchTimer);
            }
            super.value = value;
            if (this.isConnected && value != null && value !== '' &&
                !this.options.some(item => item.id === String(value))) this._resolve(value);
        }
        connectedCallback() {
            super.connectedCallback();
            if (!callback) this.sourceNode.handler.application.server.requireCapability();
        }
        disconnectedCallback() {
            clearTimeout(this._searchTimer);
            this._generation = (this._generation || 0) + 1;
            this.sourceNode?.handler.application.server.cancel(this);
            super.disconnectedCallback();
        }
        _open(query) {
            // A pending query must never accept the previous query's highlight.
            this._close();
            clearTimeout(this._searchTimer);
            const generation = this._generation = (this._generation || 0) + 1;
            this._searchTimer = setTimeout(async () => {
                const rows = await this._request({_querystring:query}, generation);
                if (!rows || !this.isConnected || generation !== this._generation ||
                    this.shadowRoot.activeElement !== this._input) return;
                this._options = rows;
                // The endpoint has already applied its search policy.
                super._open('');
            }, Number(this.getAttribute('searchdelay') ?? 300));
        }
        getSelectionValidity(value) {
            if (this._resolvePromise && String(value) === this._resolvingValue) {
                return this._resolvePromise.then(() => super.getSelectionValidity(value == null ? value : String(value)));
            }
            return super.getSelectionValidity(value == null ? value : String(value));
        }
        _resolve(value) {
            // Binding updates can assign the same identity more than once while
            // the lookup is pending. Share it without invalidating its generation.
            if (this._resolvePromise && this._resolvingValue === String(value)) return this._resolvePromise;
            const generation = this._generation = (this._generation || 0) + 1;
            this._resolvingValue = String(value);
            const pending = this._request({_id:value}, generation).then(rows => {
                if (!rows || !this.isConnected || generation !== this._generation) return;
                this._options = rows;
                super.value = value;
            }).finally(() => {
                if (this._resolvePromise === pending) this._resolvePromise = null;
            });
            this._resolvePromise = pending;
            return pending;
        }
        async _request(params, generation) {
            const node = this.sourceNode, app = node.handler.application;
            if (node._dbSelectPending) { app.feedback.busy(node); return null; }
            node._dbSelectPending = true;
            this.setAttribute('aria-busy','true');
            try {
                const [, attributes] = node.builder.runtimeValues(node);
                const kw = {...Object.fromEntries(Object.entries(attributes).filter(([key]) => key.startsWith('kw_')).map(([key, value]) => [key.slice(3), value])), ...params};
                const result = callback
                    ? await (typeof attributes.callback === 'function'
                        ? attributes.callback.call(node, kw)
                        : app._recipeRuntime.evaluate(node, attributes.callback, {kw}))
                    : await app.server.call(this.getAttribute('rpcmethod'), kw, {owner:this});
                if (generation !== this._generation || !this.isConnected) return null;
                if (!result || !Array.isArray(result.rows) || typeof result.identifier !== 'string' ||
                    typeof result.caption !== 'string') throw new Error('Invalid dbSelect selection response');
                const seen = new Set();
                const options = result.rows.map(row => {
                    const key = row[result.identifier], caption = row[result.caption];
                    if (key == null || key === '' || caption == null || seen.has(String(key)))
                        throw new Error('Invalid dbSelect identity or caption');
                    seen.add(String(key));
                    return {id:String(key), caption:String(caption), record:row};
                });
                this.resultMetadata = result.metadata || {};
                this._error.textContent = '';
                return options;
            } catch (error) {
                if (generation === this._generation && this.isConnected) {
                    this._error.textContent = error.message;
                    this._input.setCustomValidity(error.message);
                }
                return null;
            } finally {
                node._dbSelectPending = false;
                this.removeAttribute('aria-busy');
            }
        }
        _acceptOnExit() {
            if (!this._opened || this._input.disabled || this._input.readOnly) return false;
            const item = this._filtered[this._active] ||
                (this._filtered.length === 1 ? this._filtered[0] : null);
            if (!item) return false;
            this._choose(item);
            return true;
        }
        _choose(item) {
            super._choose(item);
            const node = this.sourceNode;
            node.handler.live(() => {
                const destination = node.getAttr('selectedCaption');
                if (destination) node.SET(destination, item.caption);
                for (const [name, path] of Object.entries(node.getAttr())) {
                    if (name.startsWith('selected_')) node.SET(path, item.record[name.slice(9)] ?? null);
                }
            });
        }
        _close() {
            clearTimeout(this._searchTimer);
            super._close();
        }
    };
}
