// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {HtmlBuilder} from 'gramlot-dom';
import {InspectorController} from './inspector-controller.js';
import '/_assets/dom/collections/inputs.js';
import '/_assets/dom/collections/layout.js';
import '/_assets/dom/collections/forms.js';
import '/_assets/dom/collections/colorpicker.js';
import '/_assets/dom/collections/storetree.js';

import '/_assets/dom/collections/palette.js';
import '/_assets/dom/collections/clipboard.js';

export class GramlotBuilder extends HtmlBuilder {
    attachApplication(application) {
        if (application.options.inspector === false) return;
        application.inspector = new InspectorController(application);
        return () => application.inspector.dispose();
    }
    get root() { return this.source; }
    static data_recipe_alias = true;
    static wc_requires = ['inputs', 'layout', 'forms', 'colorpicker', 'storeTree', 'palette', 'clipboard'];
}
