# Tree row actions

`gnr-storetree` supports optional actions on branch and leaf rows. Configure the
mounted component through its `rowActions` property:

```javascript
tree.rowActions = [
    {id: 'edit', icon: '✎', label: 'Edit parameters'},
    {id: 'delete', icon: '🗑', label: 'Delete block'},
];
tree.addEventListener('tree-action', ({detail}) => {
    // detail.action is the configured id; detail.path is relative to storeBag.
    // detail.node is the current Bag node. The consumer performs the operation.
});
```

Icons are plain text (emoji are supported), and labels supply tooltips and
accessible button names. Actions appear on row hover or keyboard focus within
the row; on devices without hover they remain visible. Space is reserved so
captions do not shift when actions appear. Action clicks neither select nor
toggle the branch. Setting `rowActions = []` removes them. Bag redraws retain the
configuration. No actions or mutations are enabled by default.

This API configures the mounted JavaScript component; it does not add a new
Python recipe parameter. Rosetta's builder uses it for Source edit/delete; its
Data tree and other inspectors retain their existing behavior.
