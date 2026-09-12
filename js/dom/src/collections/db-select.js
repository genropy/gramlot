// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Remote identity/caption choice. SQL and authorization belong to the endpoint. */
export function defineDbSelect(Base) {
    return class GnrDbSelect extends Base {
        get options() { return this._options || []; }
        get value() { return this._committed; }
        set value(value) {
            super.value = value;
            if (this.isConnected && value != null && value !== '' &&
                !this.options.some(item => item.id === String(value))) this._resolve(value);
        }
        connectedCallback() {
            super.connectedCallback();
            this.sourceNode.handler.application.server.requireCapability();
        }
        disconnectedCallback() {
            clearTimeout(this._searchTimer);
            this._generation = (this._generation || 0) + 1;
            this.sourceNode?.handler.application.server.cancel(this);
            super.disconnectedCallback();
        }
        _open(query) {
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
        async _resolve(value) {
            const generation = this._generation = (this._generation || 0) + 1;
            const rows = await this._request({_id:value}, generation);
            if (!rows || !this.isConnected || generation !== this._generation) return;
            this._options = rows;
            super.value = value;
        }
        async _request(params, generation) {
            const node = this.sourceNode, app = node.handler.application;
            if (node._dbSelectPending) { app.feedback.busy(node); return null; }
            node._dbSelectPending = true;
            this.setAttribute('aria-busy','true');
            try {
                const result = await app.server.call(this.getAttribute('rpcmethod'), params, {owner:this});
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
