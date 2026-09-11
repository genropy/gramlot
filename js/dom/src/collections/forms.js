// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Explicit portable form scope. Requiring this collection selects the controller
 * contract; ordinary HTML form elements and formId markers remain unchanged. */
import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';

registerComponentCollection('forms', {
    components: builtinComponents('forms'),
    defineComponents() {
        if (customElements.get('gnr-form')) return;
        class GnrForm extends HTMLElement {
            constructor() {
                super();
                const root=this.attachShadow({mode:'open'});
                const style=document.createElement('style');
                style.textContent=':host{display:block}';
                const content=document.createElement('div');
                content.setAttribute('role','group');
                content.appendChild(document.createElement('slot'));
                this._summary=document.createElement('div');
                this._summary.tabIndex=-1;
                this._summary.setAttribute('aria-live','polite');
                root.append(style,content,this._summary);
            }
        }
        customElements.define('gnr-form',GnrForm);
    }
});
