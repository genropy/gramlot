// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * Application — the `genro` object: the world↔handler layer.
 *
 * Counterpart of Python's `ExampleApp`/`WsApplication`, standalone in
 * the browser. Owns the handler, the mounted builder, the DOM target,
 * and exposes the citizens the page works with: `data`, `builder`,
 * `root` (Proxy-wrapped source for interactive commands).
 *
 * Write-back (DOM→data): a value-bound element, when it changes, writes
 * the datum it is bound to. `mutate(elementId, value)` is the linear
 * port of ws-web `WsApplication.mutate`: resolve the node by identity
 * (writeback map or serial), derive destination+value from the node's
 * own attributes (never a path from the client), write inside `live()`.
 * `_enableInput` wires a delegated `input` listener on the DOM target.
 *
 * Not-yet-ported (later slices): dtype typing via TYTX (`_typedValue`
 * returns the raw string), the `data-set-pointer`/`data-fire-pointer`
 * shapes, and the client-side anti-echo (the input that reads itself
 * re-renders on its own write — the focus-preservation policy is still
 * open, see the reactivity roadmap).
 */
import {FormService} from './forms/service.js';
import {Validator} from './forms/validator.js';
import { BuilderHandler } from './builder-handler.js';
import { DomTarget } from './target-wrapper.js';
import { wrapSource } from './source-bag.js';
import { TopicService } from './services/topics.js';
import { RecipeRuntime } from './services/recipe-runtime.js';
import {ResolverService} from './resolvers/service.js';
import {OpenApiClientService} from './services/openapi-client.js';
import {ServerCallService} from './services/server-call.js';
import {CollectionStores} from './stores/collection-stores.js';
import {InteractionFeedback} from './services/interaction-feedback.js';

export class Application {
    /**
     * @param {Element} rootElement host element for the render.
     * @param {BuilderBase} builder a builder instance (its class defines main).
     */
    constructor(rootElement, builder = null, options = {}) {
        this.options = options;
        this._disposed = false;
        this._domListeners = [];
        this.events = new TopicService(this);
        this._recipeRuntime = new RecipeRuntime(this);
        this.resolvers = new ResolverService(this);
        this.server = new ServerCallService(this, options.rpc);
        this.feedback = new InteractionFeedback(this);
        this.stores = new CollectionStores(this);
        this.openapi = new OpenApiClientService();
        this.handler = new BuilderHandler(this);
        this.vld = new Validator(this);
        this._forms = new FormService(this);
        this.builder = null;
        this.target = new DomTarget(rootElement);
        if (builder) this.mountBuilder(builder);
    }

