// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';

import {Application, HtmlBuilder} from '../../../../js/dom/src/index.js';
import {setupDom} from '../../../../js/dom/tests/dom.js';

setupDom();
const {defineGreeting} = await import('./greeting-element.js');
defineGreeting();
const native = document.body.appendChild(document.createElement('gnr-guidegreeting'));
native.setAttribute('name', 'Ada');
assert.equal(native.shadowRoot.querySelector('button').textContent, 'Hello, Ada!');
let eventName = null;
let eventCount = 0;
native.addEventListener('greet', event => {
    eventName = event.detail.name;
    eventCount += 1;
});
native.shadowRoot.querySelector('button').click();
assert.equal(eventName, 'Ada');
assert.equal(eventCount, 1);
native.remove();
document.body.appendChild(native);
native.shadowRoot.querySelector('button').click();
assert.equal(eventCount, 2); // reconnect installed one listener, not a duplicate

await import('./greeting-collection.js');

class GreetingPage extends HtmlBuilder {
    static wc_requires = ['component-guide'];

    setup() {
        this.setData('person.name', 'Ada');
    }

    main(root) {
        root.greeting({name: '^person.name'});
    }
}

const host = document.body.appendChild(document.createElement('div'));
const app = new Application(host, new GreetingPage('example'));
let greeting = host.querySelector('gnr-guidegreeting');

assert.equal(greeting.shadowRoot.querySelector('button').textContent, 'Hello, Ada!');
app.live(() => app.data.setItem('example.person.name', 'Grace'));
greeting = host.querySelector('gnr-guidegreeting');
assert.equal(greeting.shadowRoot.querySelector('button').textContent, 'Hello, Grace!');
app.dispose();
console.log('Component guide: native element, event, collection and ^ binding OK');

await import('./note-collection.js');
class NotePage extends HtmlBuilder {
    static wc_requires = ['guide-fields'];
    main(root) { root.noteField({value:'^note', lbl:'Note', validate_notnull:true}); }
}
const noteHost = document.body.appendChild(document.createElement('div'));
const noteApp = new Application(noteHost, new NotePage('notes'));
const note = noteHost.querySelector('guide-note-field');
assert.equal(note.fieldControl.tagName, 'TEXTAREA');
assert.equal(note.fieldControl.rows, 3);
note.fieldControl.value='Reusable control';
note.fieldControl.dispatchEvent(new window.Event('change',{bubbles:true}));
assert.equal(noteApp.data.getItem('notes.note'),'Reusable control');
assert.equal(note.getAttribute('data-invalid'),null);
noteApp.dispose();
console.log('Component alpha: shared control, description, field validation and writeback OK');
