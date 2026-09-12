export function build(root) {
    root.dateTextBox({value:'^day', lbl:'Date'});
    root.p('^day', {dtype:'D', format:'dd/MM/yyyy', mask:'Numeric: %s'});
    root.p('^day', {dtype:'D', format:'long', locale:'en-GB', mask:'Long: %s'});
}
