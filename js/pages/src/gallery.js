// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {HtmlBuilder} from 'gramlot-dom';
import '/_assets/dom/collections/inputs.js';
import '/_assets/dom/collections/layout.js';
import '/_assets/dom/collections/colorpicker.js';
import '/_assets/dom/collections/storetree.js';

import '/_assets/dom/collections/palette.js';
import '/_assets/dom/collections/clipboard.js';

export class GalleryBuilder extends HtmlBuilder {
    static data_recipe_alias = true;
    static wc_requires = ['inputs', 'layout', 'colorpicker', 'storeTree', 'palette', 'clipboard'];
}
