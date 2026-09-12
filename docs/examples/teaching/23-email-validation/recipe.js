export function build(root) {
    const field = root.textBox({value:'^email', lbl:'Email'});
    field.validate({notnull:true, email:true, email_iswarning:false});
    root.p('^email', {mask:'Data: %s'});
}
