// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Presentation only. FormField/Validator retain draft, policy and async ownership.
 * Native elements and third-party adapters can use the same presenter. */
export function setFieldState(widget, {invalid = false, pending = false, issues = []} = {}) {
    const input = widget.fieldControl || widget._input || widget;
        input.setAttribute('aria-invalid',String(invalid));
        input.setAttribute('aria-busy',String(pending));
        widget.toggleAttribute('data-invalid',invalid);
        (widget.decoration || widget._widgetLabel)?.box?.classList.toggle('innerLblWrapper_error',invalid);
        if (widget.shadowRoot) {
            let message=widget.shadowRoot.querySelector('[data-validation-message]');
            if (!message) {
                message=widget.ownerDocument.createElement('div');
                message.id='gnr-validation-message';message.setAttribute('data-validation-message','');
                message.setAttribute('aria-live','polite');widget.shadowRoot.appendChild(message);
                const style=widget.ownerDocument.createElement('style');
                style.textContent=':is(input,textarea)[aria-invalid=true]{background-color:var(--field-invalid-bg,#fff0f0)}[data-validation-message]{color:var(--field-error-color,#9e2525);font-size:12px}';
                widget.shadowRoot.appendChild(style);
            }
            const text=issues.map(issue=>issue.message).join(' ');
            if (message.textContent!==text) message.textContent=text;
            message.hidden=!text;
            const ids=new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
            if (text) ids.add(message.id);else ids.delete(message.id);
            if (ids.size) input.setAttribute('aria-describedby',[...ids].join(' '));else input.removeAttribute('aria-describedby');
        }
}

export function clearFieldState(widget) {
    const input = widget.fieldControl || widget._input || widget;
    widget.removeAttribute('data-invalid');
    (widget.decoration || widget._widgetLabel)?.box?.classList.remove('innerLblWrapper_error');
    const message = widget.shadowRoot?.querySelector('[data-validation-message]');
    if (message) { message.textContent = ''; message.hidden = true; }
    input.removeAttribute('aria-invalid'); input.removeAttribute('aria-busy');
    const ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== 'gnr-validation-message');
    if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
    else input.removeAttribute('aria-describedby');
}
