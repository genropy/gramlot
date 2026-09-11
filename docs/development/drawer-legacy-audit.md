# Border container drawer source audit

## Related discovery: rounded corners in FramePane

The owner's nested-corner adaptation was located in legacy
`gnrjs/gnr_d11/js/genro_components.js:809-897`, FramePane.createContent.
It normalizes rounded/rounded_* to four corners, then assigns and consumes
the corners belonging to each occupied side. The processing order is top,
bottom, left, right for the default design; sidebar processes left/right first.
The center gets unconsumed corners. A nested FramePane receiving those attributes
can apply the same construction rule to its own children. This is structural
corner propagation during construction, not CSS inheritance or arbitrary
geometric contact detection.

`genro_dom.js:635-673` normalizes generic, side-specific and corner-specific
rounded attributes and translates the result to individual CSS border radii.
The located propagation does not calculate border/padding offsets, and it does
not establish reactive recomputation for every later layout change. Existing
center attributes override propagated values in the merge; side propagation
directly assigns nonzero inherited corner values. These are observed details,
not proposed Gramlot precedence rules.

Date: 2026-09-10. Read-only source investigation; no runtime changes or fresh
browser certification. Authorization and toolbar work are deferred separately.

## Legacy contract observed

Source: `/Users/gporcari/Sviluppo/Genropy/genropy/gnrjs/gnr_d11/js/genro_widgets.js`,
base widget preparation near line 204 and BorderContainer methods near
2504-2778. A drawer is attached to a regional child, not a separate modal.

- `drawer=True` enables the handle; `drawer='close'` starts collapsed.
- The base preparation supplies a splitter to the underlying Dojo widget.
  `mixin_addDrawerHandle` separately reads the source `splitter` setting:
  without it the handle is fixed and dragging is disabled. Drawer presence
  therefore does not itself mean author-requested resizing.
- `drawer_label`, `drawer_class`, `drawer_style`, and style-bearing `drawer_*`
  attributes customize the opener. Explicit prefixed style fields override the
  parsed drawer_style dictionary. The label is inserted as HTML in legacy.
- `drawer_onclick` receives `evt` and the resulting `show` value, with the pane
  Source node as callback context, after toggling visibility.
- Region visibility hides the pane, retains/restores its dimension, adjusts
  splitter thickness and relayouts the border container. CSS overflow keeps the
  opener usable at the collapsed edge.
- The `regions` data structure and region visibility methods provide related
  size/show controls. Reading an initial drawer binding is not proof of complete
  bidirectional drawer-state synchronization.

Real application example: `resources/common/gnrcomponents/source_viewer/source_viewer.py`
near lines 29-35 uses drawer_background, drawer_top, drawer_label, drawer_width,
drawer_left and drawer_height for the Code tab. The GNRIde component has open
and initially closed drawers with splitter=True on opposite sides.

## Related but distinct closable mechanism

Owner correction after this audit: at the authoring/behavior level, closable
implied drawer capability. The distinct functions below are implementation
paths, not evidence of independent public concepts. Preserve that relationship;
the exact opener/close-control mapping still needs verification.

`addClosableHandle`/`onChildCreated` use `closable` and `closable_*` rather than
drawer attributes. They support label/icon/custom positioning, remember pane
dimensions, hide the splitter and publish `closable_change` with `{open}`.
Do not accidentally present their options as drawer options or automatically
port both as duplicate Gramlot mechanisms.

## Current Gramlot boundary

`js/dom/src/collections/layout.js` implements `_setupSplitters` and
`_setupDrawers` near lines 220-318. It supports four edge regions, a clickable
arrow opener and initial `drawer='close'`. Closed regions use a fixed 24px strip;
the content and resizing handle are hidden. Drawer presence also enables the
resizing implementation, unlike the fixed legacy drawer distinction.

The current drawer path does not consume the rich drawer_* handle options or
publish a drawer state callback. It stores closed state in a DOM class and
creates an ordinary div click target, with no explicit keyboard/focus contract.
Existing region tests include an initial drawer-close case; this audit does not
claim full legacy parity or dynamic region replacement correctness.

## Suggested next bounded contract

Preserve the simple regional drawer use and distinguish these concerns:
collapsibility/initial state; optional resizing; handle content/style/placement;
observable open state; dimension and child-instance preservation; keyboard and
pointer operation. Reuse common attribute/style mechanisms instead of a second
styling vocabulary. Decide whether the separate legacy closable use cases fit
the same new behavior before implementation. Exact names and new API syntax
are not selected by this audit.

## Bidirectional region sizes — owner clarification and source verification

The owner requires preserving a data path for panel dimensions: changing the
data adjusts the panel/splitter, and resizing writes the new dimension back.
In the inspected legacy code, `regions` identifies a Bag with entries named
for regions. `afterStartup` applies the existing entries;
`mixin_setRegions` applies each value as width for left/right or height for
top/bottom and can also apply the entry's show attribute. It relayouts the
container. `onSplitterStopDrag` writes the resulting CSS dimension string to
the region entry with source attribution (`doTrigger: sourceNode`). The observed
writeback happens at drag completion, not necessarily every pointer movement.
Dynamic notification wiring should be exercised before certifying full parity.

Current Gramlot splitter dragging updates cell styles locally; this region-size
Bag synchronization is not implemented by that path. The future contract needs
to preserve remembered expanded size across drawer collapse, avoid writeback
feedback loops and specify when drag changes commit. This note records the
requirement and verified legacy hooks, not authorization to implement a new API.
