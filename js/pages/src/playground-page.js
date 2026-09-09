// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Client collection adapter: the complete recipe is pages/playground.py.
import {GramlotBuilder} from './builder.js';
import './codemirror-component.js';

export class PlaygroundBuilder extends GramlotBuilder {
    static wc_requires = [...GramlotBuilder.wc_requires, 'labEditors'];
}
