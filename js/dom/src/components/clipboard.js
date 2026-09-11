// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Shared clipboard boundary; callers own their UI state and connection lifetime. */
export const COPY_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7" y="6" width="10" height="12" rx="1"/><path d="M4 14H2V2h10v2"/></svg>';
export const COPIED_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 10 4 4 10-10"/></svg>';
export async function writeClipboardText(host, text) {
    const clipboard = host.ownerDocument.defaultView.navigator.clipboard;
    if (!clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await clipboard.writeText(text);
}
