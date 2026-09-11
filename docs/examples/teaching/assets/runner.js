import {Application} from 'gramlot-dom';
import {GramlotBuilder} from 'gramlot-builder';
import {fromTytx} from 'genro-tytx';

let application;
let latestRun = 0;
let sizeObserver;

if (document.documentElement.dataset.inspector === 'true') {
    sizeObserver = new ResizeObserver(() => {
        const height = Math.ceil(document.getElementById('root').getBoundingClientRect().height + 44);
        window.parent.postMessage({type: 'gramlot:lab:size', height}, location.origin);
    });
    sizeObserver.observe(document.getElementById('root'));
}

const LAB_RUN_MESSAGE = 'gramlot:lab:run';
const LAB_RESULT_MESSAGE = 'gramlot:lab:result';
const LAB_READY_MESSAGE = 'gramlot:lab:ready';
const LAB_PING_MESSAGE = 'gramlot:lab:ping';

function showError(error) {
    const panel = document.getElementById('error');
    panel.hidden = false;
    panel.textContent = `The example could not run: ${error.message}`;
    document.documentElement.dataset.ready = 'error';
}

function hideError() {
    const panel = document.getElementById('error');
    panel.hidden = true;
    panel.textContent = '';
}

async function compile(source, mode) {
    if (mode === 'body') {
        return new Function('root', `'use strict';\n${source}`);
    }
    if (mode !== 'module') throw new Error(`Unknown source mode: ${mode}`);
    const url = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
    try {
        const module = await import(url);
        if (typeof module.build !== 'function') {
            throw new Error('The module must export a build(root) function.');
        }
        return module.build;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function createApplication(build) {
    class ExampleBuilder extends GramlotBuilder {
        main(root) { build(root); }
    }
    return mountApplication(new ExampleBuilder('example'));
}

function mountApplication(builder) {
    const inspector = document.documentElement.dataset.inspector === 'true';
    const app = new Application(document.getElementById('root'), builder,
        {inspector: inspector ? {presentation: 'embedded'} : false});
    return app;
}

async function applyRun(data) {
    const sequence = ++latestRun;
    try {
        const build = await compile(data.source, data.mode);
        if (sequence !== latestRun) return;
        application?.dispose();
        application = undefined;
        application = createApplication(build);
        hideError();
        document.documentElement.dataset.ready = 'true';
        window.parent.postMessage({type: LAB_RESULT_MESSAGE, runId: data.runId, ok: true}, location.origin);
    } catch (error) {
        if (sequence !== latestRun) return;
        showError(error);
        window.parent.postMessage({type: LAB_RESULT_MESSAGE, runId: data.runId, ok: false,
            error: error instanceof Error ? error.message : String(error)}, location.origin);
    }
}

window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.type === LAB_PING_MESSAGE) {
        window.parent.postMessage({type: LAB_READY_MESSAGE}, location.origin);
        return;
    }
    if (!data || data.type !== LAB_RUN_MESSAGE || !Number.isSafeInteger(data.runId)
            || typeof data.source !== 'string') return;
    applyRun(data);
});

async function start() {
    const support = document.documentElement.dataset.support;
    if (support) {
        const {install} = await import(support);
        install(window);
    }
    const language = document.documentElement.dataset.language;
    let builder;
    if (language === 'python') {
        builder = new GramlotBuilder('example');
        const response = await fetch('./recipe.tytx');
        if (!response.ok) throw new Error(`Recipe unavailable: ${response.status}`);
        builder.loadSource(fromTytx(await response.text(), 'json'));
    } else {
        const {build} = await import(new URL('./recipe.js', location.href));
        class ExampleBuilder extends GramlotBuilder {
            main(root) { build(root); }
        }
        builder = new ExampleBuilder('example');
    }
    // A lab run may finish while the initial recipe import is still pending.
    // In that case the newer run owns the frame and startup must not replace it.
    if (latestRun !== 0) return;
    application = mountApplication(builder);
    document.documentElement.dataset.ready = 'true';
    window.parent.postMessage({type: LAB_READY_MESSAGE}, location.origin);
}

window.addEventListener('pagehide', event => {
    if (!event.persisted) { sizeObserver?.disconnect(); application?.dispose(); }
});

start().catch(error => {
    if (latestRun !== 0) return;
    application?.dispose();
    showError(error);
});