    /** Mount once, after the caller has prepared the builder's recipe. */
    mountBuilder(builder) {
        if (this._disposed) throw new Error('Cannot mount a disposed application');
        if (this.builder) throw new Error('An application builder is already mounted');
        this.builder = builder;
        try {
            builder.setRenderTarget(this.target);
            this.handler.addBuilder(builder);
            this.handler.activate();
            this._enableInput();
            this._enableCommands();
            this._forms.start();
            this._builderApplicationCleanup = builder.attachApplication?.(this);
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    /** Release this runtime, retaining its Bags and the caller-owned host. */
    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this.target._disposed = true;
        for (const [type, callback] of this._domListeners) {
            this.target.root.removeEventListener(type, callback);
        }
        this._domListeners = [];
        this._builderApplicationCleanup?.();
        this.dev?.dispose();
        this.events.dispose();
        this.resolvers.dispose();
        this.server.dispose();
        this.stores.dispose();
        this.feedback.dispose();
        this._forms.dispose();
        this.handler.dispose();
        for (const node of [...this.target.root.childNodes]) {
            if (this.target.recipes.has(node)) node.remove();
        }
    }

    /** Record delegated listeners so disposal removes precisely this owner's. */
    _listen(type, callback) {
        this.target.root.addEventListener(type, callback);
        this._domListeners.push([type, callback]);
    }

    subscribe(topic, callback, options) { return this.events.subscribe(topic, callback, options); }
    publish(topic, payload) { return this.events.publish(topic, payload); }
    serverCall(method, params = {}, asyncCallback = null, mode = null,
               httpMethod = null, options = {}) {
        if (asyncCallback !== null && typeof asyncCallback !== 'function') {
            throw new TypeError('serverCall callback must be a function or null');
        }
        if (mode !== null) {
            throw new Error('serverCall result modes are not supported by this TYTX experiment');
        }
        if (httpMethod !== null && httpMethod !== 'POST') {
            throw new Error('serverCall supports only POST in this TYTX experiment');
        }
        const promise = this.server.call(method, params, options);
        if (!asyncCallback) return promise;
        return promise.then(
            result => { asyncCallback.call(this, result, null); return result; },
            error => { asyncCallback.call(this, null, error); throw error; },
        );
    }
    _runRecipe(node, code, extra) { if (this._disposed) return; return this._recipeRuntime.run(node, code, extra); }

    get data() {
        return this.handler.data;
    }

    get root() {
        return this.builder ? wrapSource(this.builder.source) : null;
    }

    render() {
        this.handler.render();
    }

    live(fn) {
        this.handler.live(fn);
    }

    // --- write-back (DOM → data) -------------------------------------

    /** Apply a data mutation addressed by element identity. */
    mutate(elementId, value) {
        if (this._disposed) return;
        this._applyMutation(this._mutationNode(elementId), value);
    }

    /** Write from an already-resolved node. The origin node rides as the
     *  write's `reason` (legacy `doTrigger: sourceNode`): the reactive
     *  flush skips the reader that is the origin, so the input that wrote
     *  does not re-render on its own change (anti-echo, `kw.reason != this`). */
    _applyMutation(node, value) {
        if (!this._forms.commit(node,value)) this._writeMutation(node,value);
    }

    _writeMutation(node, value) {
        const [path, typed, fired] = this._mutationWrite(node, value);
        // bag-js setItem(path, value, attr, nodePosition, updattr,
        // removeNullAttributes, reason, fired) — reason = the origin node.
        this.handler.live(() => {
            this.handler.data.setItem(path, typed, null, '>', false, true, node, fired);
        });
        const name = node.pointerType(node.getAttr('value')) ? 'value' : 'checked';
        this.target?._recordValue?.(this.builder.targetId(node), name, typed);
    }

    /** Resolve the element identity to its server-side node. */
    _mutationNode(elementId) {
        if (!elementId) {
            throw new Error('mutation without an element id');
        }
        const wmap = this.builder._writebackMap || {};
        if (wmap[elementId]) {
            return wmap[elementId];
        }
        return this.builder.nodeByTargetId(elementId);
    }

    /** Derive [path, typedValue, fired] from the node's own attributes.
     *  Value pointer and checked pointer are ported; the data-set/
     *  data-fire shapes are a later slice. */
    _mutationWrite(node, raw) {
        const attr = node.getAttr() || {};
        if (node.pointerType(attr.value)) {
            const widget = this.target?._byId(this.builder.targetId(node));
            return [node.absDatapath(attr.value), this._typedValue(raw, attr.dtype, Boolean(widget?._nullState)), false];
        }
        if (node.pointerType(attr.checked)) {
            return [node.absDatapath(attr.checked), raw, false];
        }
        throw new Error(
            `mutation target ${attr.id || node.nodeTag} is not writable`,
        );
    }

    /** Convert a client string to the node's dtype. Text stays text;
     *  full TYTX typing is a later slice (returns raw for now). */
    _typedValue(value, dtype, preserveEmpty = false) {
        if (value === null || typeof value !== 'string') {
            return value;
        }
        if (!dtype || dtype === 'A' || dtype === 'T') {
            return value;
        }
        if (value === '' && !preserveEmpty) {
            return null;
        }
        return value;   // TODO(later): rawDecode(`${value}::${dtype}`)
    }

    /** Wire delegated input listeners on the DOM target (client side).
     *  A value-bound element writes per keystroke with `live: true`, otherwise
     *  on focus loss. The older `updateOn` option remains a fallback:
     *  `blur` (default → the native `change` event, fired on focus loss /
     *  tab / click-out) or `input` (live, per keystroke). */
    _enableInput() {
        const root = this.target && this.target.root;
        if (!root || !root.addEventListener) {
            return;
        }
        const handle = (e) => {
            const el = e.target;
            if (!el.id || !el.hasAttribute) {
                return;
            }
            // A checkbox binds `checked` (boolean); everything else `value`.
            const isChecked = el.hasAttribute('data-checked-pointer');
            if (!isChecked && !el.hasAttribute('data-value-pointer')) {
                return;
            }
            let node;
            try {
                node = this._mutationNode(el.getAttribute('data-gnr-target-id') || el.id);
            } catch {
                return;
            }
            const intermediate = el.getAttribute('intermediateChanges');
            const slider = ['gnr-horizontalslider', 'gnr-verticalslider'].includes(el.localName);
            if ((slider || el._nullState) && (el.hasAttribute('disabled') || el.hasAttribute('readonly'))) return;
            const continuous = intermediate !== null && !['false', 'False', '0'].includes(intermediate);
            const live = node.getAttr('live');
            const updateOn = live != null
                ? ([true, 'true', 'True', 1, '1'].includes(live) ? 'input' : 'blur')
                : node.getAttr('updateOn') || (slider && continuous ? 'input' : 'blur');
            const wantEvent = el.commitOnChange ? 'change' : updateOn === 'input' ? 'input' : 'change';
            const field=this._forms.fields.get(node);
            if (field && e.type==='input') field.markEdited(e);
            if (el.symbolicEditing && e.type==='input') return;
            if (e.type === wantEvent) {
                if (!this._forms.commit(node,null,true)) this._writeMutation(node, isChecked ? el.checked : el.value);
            }
        };
        this._listen('input', handle);
        this._listen('change', handle);
    }

    /** Wire a delegated listener for widget commands. A data-widget that
     *  must write a datum (a tree writing its selection) dispatches a
     *  composed `gnr-set` CustomEvent `{ pointer, value }`; the kernel
     *  applies it inside `live()`. This is the write-back channel for
     *  shadow-DOM widgets, whose inner rows never reach the delegated input
     *  listener (shadow retargeting hides them). The destination path is the
     *  widget's own `data-<attr>-pointer`, resolved server-side. */
    _enableCommands() {
        const root = this.target && this.target.root;
        if (!root || !root.addEventListener) {
            return;
        }
        this._listen('click', event => {
            // Slotted commands can be retargeted to their form/box host.
            const button = event.composedPath().find(element =>
                element.matches?.('button[data-command-node]'));
            if (!button || !root.contains(button) || !button.hasAttribute('data-command-node')) return;
            const node = this.builder.nodeByTargetId(button.getAttribute('data-command-node'));
            if (!node || node.nodeTag !== 'button') return;
            const [, attrs] = this.builder.runtimeValues(node);
            if (attrs.disabled || attrs.hidden || this.feedback.locks.size) return;
            if (!attrs.action && !attrs.publish && !attrs.fire
                    && !Object.keys(attrs).some(key => key.startsWith('fire_'))) return;
            event.preventDefault();
            event.stopPropagation();
            const execute = count => {
                const [, current] = this.builder.runtimeValues(node);
                if (current.disabled || current.hidden || this.feedback.locks.size) return;
                const modifiers = [event.shiftKey && 'Shift', event.ctrlKey && 'Ctrl',
                    event.altKey && 'Alt', event.metaKey && 'Meta'].filter(Boolean).join(',');
                const modifier = modifiers.replaceAll(',', '');
                if (current.action) this._runRecipe(node, current.action, {event, _counter: count, modifiers});
                else if (current.fire) node.fireEvent(current.fire, modifier || true,
                    {attributes: {modifier, _counter: count}});
                else if (current.publish) this.publish(current.publish, true);
                else for (const [key, path] of Object.entries(current)) {
                    if (key.startsWith('fire_')) node.fireEvent(path, key.slice(5),
                        {attributes: {modifier, _counter: count}});
                }
            };
            if (attrs._delay) {
                node._pendingClickCount = (node._pendingClickCount || 0) + 1;
                node.delayedCall(() => {
                    const count = node._pendingClickCount;
                    node._pendingClickCount = 0;
                    execute(count);
                }, attrs._delay, 'button');
            } else {
                if (node._clickBlocked) return;
                node._clickBlocked = true;
                node.delayedCall(() => { node._clickBlocked = false; }, 200, 'buttonGuard');
                execute(undefined);
            }
        });
        this._listen('gnr-topic', event => {
            event.stopPropagation();
            this.publish(event.detail.topic, event.detail.payload);
        });
        this._listen('gnr-close-page', event => {
            event.stopPropagation();
            const node = this.builder.nodeByTargetId(event.detail.id);
            if (node) this.live(() => node.parentBag.popNode(node.label));
        });
        this._listen('gnr-set', (e) => {
            e.stopPropagation();
            const detail = e.detail || {};
            if (!detail.pointer) {
                return;
            }
            this.handler.live(() => {
                this.handler.data.setItem(detail.pointer, detail.value);
            });
        });
    }
}
