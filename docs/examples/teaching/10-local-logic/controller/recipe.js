export function build(root) {
    root.textBox({value: '^name', lbl: 'Name', updateOn: 'input'});
    root.dataController({func: "this.SET('message', `Hello ${name}`)", name: '^name'});
    root.p('^message');
}
