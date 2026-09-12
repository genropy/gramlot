export function build(root) {
    root.dateTextBox({value:'^day', lbl:'Date'});
    root.p('^day', {dtype:'D', format:'dd/MM/yyyy'});
}
