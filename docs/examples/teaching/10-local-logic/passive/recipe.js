export function build(root) {
    root.numberTextBox({value: '^quantity', lbl: 'Quantity', live: true});
    root.numberTextBox({value: '^price', lbl: 'Price', live: true});
    root.dataFormula({destination: 'total', formula: 'quantity * price', quantity: '^quantity', price: '=price'});
    root.p('^total');
}
