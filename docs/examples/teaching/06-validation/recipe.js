export function build(root) {
    root.p('Enter 3 to 8 characters, then leave the field.');
    root.data('validation.code', 'ABC');
    const field = root.textBox({value: '^validation.code', lbl: 'Code'});
    field.validate({notnull: true, len: '3:8'});
}
