// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
const key = 'gramlot.teaching.showNullValues';
const messageType = 'gramlot:preference:null';
const checkbox = document.querySelector('[data-preference="show-null-values"]');
const nullBackground = 'linear-gradient(#f4f4f4, #f4f4f4)';

function apply(enabled) {
    const style = document.documentElement.style;
    style.setProperty('--gramlot-null-background', enabled ? nullBackground : 'none');
    style.setProperty('--gramlot-null-marker', enabled ? "'∅'" : 'none');
    style.setProperty('--gramlot-null-placeholder-color', enabled ? 'transparent' : 'revert');
    style.setProperty('--gramlot-null-checkbox-appearance', enabled ? 'none' : 'auto');
    if (checkbox) checkbox.checked = enabled;
}

let enabled = false;
try { enabled = localStorage.getItem(key) === 'true'; } catch { /* Session-only preference. */ }
apply(enabled);
checkbox?.addEventListener('change', () => {
    enabled = checkbox.checked;
    apply(enabled);
    try { localStorage.setItem(key, String(enabled)); } catch { /* Keep this page usable. */ }
    for (const iframe of document.querySelectorAll('iframe')) {
        iframe.contentWindow?.postMessage({type: messageType, enabled}, location.origin);
    }
});
window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue === 'true');
});
window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === messageType && typeof event.data.enabled === 'boolean') {
        apply(event.data.enabled);
    }
});
