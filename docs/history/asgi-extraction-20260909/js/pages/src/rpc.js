// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {fromTytx, toTytx} from 'genro-tytx';

/** Page-owned RPC. WSK uses the core WSX protocol; HTTP is an explicit choice.
 * Every call settles once, with typed values or a rejected Promise. Closing
 * releases pending work; neither disconnection nor timeout replays a call.
 */
export class RpcService {
    constructor(application, configuration) {
        this.application = application;
        this.httpMethod = configuration?.getItem('httpMethod') ?? 'WSK';
        this.pending = new Map();
        this.controllers = new Set();
        this.serial = 0;
        this.disposed = false;
        this.socket = null;
        this.channel = null;
    }

    async openChannel() {
        if (this.disposed) throw new DOMException('RPC service is disposed', 'AbortError');
        if (this.channel) return this.channel;
        this.channel = this._openChannel();
        return this.channel;
    }

    async _openChannel() {
        if (!this.application.pageId) throw new Error('A registered page is required for WSK');
        const url = new URL('/_wsx', window.location.href);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = this.socket = new WebSocket(url);
        await new Promise((resolve, reject) => {
            const finish = error => {
                clearTimeout(timer);
                this.rejectOpening = null;
                socket.removeEventListener('open', opened);
                if (error) reject(error); else resolve();
            };
            const opened = () => finish();
            const timer = setTimeout(() => this.dispose(new Error('WebSocket opening timed out')), 30000);
            this.rejectOpening = finish;
            socket.addEventListener('open', opened);
            socket.addEventListener('message', this.onMessage = event => this._receiveMessage(event));
            socket.addEventListener('close', this.onClose = () => this.dispose(new Error('WebSocket closed')));
            socket.addEventListener('error', this.onError = () => this.dispose(new Error('WebSocket failed')));
        });
        return this._sendCall('/_wsx/openchannel', {parameters: {sequential: true}}, 30000);
    }

    async remoteCall(method, parameters = {}, {httpMethod = this.httpMethod, timeout = 30000} = {}) {
        if (this.disposed) throw new DOMException('RPC service is disposed', 'AbortError');
        if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('RPC timeout must be positive');
        const path = method.startsWith('/') ? method : '/' + method;
        if (httpMethod === 'WSK') {
            await this.openChannel();
            return this._sendCall(path, parameters, timeout);
        }
        if (httpMethod !== 'GET' && httpMethod !== 'POST') throw new Error('Unsupported RPC httpMethod');
        return this._httpCall(path, parameters, httpMethod, timeout);
    }

    _sendCall(path, parameters, timeout) {
        if (this.disposed) return Promise.reject(new DOMException('RPC service is disposed', 'AbortError'));
        if (this.socket?.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('Page channel is unavailable'));
        }
        const id = String(++this.serial);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`RPC timed out: ${path}`));
            }, timeout);
            this.pending.set(id, {resolve, reject, timer});
            try {
                this.socket.send('WSX://' + JSON.stringify({id, method: 'WSK', path,
                    page_id: this.application.pageId, data: toTytx(parameters, 'json')}));
            } catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(error);
            }
        });
    }

    _receiveMessage(event) {
        try {
            if (typeof event.data !== 'string' || !event.data.startsWith('WSX://')) {
                throw new Error('Invalid WSX response');
            }
            const response = JSON.parse(event.data.slice(6));
            const pending = this.pending.get(response.id);
            // Unsolicited server events and responses to expired calls are not RPC results.
            if (!pending) return;
            let value;
            try { value = fromTytx(response.data, 'json'); }
            catch (error) {
                clearTimeout(pending.timer);
                this.pending.delete(response.id);
                pending.reject(error);
                return;
            }
            clearTimeout(pending.timer);
            this.pending.delete(response.id);
            if (response.status >= 200 && response.status < 300) pending.resolve(value);
            else pending.reject(Object.assign(new Error(`RPC failed: ${response.status}`),
                {status: response.status, data: value}));
        } catch (error) {
            this.dispose(error);
        }
    }

    async _httpCall(path, parameters, httpMethod, timeout) {
        const controller = new AbortController();
        this.controllers.add(controller);
        const timer = setTimeout(() => controller.abort(new Error('RPC timed out')), timeout);
        try {
            const params = {...parameters};
            if (this.application.pageId) params.page_id = this.application.pageId;
            const options = {method: httpMethod, signal: controller.signal};
            if (httpMethod === 'GET') {
                // Core request decoding hydrates each query value through TYTX.
                const query = new URLSearchParams(Object.entries(params)
                    .map(([name, value]) => [name, toTytx(value)]));
                if (query.size) path += '?' + query;
            } else {
                options.headers = {'Content-Type': 'application/vnd.tytx+json'};
                options.body = toTytx(params, 'json');
            }
            const response = await fetch(path, options);
            if (!response.ok) throw Object.assign(new Error(`RPC failed: HTTP ${response.status}`),
                {status: response.status});
            const transport = parameters.transport === 'msgpack' ? 'msgpack' : 'json';
            const payload = transport === 'msgpack'
                ? new Uint8Array(await response.arrayBuffer()) : await response.text();
            if (controller.signal.aborted) throw controller.signal.reason;
            if (this.disposed) throw new DOMException('RPC service is disposed', 'AbortError');
            return fromTytx(payload, transport);
        } finally {
            clearTimeout(timer);
            this.controllers.delete(controller);
        }
    }

    dispose(error = new DOMException('RPC service is disposed', 'AbortError')) {
        if (this.disposed) return;
        this.disposed = true;
        this.rejectOpening?.(error);
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
        for (const controller of this.controllers) controller.abort(error);
        this.controllers.clear();
        if (this.socket) {
            this.socket.removeEventListener('message', this.onMessage);
            this.socket.removeEventListener('close', this.onClose);
            this.socket.removeEventListener('error', this.onError);
            this.socket.close();
        }
    }
}
