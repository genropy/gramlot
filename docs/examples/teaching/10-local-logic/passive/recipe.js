export function build(root) {
    root.numberTextBox({value: '^quantity', lbl: 'Quantity', updateOn: 'input'});
    root.numberTextBox({value: '^price', lbl: 'Price', updateOn: 'input'});
    root.dataFormula({destination: 'total', formula: 'quantity * price', quantity: '^quantity', price: '=price'});
    root.p('^total');
}
