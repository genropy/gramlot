// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

export const LAB_RUN_MESSAGE = 'gramlot:lab:run';
export const LAB_RESULT_MESSAGE = 'gramlot:lab:result';
export const LAB_READY_MESSAGE = 'gramlot:lab:ready';
export const LAB_PING_MESSAGE = 'gramlot:lab:ping';

const editors = new Map();
let nextRun = 0;

document.querySelectorAll('.lab-divider').forEach(divider => {
    const layout = divider.parentElement;
    let pointer = null;
    let originalWidth;
    const resize = value => {
        const width = Math.max(25, Math.min(80, value));
        layout.style.setProperty('--example-width', `${width}%`);
        divider.setAttribute('aria-valuenow', String(Math.round(width)));
    };
    const finish = () => {
        pointer = null;
        layout.classList.remove('resizing');
    };
    divider.addEventListener('pointerdown', event => {
        if (event.button !== 0 || pointer !== null) return;
        originalWidth = Number(divider.getAttribute('aria-valuenow'));
        pointer = event.pointerId;
        divider.setPointerCapture(pointer);
        divider.focus();
        layout.classList.add('resizing');
        event.preventDefault();
    });
    divider.addEventListener('pointermove', event => {
        if (event.pointerId !== pointer) return;
        const bounds = layout.getBoundingClientRect();
        resize((event.clientX - bounds.left) / bounds.width * 100);
    });
    divider.addEventListener('pointerup', finish);
    divider.addEventListener('lostpointercapture', finish);
    divider.addEventListener('pointercancel', () => { resize(originalWidth); finish(); });
    divider.addEventListener('keydown', event => {
        const current = Number(divider.getAttribute('aria-valuenow'));
        const values = {ArrowLeft: current - 5, ArrowRight: current + 5, Home: 25, End: 80};
        if (!(event.key in values)) return;
        event.preventDefault();
        resize(values[event.key]);
    });
});

function setStatus(row, message, state = '') {
    const status = row.querySelector('.lab-status');
    if (!status) return;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
}

function setControlsEnabled(row, enabled) {
    row.querySelectorAll('[data-action="run"], [data-action="reset"]')
        .forEach(button => { button.disabled = !enabled; });
}

function ping(row) {
    const frame = row.querySelector('iframe');
    frame?.contentWindow?.postMessage({type: LAB_PING_MESSAGE}, location.origin);
}

function currentValue(textarea) {
    return editors.get(textarea)?.state.doc.toString() ?? textarea.value;
}

function replaceValue(textarea, value) {
    const editor = editors.get(textarea);
    textarea.value = value;
    if (editor && editor.state.doc.toString() !== value) {
        editor.dispatch({changes: {from: 0, to: editor.state.doc.length, insert: value}});
    }
}

async function installEditor(row, textarea) {
    const readonly = row.dataset.language === 'python';
    const label = readonly ? 'Python code (read only)' : 'JavaScript code';
    try {
        const deps = '?deps=@codemirror/state@6.7.4,@codemirror/view@6.43.11';
        const [{EditorView, basicSetup}, {EditorState}, {oneDark}, language] = await Promise.all([
            import('https://esm.sh/codemirror@6.0.2' + deps),
            import('https://esm.sh/@codemirror/state@6.7.4'),
            import('https://esm.sh/@codemirror/theme-one-dark@6.1.3' + deps),
            readonly
                ? import('https://esm.sh/@codemirror/lang-python@6.2.1' + deps)
                : import('https://esm.sh/@codemirror/lang-javascript@6.2.3' + deps),
        ]);
        if (!textarea.isConnected) return;
        const host = document.createElement('div');
        host.className = 'recipe-editor-codemirror';
        textarea.insertAdjacentElement('afterend', host);
        const editor = new EditorView({
            // The editor lives in light DOM even when its host is slotted into a
            // borderContainer. Mount styles in the document, not that shadow root.
            root: document,
            parent: host,
            doc: textarea.value,
            extensions: [
                basicSetup, oneDark,
                (readonly ? language.python : language.javascript)(),
                EditorState.readOnly.of(readonly),
                EditorView.editable.of(!readonly),
                EditorView.lineWrapping,
                EditorView.contentAttributes.of({tabindex: '0', 'aria-label': label,
                    ...(readonly ? {role: 'textbox', 'aria-readonly': 'true'} : {})}),
                EditorView.updateListener.of(update => {
                    if (update.docChanged) textarea.value = update.state.doc.toString();
                }),
            ],
        });
        editors.set(textarea, editor);
        textarea.hidden = true;
        row.dataset.editorReady = 'true';
        if (row.dataset.frameReady === 'true') {
            setControlsEnabled(row, true);
            setStatus(row, 'Runs when you leave the editor.', 'ready');
        } else setStatus(row, 'Waiting for the live example…');
    } catch (error) {
        textarea.hidden = false;
        textarea.setAttribute('aria-label', label);
        row.dataset.editorReady = 'fallback';
        if (row.dataset.frameReady === 'true') setControlsEnabled(row, true);
        setStatus(row, `CodeMirror unavailable; using the basic text editor. ${error.message}`, 'warning');
    }
}

