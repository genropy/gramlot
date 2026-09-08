# Formlet — first implementation

Version: 1.0  
Date: 2026-09-08  
Status: Approved first slice implemented in experimental checkouts; unreleased.

`formlet` belongs to the DOM `layout` collection and is declared by Pages Python's
WidgetTestBuilder. It is a layout container, usable with or without a form. It
creates no form controller and inherits normal source/datapath resolution. Its
children remain the original source nodes and light-DOM elements.

## Recipe contract

```python
fields = form.formlet(datapath=".contact", columns=2, gap="8px 16px",
                      padding="8px", fld_font_size="16px", lbl_color="#555")
fields.textBox(value="^.name", lbl="Name", validate_notnull=True)
fields.textBox(value="^.email", lbl="Email")
```

JavaScript uses the same tags and attributes with the keyword-object syntax.
Use `col_min_width="180px"` instead of `columns` for automatic column count.
As in legacy, a supplied col_min_width takes precedence over columns. The
minimum is capped at the available width to avoid horizontal overflow on narrow
screens. `columns` accepts a positive integer or a CSS track list, defaulting to
one column. Standard gap, row_gap, column_gap and padding styles apply to layout;
children use standard grid_column/grid_row styles for placement. Default gap is
7px 20px and padding is 7px. Labels default to top in a formlet.

The host keeps outer placement and sizing; the internal grid owns child layout.
Column changes reconcile the existing container and preserve focused editors.

## Defaults and compatibility

- Explicit child attributes retain precedence, including false, null and empty.
- fld_* supplies immediate-child field defaults; it does not style the formlet.
- lbl_* uses the existing source inheritance; box_* defaults reach immediate
  children and feed their existing label-wrapper mechanism.
- Legacy item_lbl_*, item_fld_* and item_box_* aliases map to those same namespaces.
  Canonical attributes on the formlet beat their item_* aliases.
- Inherited pointer values resolve in the declaring source scope. Source attrs
  are not rewritten. Structural field defaults remain rejected by the common
  policy, and unsupported item_* namespaces produce an explicit error.

This slice does not implement wrap, placeholder labels for unlabeled controls,
formbuilder_formlet, database field discovery, table metadata or formletCode
loading. wrap=True is explicitly rejected rather than silently pretending to
provide a wrapping layout.

## Verification and consumption

DOM tests cover standalone scope/defaults, numeric column validation, changing
columns, responsive configuration, field identity and focus. Pages integration
passes actual Python source through JSON and MessagePack into the JS runtime.
Rosetta's two browser form tests verify responsive two-to-one-column layout in
Python and JS, plus invalid-save blocking, memory save and baseline restoration.
Rosetta consumes the updated forms-client-20260908 dependency snapshot; its
existing gallery examples remain unchanged. No commit or release is made.

Final verification: 209 DOM tests passed; the full Pages suite passed 105 tests,
with the four form/label transport checks repeated after the final renderer fix.
Rosetta passed 16 Python and 45 browser checks; Ruff and diff whitespace checks
passed. Updating reactive style defaults preserves the existing focused editor.
