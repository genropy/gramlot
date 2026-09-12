export function build(root) {
    const field = root.numberTextBox({value:'^quantity', lbl:'Quantity'});
    field.validate({notnull:true, min:1, max:10});
    root.p('^quantity', {mask:'Data: %s'});
}
