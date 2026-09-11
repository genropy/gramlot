// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {registerComponentCollection} from '../../../../js/dom/src/components/registry.js';
import {defineGreeting} from './greeting-element.js';

registerComponentCollection('component-guide', {
    components: [{name: 'greeting', tag: 'gnr-guidegreeting', capabilities: ['action']}],
    defineComponents: defineGreeting,
});
