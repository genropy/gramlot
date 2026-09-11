export function build(root) {
    const emailValidation = {
        notnull: true,
        email: true,
        email_warning: 'Check address',
    };
    root.data('contacts.primary', 'not-an-address');
    root.data('contacts.backup', 'team@example.com');
    root.textBox({value: '^contacts.primary', lbl: 'Primary email'})
        .validate(emailValidation);
    root.textBox({value: '^contacts.backup', lbl: 'Backup email'})
        .validate(emailValidation);
}
