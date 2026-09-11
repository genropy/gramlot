# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Recipe for the split tree/property inspector; inspected Bags keep their owner."""


def build_inspector(root, *, presentation="floating"):
    """Compose a compact floating inspector with independent Data/Source views."""
    if presentation not in ("floating", "embedded"):
        raise ValueError("Inspector presentation must be floating or embedded")
    root.data("opened", False)
    root.button("Inspector · Ctrl+Shift+D", **{
        "data-inspector": "toggle", "aria-keyshortcuts": "Control+Shift+D"})
    container = root if presentation == "embedded" else root.palette(title="Inspector", value="^opened", collapsible=True,
                           width="min(640px, calc(100vw - 32px))",
                           height="min(640px, calc(100vh - 32px))", left="16px", top="16px")
    tabs = container.tabContainer(height="100%")
    for kind in ("data", "source"):
        build_view(tabs.tab(key=kind, label=kind.title(), height="100%"), kind)


def build_view(pane, kind):
    """Use the shared splitter and a recipe-authored row template for typed cells."""
    editor = pane.div(role="group", class_="inspector-editor", **{
        "aria-label": "Selected node", "data-inspector": f"{kind}-editor"})
    split = editor.borderContainer(height="100%")
    tree = split.div(slot="top", height="260px", splitter=True, overflow="auto")
    tree.storeTree(selectedPath=f"^{kind}Path", **{"data-inspector": kind})
    properties = split.div(class_="inspector-properties", height="100%")
    toolbar = properties.div(class_="inspector-toolbar")
    toolbar.span("Properties")
    toolbar.button("+", type="button", **{
        "aria-label": "Add attribute", "title": "Add attribute", "data-command": "add"})
    viewport = properties.div(class_="inspector-grid-scroll")
    viewport.div(role="table", **{"aria-label": "Node properties", "data-field": "rows"})
    footer = split.div(slot="bottom", class_="inspector-footer")
    footer.div("", role="status", hidden=True, **{
        "aria-live": "polite", "data-field": "status"})
    path = footer.div(class_="inspector-path", **{"data-field": "path"})
    path.span("Path: ")
    path.span(f"^{kind}Path")
    template = editor.div(hidden=True, **{"data-field": "row-template"})
    row = template.div(role="row", class_="inspector-property-row")
    name = row.div(role="rowheader", class_="inspector-property-name")
    name.input(type="text", **{"data-cell": "name", "aria-label": "Attribute name"})
    cell = row.div(role="cell", class_="inspector-property-value")
    cell.input(type="text", **{"data-cell": "value"})
    choice = cell.select(**{"data-cell": "type"})
    for dtype in ("string", "number", "boolean", "date", "time", "datetime"):
        choice.option(dtype, value=dtype)
    cell.button("−", type="button", **{"data-cell": "remove", "title": "Remove attribute"})
    pane.data(f"{kind}Detail", "Select a node")
    pane.pre(f"^{kind}Detail", hidden=True, **{"data-inspector": f"{kind}-detail"})
