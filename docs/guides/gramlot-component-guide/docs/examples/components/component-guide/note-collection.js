// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {getComponentBases, registerComponentCollection} from '../../../../js/dom/src/index.js';

export const noteDescription = {
    name: 'noteField', tag: 'guide-note-field', subTags: '',
    capabilities: ['control', 'decoration', 'null', 'field-state'],
};
registerComponentCollection('guide-fields', {
    components: [noteDescription],
    defineComponents() {
        if (customElements.get(noteDescription.tag)) return;
        const {ControlElement} = getComponentBases();
        class NoteField extends ControlElement {
            get inputType() { return null; }
            _createControl() { return this.ownerDocument.createElement('textarea'); }
            _configure(control) { control.rows = 3; }
        }
        customElements.define(noteDescription.tag, NoteField);
    },
});
