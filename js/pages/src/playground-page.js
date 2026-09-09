// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Client collection adapter: the complete recipe is pages/playground.py.
import {GalleryBuilder} from './gallery.js';
import './codemirror-component.js';

export class PlaygroundBuilder extends GalleryBuilder {
    static wc_requires = [...GalleryBuilder.wc_requires, 'labEditors'];
}
