// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * colorpicker — a composite web-component widget (JS port of ws-web
 * resources/components/colorpicker). Same native contract as the inputs:
 * a `value` property + composed bubbling `input` events, shadow-DOM
 * <input type=color>. Plugged with `wc_requires = ['colorpicker']`.
 */
import {getComponentBases} from '../components/bases.js';
import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';



function defineComponents() {
    if (typeof customElements === 'undefined' || customElements.get('gnr-colorpicker')) {
        return;
    }

    const {ControlElement} = getComponentBases();
    class GnrColorpicker extends ControlElement {
        get inputType() { return 'color'; }
        get permanentDecoration() { return false; }
        get controlCss() { return ':host { display: inline-block; }'; }
        get value() { return super.value; }
        set value(v) { this._input.value = v ?? '#000000'; this._nullState.setNull(v === null); }
    }

    customElements.define('gnr-colorpicker', GnrColorpicker);
}

registerComponentCollection('colorpicker', { components: builtinComponents('colorpicker'), defineComponents });
