export function build(root) {
    root.data('draft.notes', 'First line\nSecond line');
    const fields = root.formlet({box_padding: '4px'});
    fields.textBoxArea({value: '^draft.notes', lbl: 'Notes', rows: 5, cols: 48,
        placeholder: 'Write more than one line', maxlength: 240,
        wrap: 'soft', remainingHint: '25%', validate_len: '3:240'});
}
