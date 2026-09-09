// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

export { SourceBag, SourceBagNode, wrapSource, VALUE } from './source-bag.js';
export { BuilderBase } from './builder-base.js';
export { BuilderHandler } from './builder-handler.js';
export { TargetWrapper, DomTarget } from './target-wrapper.js';
export { RendererBase } from './renderer/base.js';
export { HtmlBuilder, HtmlRenderer } from './contrib/html/html-builder.js';
export { SvgBuilder, SvgRenderer } from './contrib/svg/svg-builder.js';
export { HTML5_GRAMMAR } from './contrib/html/html5-elements.js';
export { SVG_GRAMMAR } from './contrib/svg/svg-elements.js';
export { Application } from './application.js';
export { registerCollection, getCollection, webcomponent } from './collections.js';
