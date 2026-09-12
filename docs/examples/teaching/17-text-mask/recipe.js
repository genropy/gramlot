export function build(root) {
    root.textBox({value:'^name', lbl:'Name', live:true});
    root.p('^name', {mask:'Hello, %s!'});
    root.p('^name');
}