function run(row) {
    const iframe = row.querySelector('iframe');
    const textarea = row.querySelector('textarea.recipe-editor');
    if (!iframe?.contentWindow || !textarea) {
        setStatus(row, 'The live example is unavailable.', 'error');
        return;
    }
    const runId = ++nextRun;
    row.dataset.runId = String(runId);
    setStatus(row, 'Running…', 'running');
    iframe.contentWindow.postMessage({
        type: LAB_RUN_MESSAGE,
        runId,
        mode: row.dataset.sourceMode,
        source: currentValue(textarea),
    }, location.origin);
}

function initializeRow(row) {
    const textarea = row.querySelector('textarea.recipe-editor');
    if (!textarea) return;
    const original = textarea.value;
    const iframe = row.querySelector('iframe');
    textarea.setAttribute('aria-label', 'JavaScript code');
    setControlsEnabled(row, false);
    row.querySelector('.code-pane').addEventListener('focusout', event => {
        const editorHost = event.target.closest('.recipe-editor-codemirror, textarea.recipe-editor');
        if (!editorHost || editorHost.contains(event.relatedTarget)) return;
        run(row);
    });
    row.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
        replaceValue(textarea, original);
        run(row);
    });
    setStatus(row, 'Loading editor…');
    installEditor(row, textarea);
    iframe?.addEventListener('load', () => ping(row));
    ping(row);
}

window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const data = event.data;
    if (data?.type === 'gramlot:lab:size' && Number.isSafeInteger(data.height) && data.height >= 0) {
        const frame = [...document.querySelectorAll('.lab-row iframe')]
            .find(candidate => candidate.contentWindow === event.source);
        if (frame) frame.style.height = `${Math.max(180, data.height)}px`;
        return;
    }
    if (!data || (data.type !== LAB_RESULT_MESSAGE && data.type !== LAB_READY_MESSAGE)) return;
    const row = [...document.querySelectorAll('.lab-row[data-language="javascript"]')]
        .find(candidate => candidate.querySelector('iframe')?.contentWindow === event.source);
    if (!row) return;
    if (data.type === LAB_READY_MESSAGE) {
        row.dataset.frameReady = 'true';
        if (row.dataset.editorReady) setControlsEnabled(row, true);
        if (!row.dataset.runId && row.dataset.editorReady === 'true') {
            setStatus(row, 'Runs when you leave the editor.', 'ready');
        }
        return;
    }
    if (String(data.runId) !== row.dataset.runId) return;
    setStatus(row, data.ok ? 'Changes applied.' : `Error: ${data.error}`, data.ok ? 'success' : 'error');
});

document.querySelectorAll('.lab-row[data-language="javascript"]').forEach(initializeRow);
document.querySelectorAll('.lab-row[data-language="python"]').forEach(row => {
    installEditor(row, row.querySelector('textarea.recipe-editor'));
});

window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    for (const editor of editors.values()) editor.destroy();
    editors.clear();
});
