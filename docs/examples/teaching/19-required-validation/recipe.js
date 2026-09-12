export function build(root) {
    const field = root.textBox({value:'^code', lbl:'Code'});
    field.validate({notnull:true, len:'3:8'});
    root.p('^code', {mask:'Data: %s'});
}
