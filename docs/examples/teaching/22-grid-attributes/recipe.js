export function build(root) {
    root.data('rows.ada', null, {name:'Ada', amount:1234.567});
    root.data('rows.grace', null, {name:'Grace', amount:98.765});
    const grid = root.quickGrid({value:'^rows', datamode:'attr', height:'180px'});
    grid.column('name', {name:'Name', width:140});
    grid.column('amount', {name:'Amount', dtype:'N', places:2, width:140});
}
