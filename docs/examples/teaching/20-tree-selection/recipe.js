export function build(root) {
    root.data('nodes.people.ada', 'Developer', {caption:'Ada'});
    root.data('nodes.people.grace', 'Developer', {caption:'Grace'});
    root.storeTree({store:'^nodes', selectedPath:'^selected', labelAttribute:'caption'});
    root.p('^selected', {mask:'Selected path: %s'});
}
