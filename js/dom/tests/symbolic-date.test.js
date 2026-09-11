import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/inputs.js';

function mount(options = {}) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs'];
        main(root) {
            root.dataSetter({destination:'day', value:'2026-09-01'});
            root.dateTextBox({value:'^day', symbolic:true, locale:'it-IT', workdate:'2026-09-11', ...options});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'));
    const widget = host.querySelector('gnr-datetextbox');
    return {app, widget, input:widget._input};
}
const key = (input, value) => input.dispatchEvent(new window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
function draft(input, text) {
    input.value = text;
    input.dispatchEvent(new window.Event('input',{bubbles:true,composed:true}));
}

test('free text draft commits a typed date only on confirmation, even with live input', () => {
    const {app,widget,input} = mount({updateOn:'input'});
    assert.equal(input.type,'text'); assert.equal(input.value,'01/09/2026');
    input.focus(); draft(input,'oggi+15');
    input.setSelectionRange(1,4); assert.equal(input.selectionStart,1); assert.equal(input.selectionEnd,4);
    assert.equal(app.data.getItem('main.day'),'2026-09-01');
    key(input,'Enter');
    assert.equal(input.type,'text'); assert.equal(input.value,'26/09/2026');
    assert.equal(app.data.getItem('main.day').toISOString().slice(0,10),'2026-09-26'); app.dispose();
});
test('periods select their start; invalid and open-start drafts preserve Data; Escape restores', () => {
    const {app,input} = mount();
    input.focus(); draft(input,'2 trimestre'); key(input,'Enter');
    assert.equal(input.value,'01/04/2026');
    draft(input,'31/02/2026'); key(input,'Enter'); assert.ok(input.validity.customError);
    assert.equal(input.value,'31/02/2026');
    draft(input,'al marzo'); key(input,'Enter'); assert.ok(input.validity.customError);
    key(input,'Escape'); assert.equal(input.value,'01/04/2026'); assert.equal(input.validity.customError,false); app.dispose();
});
test('English blur and ordinary compact/local/ISO dates; symbolic false rejects expressions', async () => {
    const {app,input,widget} = mount({locale:'en-GB'});
    input.focus(); draft(input,'tomorrow'); input.blur(); await Promise.resolve(); assert.equal(input.value,'12/09/2026');
    widget.setAttribute('symbolic','false');
    for(const text of ['010325','01/03/2025','2025-03-01']) { draft(input,text); key(input,'Enter'); assert.equal(input.value,'01/03/2025'); }
    draft(input,'tomorrow'); key(input,'Enter'); assert.ok(input.validity.customError); key(input,'Escape');
    widget.setAttribute('readonly',''); assert.equal(widget._symbolic.button.disabled,true);
    widget._symbolic.open(); assert.equal(widget._symbolic.popup.hidden,true); app.dispose();
});
test('validation adapter rejects invalid drafts and accepts a date on commit', () => {
    const {app,input,widget} = mount({validate_notnull:true});
    input.focus(); draft(input,'nonsense');
    const field=widget._formField; assert.ok(field); assert.equal(field.readCandidate().ok,false);
    assert.equal(app.data.getItem('main.day'),'2026-09-01');
    draft(input,'ieri'); field.commit(null,true);
    assert.equal(app.data.getItem('main.day').toISOString().slice(0,10),'2026-09-10'); app.dispose();
});
test('calendar selection is provisional until outside pointer; dismissal confirms only once', () => {
    const {app,input,widget} = mount(); const editor=widget._symbolic;
    let changes=0; widget.addEventListener('change',()=>changes++);
    editor.button.click(); assert.equal(editor.popup.hidden,false);
    const calendar=editor.calendar;
    calendar.moveMonth(1); assert.equal(calendar.active,'2026-10-01');
    calendar.shadowRoot.querySelector('[data-date="2026-10-12"]').click();
    assert.equal(input.value,'12/10/2026'); assert.equal(editor.popup.hidden,false);
    assert.equal(calendar.shadowRoot.querySelector('[data-date="2026-10-12"]').getAttribute('aria-pressed'),'true');
    assert.equal(widget.value.toISOString().slice(0,10),'2026-09-01');
    assert.equal(app.data.getItem('main.day'),'2026-09-01'); assert.equal(changes,0);
    const outside=document.body.appendChild(document.createElement('div'));
    outside.dispatchEvent(new window.Event('pointerdown',{bubbles:true,composed:true}));
    assert.equal(editor.popup.hidden,true); assert.equal(changes,1);
    assert.equal(app.data.getItem('main.day').toISOString().slice(0,10),'2026-10-12');
    const toggle=new window.Event('toggle'); Object.defineProperty(toggle,'newState',{value:'closed'});
    editor.popup.dispatchEvent(toggle); assert.equal(changes,1);
    app.dispose();
});
test('textbox, trigger and calendar focus form one edit boundary; external focus commits', async () => {
    const {app,input,widget}=mount(); const editor=widget._symbolic;
    input.focus(); draft(input,'oggi+15'); editor.button.focus();
    input.dispatchEvent(new window.Event('change',{bubbles:true}));
    assert.equal(input.value,'oggi+15'); assert.equal(app.data.getItem('main.day'),'2026-09-01');
    editor.button.click(); assert.equal(editor.calendar.active,'2026-09-26');
    editor.calendar.shadowRoot.querySelector('[data-today]').click();
    editor.calendar.shadowRoot.querySelector('[data-month="1"]').focus();
    await Promise.resolve();
    assert.equal(editor.popup.hidden,false); assert.equal(app.data.getItem('main.day'),'2026-09-01');
    input.focus(); assert.equal(app.data.getItem('main.day'),'2026-09-01');
    const outside=document.body.appendChild(document.createElement('button')); outside.focus();
    assert.equal(app.data.getItem('main.day').toISOString().slice(0,10),'2026-09-11');
    assert.equal(editor.popup.hidden,true); app.dispose();
});
test('Escape cancels calendar selection; Clear is provisional and invalid outside draft stays editable', () => {
    const {app,input,widget}=mount(); const editor=widget._symbolic;
    editor.open(); editor.calendar.choose('2026-10-20'); key(editor.popup,'Escape');
    assert.equal(editor.popup.hidden,true); assert.equal(input.value,'01/09/2026');
    assert.equal(app.data.getItem('main.day'),'2026-09-01');
    editor.open(); editor.calendar.shadowRoot.querySelector('[data-clear]').click();
    assert.equal(input.value,''); assert.equal(editor.popup.hidden,false);
    assert.equal(app.data.getItem('main.day'),'2026-09-01');
    input.focus(); key(input,'Enter'); assert.equal(app.data.getItem('main.day'),null);
    draft(input,'nonsense'); editor.open();
    document.body.dispatchEvent(new window.Event('pointerdown',{bubbles:true,composed:true}));
    assert.equal(input.value,'nonsense'); assert.equal(input.validity.customError,true);
    assert.equal(app.data.getItem('main.day'),null);
    widget.setAttribute('disabled',''); assert.equal(editor.button.disabled,true); app.dispose();
});
test('typed date set before connection retains its civil date and locale formatting', () => {
    const {app}=mount(); const detached=document.createElement('gnr-datetextbox');
    detached.setAttribute('locale','en-US');
    const value=new Date('2026-09-01T00:00:00Z');
    detached.setAttribute('value',String(value)); detached.value=value; document.body.append(detached);
    assert.equal(detached._input.value,'09/01/2026'); assert.equal(detached.value.toISOString(),value.toISOString());
    detached.remove(); app.dispose();
});

test('clearing is buffered; locale changes do not reinterpret an active draft', () => {
    const {app,input,widget}=mount();
    draft(input,''); key(input,'Backspace');
    assert.equal(widget.value.toISOString().slice(0,10),'2026-09-01');
    assert.equal(app.data.getItem('main.day'),'2026-09-01');
    key(input,'Enter'); assert.equal(app.data.getItem('main.day'),null);
    draft(input,'03/04/2026'); widget.setAttribute('locale','en-US'); key(input,'Enter');
    assert.equal(widget.value.toISOString().slice(0,10),'2026-04-03');
    assert.equal(input.value,'04/03/2026');
    widget.value=new Date('0001-01-01T00:00:00Z'); assert.equal(input.value,'01/01/0001');
    key(input,'Enter'); assert.equal(widget.value.toISOString().slice(0,10),'0001-01-01');
    app.dispose();
});


test('invalid Italian text can be corrected and the calendar is outside the Tab order', () => {
    const {app,input,widget}=mount();
    assert.equal(widget._symbolic.button.tabIndex,-1);
    draft(input,'pippo'); key(input,'Enter');
    assert.match(input.validationMessage,/Data o espressione non valida/);
    assert.equal(app.data.getItem('main.day'),'2026-09-01');
    draft(input,'oggi'); key(input,'Enter');
    assert.equal(input.value,'11/09/2026');
    assert.equal(input.validity.customError,false);
    assert.equal(app.data.getItem('main.day').toISOString().slice(0,10),'2026-09-11');
    app.dispose();
});
