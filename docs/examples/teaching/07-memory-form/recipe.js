import {Bag} from 'genro-bag-js';

export function build(root) {
    root.data('contact', new Bag({name: 'Ada', email: 'ada@example.com'}));
    const form = root.form({formId: 'contact', datapath: 'contact',
        controllerPath: 'form_state.contact', store: 'memory'});
    const fields = form.formlet({columns: 2});
    fields.textBox({value: '^.name', lbl: 'Name', node_id: 'name', validate_notnull: true,
        validate_call: "return new Promise(resolve => setTimeout(() => resolve(value !== 'taken' || 'Name is already taken.'), 350));"});
    fields.textBox({value: '^.email', lbl: 'Email', node_id: 'email', validate_email: true});
    const actions = form.div({margin_top: '12px'});
    actions.button('Save to memory', {action: 'this.getFormHandler().save();'});
    actions.button('Restore saved values',
        {action: 'this.getFormHandler().restoreBaseline();'});
    const state = root.div({margin_top: '12px'});
    state.span('Dirty: ');
    state.strong('^form_state.contact.dirty');
    state.span(' · Valid: ');
    state.strong('^form_state.contact.valid');
    state.span(' · Pending: ');
    state.strong('^form_state.contact.pending');
}
