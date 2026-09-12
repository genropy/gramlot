# Legacy drag-and-drop audit

Date: 2026-09-12

## Purpose and status

This document records a read-only investigation of drag, drop, movement, resizing,
and stacking in the legacy Genropy browser runtime, and compares those mechanisms
with the current Gramlot implementation. It is evidence for design work, not an API
proposal and not authority to implement `canvasBox`.

The investigation was made against these trees:

- **LEGACY**: `/Users/gporcari/Sviluppo/Genropy/genropy`, commit
  `418b4454a6e08445817e858a1b5d2a2c91c2dbf5` (2026-09-09).
- **GRAMLOT**: the canonical repository containing this report.

Paths below are relative to one of those roots and are prefixed with **LEGACY** or
**GRAMLOT**. Line references describe the inspected revisions. “Inspected” means a
conclusion follows from source reading. “Tested” means an existing automated test
was run or an existing assertion directly exercises the behavior. The legacy web
pages cited below are executable examples, but they were not launched in a browser
during this audit.

The maintained Gramlot decision register already fixes one boundary: groupBox copy
exports its associated Data branch, and its initial drag supplies a payload;
reordering, drop handling, and floating-window behavior remain future work
(GRAMLOT `docs/context/decisions.md:95-104`). It also says legacy is evidence rather
than an unconditional specification and requires pointer/touch, handles,
cancellation, keyboard, scrolling, and zoom to be considered as first-class mobile
concerns (`docs/context/decisions.md:226-236`). This audit preserves those
boundaries.

The current design discussion treats `canvasBox` as a possible specialized
`groupBox` that hosts freely positioned children, including nested `canvasBox`,
`groupBox`, `labledBox`, and other widgets. Each canvas would own its children's
positions and stacking order. Those points are design directions. A draggable
`labledBox`, with its label as a possible handle, is an unapproved idea. The legacy
mechanisms do not by themselves approve any of these names or contracts.

## Executive findings

Legacy Genropy has two materially different interaction systems:

1. a native HTML5 drag-and-drop transport used to offer typed data to a target; and
2. Dojo mouse-based movement and resizing that writes CSS geometry on live DOM
   nodes.

The first system does not generally reposition the source object. A consumer may
mutate a Bag or grid store after a drop, and the special “detachable” path may move
a live node into a floating pane, but these are separate policies. The distinction
matches Gramlot's current `groupBox`: it exports a data snapshot with a copy effect
and leaves Source and Data unchanged.

Legacy drag/drop is broad but loosely bounded. It supports arbitrary custom
transfer types, tags, inherited callbacks, files, text, HTML, tree nodes, grid rows,
cells, columns, and selections. It also uses a page-global `localStorage` mirror for
typed values. Acceptance filters route callbacks; they are not a trust boundary.
Central file checking is by filename extension only, and typed JavaScript decoding
has an evaluation fallback. Several authoring names are extracted but not used by
the observed execution path, and the generic drop target resolution is fragile for
nested Source nodes.

Legacy movement is based on page mouse coordinates and the immediate DOM parent's
box. It has no observed canvas model, zoom compensation, rotation, snapping,
multi-selection, or data-backed local coordinates. Floating panes and palettes use
a global z-index population. That is different from a recursively nested canvas in
which each parent owns a local coordinate and stacking system.

Current Gramlot has a deliberately smaller surface. `groupBox` implements only a
validated, values-only data offer from its header. `labledBox` and `widget-label`
provide decoration and layout without movement. `palette` has pointer-based,
viewport-local move and resize behavior, plus opt-in keyboard movement, but uses a
global static z-index counter. There is no generic framework drop service. A nested
drag ownership problem is visible in the current `groupBox` handler: an outer
groupBox can cancel a drag that originated from an inner groupBox header.

These findings do not establish full legacy compatibility as a useful or achieved
goal. They identify capabilities that can be selected deliberately and quirks that
should not be copied.

## Capability inventory

| Area | Legacy evidence | Current Gramlot evidence | Status and consequence |
| --- | --- | --- | --- |
| Authoring | Arbitrary Python Source attributes pass through `GnrDomSrc.child`; the JS builder extracts drag/drop attributes. LEGACY `gnrpy/gnr/web/gnrwebstruct/base.py:209-267`; `gnrjs/gnr_d11/js/genro_widgets.js:150-171` | Python declarations accept `**kwargs`; the renderer serializes attributes and injects component services. GRAMLOT `src/gramlot/grammar/layout.py:36-37`; `src/gramlot/grammar/decoration.py:9-10`; `src/gramlot/grammar/widgets.py:12-13`; `js/dom/src/contrib/html/html-builder.js:46-179` | Neither generic Python signature alone proves a supported drag API. Runtime consumption is authoritative. |
| Global DnD installation | Body/default pane listeners for native `dragstart`, `dragend`, `dragover`, and `drop`. LEGACY `gnrjs/gnr_d11/js/genro.js:664-681,1008-1014` | No equivalent application-wide drag/drop service was found. | Legacy centralizes event dispatch; Gramlot components currently own their behavior. |
| Drag transport | Native `DataTransfer`, plus a `localStorage` mirror for non-string typed objects. LEGACY `genro_dom.js:1246-1383` | Native `DataTransfer` with standards-shaped MIME strings. GRAMLOT `js/dom/src/collections/layout/group-box.js:98-113` | The legacy mirror is not needed to preserve a DOM object's position and creates stale/cross-page state questions. |
| Payload source | Widget handler result, `value`, `innerHTML`, or DOM HTML; inherited `onDrag` and `onDrag_*` may add values. LEGACY `genro_widgets.js:482-499`; `genro_dom.js:1284-1322` | `groupBox` exports a Data Bag snapshot for its datapath. | Gramlot has a narrower and clearer contract. |
| Payload types | Arbitrary keys; examples include `text/plain`, `text/xml`, `text/html`, `nodeattr`, `treenode`, `gridrow`, `gridcell`, `gridcolumn`, `dbrecords`, and self-drag types. | `application/x-gramlot-group+json` and `application/json`. | Legacy type vocabulary should be treated as migration evidence, not copied wholesale. |
| Type encoding | `value::dtype`; the encoder emits Bag XML with lowercase `bag`, objects as typed JSON (`JS`), and primitive dtype suffixes. The decoder has `BAG`/`X` branches. LEGACY `gnrlang.js:970-1057,1441-1512` | Values-only JSON with explicit validation. GRAMLOT `js/dom/src/components/data-scope.js:4-46` | “Bag transfer” in legacy means serialized XML, and its inspected suffix round-trip is internally inconsistent; it is not the same object model as Gramlot's JSON snapshot. |
| Source metadata | `dragsourceinfo` carries Source ids, detach/mode/page and tags. LEGACY `genro_dom.js:1333-1354` | Gramlot payload includes `datapath`, `sourceId`, and `data`. | A future drop service needs a defined provenance contract rather than implicit DOM references. |
| Acceptance | `dropTypes`, callback suffixes, `dropTags`, and optional `dropTargetCb`. LEGACY `genro_dom.js:897-950`; `genro_widgets.js:300-316` | No generic target/acceptance mechanism. | This is the largest missing reusable capability if data drops are required. |
| Drop callbacks | Aggregate `onDrop({dropInfo,data})`; typed `onDrop_<sanitized-type>(dropInfo,data)`; files are special. LEGACY `genro_dom.js:1216-1243` | No generic callbacks. | Exact callback shape is legacy evidence only. |
| Effects and modifiers | Core overwrites effect with `move`; Shift gates detach; modifiers are reported in `dropInfo`. LEGACY `genro_dom.js:951-965,1084-1100,1388-1402` | `groupBox` sets `effectAllowed='copy'`. | Copy/move must describe domain mutation, not merely browser cursor decoration. |
| Generic move | Dojo `Moveable`, optional parent constraint and handle, writes `style.left/top`. LEGACY `genro_widgets.js:260-283`; `dojo_libs/dojo_11/dojo_src/dojo/dnd/Moveable.js:13-114`; `dojo/dnd/Mover.js:8-80` | No generic movable component. Palette implements its own gesture. | A canvas needs persistent model coordinates, not only DOM mutation. |
| Resize | Browser CSS `resize` in examples; Dojo `ResizeHandle` for floating panes. LEGACY `projects/gnrcore/packages/test/webpages/html/moveable.py:11-21`; `dojox/layout/ResizeHandle.js:10-233` | Palette has a pointer resize handle. Grid has a separate column-resize interaction. | Resizing should be a separate capability with its own ownership and persistence. |
| Stacking | Floating panes globally reorder one population; Genro starts around z-index 700. LEGACY `dojox/layout/FloatingPane.js:272-290`; `genro_widgets.js:2827-2829` | `Palette.level` is a global static counter starting at 1000. GRAMLOT `js/dom/src/collections/palette.js:9,110-112` | Neither provides per-canvas local stacking. |
| `labledBox` and formlet | `labledBox` is decoration and formlet expands to gridbox; neither owns a separate DnD protocol. LEGACY `gnrpy/gnr/web/gnrwebstruct/base.py:1009-1065`; `gnrjs/gnr_d11/js/genro_widgets.js:834-895` | Both are layout/decoration only. GRAMLOT `js/dom/src/collections/layout/formlet.js:6-32`; `js/dom/src/collections/decoration/labled-box.js:7-27` | They may contain generic draggable descendants, but containment is not gesture ownership. |
| FramePane/FrameForm | FramePane assembles BorderContainer regions; FrameForm wraps it with form/store context. LEGACY `gnrpy/gnr/web/gnrwebstruct/base.py:299-378`; `gnrjs/gnr_d11/js/genro_components.js:809-983` | FramePane is a recorded target requirement but has no current component implementation. GRAMLOT `docs/context/open-work.md:131-138` | A frame is composition context, not evidence for canvas movement semantics. |
| Nested targets | Exact resolved Source node must qualify; no retry on an ancestor Source target. LEGACY `genro_dom.js:991-1075` | Outer `groupBox` listeners can see and cancel an inner header drag. | Nested ownership needs an explicit rule and regression tests. |
| Touch | Mobile conditionally loads `DragDropTouch.js`; Dojo Moveable is patched for touch events. LEGACY `gnrpy/gnr/web/gnrwebpage.py:1396-1398`; `resources/js_libs/DragDropTouch.js:149-271,383-405`; `genro_mobile.js:169-244` | Palette uses Pointer Events and pointer capture. | Legacy is compatibility shimming, not evidence of a complete modern pointer contract. |
| Keyboard | No keyboard data DnD or generic movement was found. | Palette optionally moves with arrow keys and closes with Escape. | Canvas keyboard positioning and reordering remain design work. |
| Lifecycle | Global listeners live with the page; `Moveable.destroy()` disconnects; custom grouplet code demonstrates listener staleness. | Palette clears active gesture state and its window listener; groupBox invalidates asynchronous copy completion on disconnect, while its element-owned drag listener is installed once in the constructor. | Nested removal, canceled drag cleanup, and source disappearance need focused tests. |

## Authoring and builder transformation in legacy Genropy

The Python authoring layer does not define a closed drag/drop schema. `GnrDomSrc.child`
accepts arbitrary keyword arguments and stores them as Source attributes
(LEGACY `gnrpy/gnr/web/gnrwebstruct/base.py:209-267`). Before it creates the
rendered widget, the browser builder removes some attributes from the rendered
constructor attributes and saves only the ones needed after creation:

- it saves `moveable` and `moveable_*` at LEGACY
  `gnrjs/gnr_d11/js/genro_widgets.js:150-160`;
- it removes `onDrop`, `onDrag`, `dragTag`, `dropTag`, `dragTypes`, `dropTypes`, and
  `onDrop_*` at `genro_widgets.js:163-164`, relying on the Source node's original
  attributes for inherited callback dispatch;
- it saves `dropTarget`, `dropTargetCb`, and `dropTargetCb_*` at
  `genro_widgets.js:165-169` so it can install target callbacks after creation;
- `draggable`, plural `dragTags`/`dropTags`, and `onDrag_*` are not extracted by
  this generic block; the runtime still reads them from the Source node and, where
  applicable, the rendered node receives ordinary attributes.

The original attributes remain on the Source node even though the builder removes
them from the attributes sent to the widget constructor. After creation, the
builder can create a Dojo Moveable, compile drop callbacks, mark a Source node as a
drop target, and set the rendered node's native `draggable` property
(LEGACY `genro_widgets.js:260-325`).

The active generic runtime reads plural `dragTags` and `dropTags`. The singular
`dragTag`/`dropTag` names and the extracted `dragTypes` were not found in the core
execution path. Their extraction is therefore not proof that they work. This is a
representative legacy hazard: the apparent authoring vocabulary is larger than the
observed contract.

There is no distinct legacy `groupBox` widget in the inspected core. Pages use
styled `div` containers or `labledBox` for related presentation. Legacy `formlet`
is a Python convenience that expands to a `gridbox`, promotes item defaults, and
sets layout classes (LEGACY `gnrpy/gnr/web/gnrwebstruct/base.py:1009-1065`). It does
not install its own drag/drop protocol. Because generic Source attributes are open
and inherited, a formlet or its descendants can still participate in the generic
pipeline; that is ordinary container behavior, not a formlet-specific contract.

Similarly, legacy `FramePane` constructs a BorderContainer and distributes top,
bottom, left, right, and center children. `FrameForm` adds form/store context by
constructing a FramePane (LEGACY `gnrpy/gnr/web/gnrwebstruct/base.py:299-378`;
`gnrjs/gnr_d11/js/genro_components.js:809-983`). Neither handler defines a special
drag payload or spatial movement system. Draggable grids, trees, uploaders, or
detachable content inside a frame use their own or the generic mechanisms.

A minimal authentic example is:

```python
def main(self, root, **kwargs):
    fb = root.formbuilder(cols=2, border_spacing='4px')
    fb.div('drag foo', dragTags='foo', lbl='drag with foo', draggable=True)
    fb.div('drop foo', dropTarget=True, dropTypes='text/plain',
           dropTags='foo', onDrop="console.log(data)")
```

This is adapted only by omitting unrelated sibling examples from LEGACY
`projects/gnrcore/packages/test/webpages/drag_drop/dragdrop.py:28-55`. That page's
comments document `onDrag(dragValues, dragInfo, treeItem)` and false cancellation.
Its prose also suggests that `dragTags` can imply draggable behavior, but every
shown source still sets `draggable=True`, and the inspected builder does not make
that conversion. Treat the prose claim as unverified or stale.

## Legacy native drag execution flow

### Listener installation

Application startup calls `genro.dragDropConnect()` after building and starting the
Source (LEGACY `gnrjs/gnr_d11/js/genro.js:664-681`). It connects four native events
on the body or default page pane to methods on `genro.dom`:

```text
dragstart -> onDragStart
dragend   -> onDragEnd
dragover  -> onDragOver
drop      -> onDrop
```

The connections are at LEGACY `genro.js:1008-1014`. Dialog setup has an additional
connection path at `gnrjs/gnr_d11/js/genro_widgets.js:1823`. This is browser-native
HTML5 drag transport with a custom dispatch layer; it is not implemented as pointer
movement.

### Source and target identity

`getEventInfo(event)` begins at `event.target`. If that DOM node has a `sourceNode`,
it uses it. Otherwise it finds both the nearest ancestor with a Source node and the
enclosing Dijit widget. It selects the ancestor Source node when that node is inside
the widget's Source subtree; otherwise it selects the widget root
(LEGACY `gnrjs/gnr_d11/js/genro_dom.js:991-1029`). A widget handler may then augment
the result with `customEventInfo`.

`getDragDropInfo(event)` adds drag- or drop-specific information
(LEGACY `genro_dom.js:1032-1075`). For a drag, it reads the `dragmode` attribute and
calls the widget handler's `fillDragInfo`. For a drop, it accepts the resolved
Source node only if that exact node has `dropTarget`, grid self-drag attributes, or
stored drop callbacks. It does not walk Source-node ancestors looking for the first
drop target.

That exact-node rule has a consequence for nested content. If a container declares
`dropTarget=True` and a rendered descendant resolves to a different Source node
without `dropTarget`, the generic dispatcher returns no `dropInfo`; it does not
retry the parent. Since the body `dragover` handler still prevents the browser
default, a descendant can become a drop dead zone. This is an inference from the
dispatcher and event handlers, not a browser-tested result in this audit.

### Drag start

`onDragStart(event)` is at LEGACY `genro_dom.js:1254-1354`:

1. It adds the `draggingElement` CSS class. An image target is a special case; on
   Firefox it clears `text/html` and returns without entering the generic pipeline.
2. It stops propagation and rejects a target whose native `draggable` is false.
3. It resolves `dragInfo` and calls the widget handler's `onDragStart(dragInfo)`.
4. The base HTML handler returns a `text/plain` payload selected from `dragValue`,
   `value`, `innerHTML`, or the DOM's `innerHTML` (LEGACY
   `gnrjs/gnr_d11/js/genro_widgets.js:482-499`). A handler may return false to
   cancel.
5. It compiles inherited `onDrag` with the exact formal argument list
   `dragValues,dragInfo,treeItem`. It also finds inherited `onDrag_*` callbacks and
   invokes all of them so each can mutate the payload envelope.
6. It briefly applies a configurable drag image class, defaulting to `draggedItem`,
   then removes it after one millisecond.
7. It combines inherited `dragTags` with any `dragTags` property removed from the
   payload.
8. It serializes every payload value and adds `dragsourceinfo`.

The ordinary `onDrag` callback can cancel by returning false. The implementation
uses `else if` after the `onDrag_*` branch, so that false check is skipped whenever
any `onDrag_*` callbacks exist (LEGACY `genro_dom.js:1284-1297`). This looks like an
implementation quirk, not a sound compatibility requirement.

`dragsourceinfo` contains the public `nodeId`, internal Source `_id`, `detachable`,
`dragmode`, `page_id`, and combined `dragTags`
(LEGACY `genro_dom.js:1333-1354`). It describes provenance and policy; it does not
move a Source or Data node.

### Serialization and transport

`setInDataTransfer` writes a textual form into both native `DataTransfer` and a
page-global `localStorage` object named `_transferObj`
(LEGACY `genro_dom.js:1246-1252,1324-1330`). `getFromDataTransfer` prefers the
mirrored value and falls back to the browser value, while `dataTransferTypes`
merges both sets of type names (`genro_dom.js:1357-1383`).

`convertToText` and `convertFromText` implement the actual type protocol
(LEGACY `gnrjs/gnr_d11/js/gnrlang.js:970-1057,1441-1512`). Text types remain bare
strings. Other values are suffixed as `value::dtype`. Relevant observed encodings
include:

| Value family | Legacy dtype and representation |
| --- | --- |
| null | `NN` |
| string | `T` |
| integer/number/boolean | `L`, `N`, `B` and related primitive dtypes |
| date/time | `D`, `H`, `DH`, `DHZ`, `TD` |
| Bag | Encoder: XML followed by lowercase `bag`; decoder branches: `BAG` or `X` |
| object | typed JSON followed by `JS` |

The decoder recognizes HTML, RPC, JSON, arrays, primitive and temporal dtypes, Bag
XML, and typed JavaScript objects. There is an inspected case mismatch in its Bag
path: `convertToText` returns dtype `bag`, while the suffix-recognition list checks
for uppercase `BAG` before the later `toUpperCase()` call. Thus the code appears to
leave `::bag` attached to the XML passed to the Bag constructor. Whether any
historical parser tolerance or caller-supplied dtype masks this problem was not
browser-tested here. For `JS`, the decoder tries `JSON.parse` and a typed-value
mapper, with `genro.evaluate` as a fallback. This is evidence of a permissive legacy
trust model. It should not be adopted as a browser boundary in Gramlot.

No TYTX media type or TYTX envelope participates in this inspected drag/drop path.
Legacy DnD calls the generic typed-text conversion functions directly. Current
Gramlot uses TYTX elsewhere for Source hydration, while current groupBox DnD writes
only its two JSON MIME values. Keeping these transports distinct avoids attributing
capabilities to the drag payload that it does not have.

The `localStorage` mirror makes richer same-origin in-browser values possible, but
it also deserves skepticism. It is global by key, is not visibly cleared at drag
end, and is reset only when the legacy pipeline starts a new internal drag. An
external drag that follows an internal one may therefore observe merged stale type
names or values. Same-origin tabs can also share localStorage. These consequences
are source-based inferences and need a controlled browser experiment before being
stated as reproduced defects.

### Acceptance, tags, and drag-over sequencing

`canBeDropped(dataTransfer, sourceNode)` is at LEGACY `genro_dom.js:897-950`:

1. A source marked detachable is accepted immediately with the special result
   `detach`.
2. Supported target types come from inherited `dropTypes` plus the suffix of every
   inherited `onDrop_*` callback.
3. The supported set is matched against offered transfer types.
4. With no `dropTags`, a type match is sufficient.
5. Tags use comma-separated alternatives. Each alternative may require terms with
   the exact separator ` AND `. A `!tag` excludes a source. The code also rewrites
   the exact text `' NOT '` (including the quote characters) to ` AND !`.

Matching is case-sensitive and literal. The implementation does not escape or
normalize tag values. Its `exclude` temporary is assigned without a declaration,
another legacy quirk. Types are matched with a helper, while drop dispatch later
uses a different wildcard expression. Tags and types select a handler; they do not
authenticate a source or validate content.

`onDragOver(event)` tracks the last raw DOM target and manually generates enter and
leave transitions. It runs an inherited `dragOverCb` when present, then always
stops propagation, prevents the default, and sets `dropEffect='move'`
(LEGACY `genro_dom.js:951-965`). `onDragEnter` rechecks acceptance, sets both
`effectAllowed` and `dropEffect` to `move` or `none`, and outlines the target
(`genro_dom.js:1084-1115`). Because the continuing drag-over path writes `move`
again, browser cursor feedback may not reliably describe later application
acceptance.

The modifiers are copied into event information as a comma-separated string drawn
from Shift, Ctrl, Alt, and Meta state (LEGACY `genro_dom.js:1388-1402`). The core
does not implement a general modifier-to-copy/link/move policy. Shift specifically
enables the detachable path. Otherwise the central implementation overwrites the
effect as `move`, regardless of whether a consumer ultimately copies data.

### Drop dispatch and cleanup

`onDrop(event)` first clears the outline, stops propagation, and prevents the
browser default. It handles `detach`, then calls `canBeDropped` again; a rejected
drop returns without invoking callbacks (LEGACY `genro_dom.js:1168-1196`). Clearing
the outline removes drag classes and publishes `endDrag`. `onDragEnd` repeats the
same cleanup (`genro_dom.js:1384-1387`), so subscribers may see more than one end
notification depending on the event sequence.

Standard dispatch is at LEGACY `genro_dom.js:1216-1243`. A native type name is
converted to a callback suffix by replacing non-word characters with underscores:
`text/plain` becomes `onDrop_text_plain`. For each offered type other than
`dragsourceinfo`, the dispatcher tries configured target types with a single
`*`-to-`(.*)` regular-expression replacement. The expression is neither escaped
nor explicitly anchored.

A type-specific callback has the effective signature:

```javascript
onDrop_<type>(dropInfo, data)
```

It is compiled with the Source node as its execution context. Values without a
type-specific callback are collected under sanitized type names. The aggregate
callback then receives a named parameter object equivalent to:

```javascript
onDrop({dropInfo: dropInfo, data: values})
```

There is an internal inconsistency around default types. Standard dispatch defaults
its `dropTypes` to `text/plain`, but `canBeDropped` constructs an empty supported
set unless `dropTypes` or an `onDrop_*` callback supplies a type. Consequently,
`dropTarget=True` plus only aggregate `onDrop` may be rejected before reaching the
dispatch default. This was inspected, not reproduced in a browser.

The source may provide an optional `dropTargetCb(dropInfo)` or
`dropTargetCb_<type>(dropInfo,data)` compiled by the builder with those exact formal
parameters (LEGACY `genro_widgets.js:300-316`). These callbacks can apply consumer
policy before the standard drop callback. Each type-specific target callback is
called during target resolution and a false result marks the target invalid. Its
suffix is not added to `canBeDropped`'s supported type set, however; an accompanying
`dropTypes` or `onDrop_<type>` is still needed for the later acceptance check. That
is inspected coupling, not a recommended callback design.

### External files, text, and HTML

Native `text/plain` and `text/html` participate like other transfer types. There is
no URL-specific central handler in the inspected pipeline. The image-source special
case at drag start is browser compatibility behavior, not image validation.

Files take a special route when the browser advertises exact type `Files` and the
target accepts exact type `Files`. `onDrop_files` receives files after optional
`drop_ext` filtering. Filtering lowercases the filename extension and compares it
with a split list. The aggregate callback receives named parameters equivalent to
`{dropInfo, files}` (LEGACY `genro_dom.js:1197-1214`). The central layer does not
inspect MIME content, file signatures, size, or malicious markup. Some consumers,
such as upload widgets, add form lock and size checks, but that is consumer policy.

No central sanitation was found for HTML, XML Bags, JSON/JS objects, filenames, or
arbitrary callback output. The `dropTypes` and `dropTags` filters should therefore
be described as routing and acceptance hints, not security validation.

## Widget-specific legacy payloads

### Tree

The tree handler resolves the dragged tree node and Bag item, then offers:

- `text/plain`: the caption;
- `text/xml`: the same caption in the inspected implementation;
- `nodeattr`: item attributes;
- `treenode`: an object with `fullpath` and `relpath`.

The handler is at LEGACY `gnrjs/gnr_d11/js/genro_tree.js:326-350`. A tree patch sets
the rendered Bag tree-node elements as draggable based on the Source attribute at
`gnrjs/gnr_d11/js/genro_patch.js:1448-1474`.

An authentic compact example is:

```python
root.tree(storepath='.store', dropTarget=True, draggable=True,
          onDrag="dragValues['customtype'] = treeItem.attr",
          onDrop_text_plain="console.log(data)",
          onDrop_treenode="console.log(data)")
```

The source page is LEGACY
`projects/gnrcore/packages/test/webpages/drag_drop/dragdrop_tree.py:15-27`.

### Grid rows, selections, cells, and columns

The grid pipeline is substantially richer than base HTML. `onDragStart` cancels
while a grid editor is active and classifies the origin as row, cell, or column
(LEGACY `gnrjs/gnr_d11/js/genro_grid.js:2216-2435`).

For a row drag it reconciles the clicked row with the current selection, orders the
selected indexes, and can produce:

- `text/plain`: tab-separated values;
- `text/xml`;
- `text/html`: a table;
- `gridrow`: structured row data;
- `dbrecords`: optional database records;
- a grid-specific self-drag row type.

The displayed drag image is a generated table capped at twenty visible rows and is
passed to native `setDragImage`. A cell drag provides `gridcell` and `text/plain`.
A column drag provides `gridcolumn`, `text/plain`, a self-drag column type, and
optional trash metadata.

Self-drag setup is at LEGACY `genro_grid.js:643-688`. Relevant callback signatures
are visible in the compilation sites:

```javascript
selfDragRows(info)
onSelfDropRows(rows, dropInfo)
afterSelfDropRows(rows, dropInfo)
```

The generated target callback may move row data or a column in the grid. This is a
consumer mutation triggered by a data drop, not the native drag transport moving a
Source node.

`fillDropInfo` chooses the first configured `dropModes` match among grid, column,
row, and cell, avoids a grid-level self-drop, enables self row/column modes using
the source page and Source ids, and outlines the exact target
(LEGACY `genro_grid.js:2337-2402`). `customEventInfo` adds row and column indexes
(`genro_grid.js:2403-2416`).

An example is at LEGACY
`projects/gnrcore/packages/test15/webpages/dd/dd_grid.py:17-87`. Its drop box names
types such as `gridrow/json`, while the inspected runtime offers `gridrow`; this is
another warning that executable examples may have drifted and are not automated
compatibility specifications. Column movement is also shown in
`projects/gnrcore/packages/test/webpages/drag_drop/dragcolumns.py:26-30`.

Storage-tree code demonstrates application policy on top of this machinery. It
uses `dropTargetCb` to require a directory and then invokes a server call that moves
the selected resource (LEGACY
`resources/common/gnrcomponents/storagetree.py:17-120`). The domain move belongs to
that component; it is not an automatic consequence of `dropEffect='move'`.

### Grouplet grids and lifecycle evidence

The grouplet grid implements a separate, direct native-DOM pipeline instead of the
generic inherited dispatcher (LEGACY
`resources/common/gnrcomponents/grouplet/grouplet_grid.js:228-455`). It installs
listeners itself, uses payload types such as `gg_tile_<dragCode>`, checks target
positions, and deliberately stops propagation to protect nested grids.

This is useful evidence that nested ownership needed component-specific fixes, but
it should not be treated as a preferred target architecture. The executable page
at LEGACY
`projects/gnrcore/packages/test/webpages/gnrwdg/test_grouplet_grid/04_setlayout_dnd.py:1-31`
records a regression in which dynamic layout switching leaves stale listeners. It
is an explicit lifecycle warning, not an automated test result from this audit.

## Movement, resize, detachment, and stacking are separate systems

### Generic Dojo movement

The legacy builder treats `moveable` separately from drag/drop
(LEGACY `gnrjs/gnr_d11/js/genro_widgets.js:150-160,260-283`). With
`moveable_constrain=False`, it creates an unrestricted `dojo.dnd.Moveable`.
Otherwise it creates a parent-constrained mover with `within=True`. It publishes
`onMoveable` events containing `action`, `sourceNode`, `top`, and `left` when the
mover is created or moved.

Dojo's Moveable listens for mouse down and selection suppression, optionally uses
a handle and delay, creates a Mover, and disconnects its handlers in `destroy()`
(LEGACY `dojo_libs/dojo_11/dojo_src/dojo/dnd/Moveable.js:13-114`). The Mover reads
`pageX/pageY`, calls automatic page scrolling, converts non-absolute positioning to
absolute on the first movement when necessary, and writes pixel `left/top`
(`dojo/dnd/Mover.js:8-80`). Parent-constrained movement calculates margin, border,
padding, and content boxes; `within=True` subtracts the child's size
(`dojo/dnd/move.js:8-113`).

An authentic example combines absolute CSS placement, movement, and native CSS
resize:

```python
bc = root.div(position='relative', height='400px')
bc.div('Movable', position='absolute', top='10px', left='10px',
       moveable=True, resize='both', overflow='auto', lbl='Move me')
```

See LEGACY `projects/gnrcore/packages/test/webpages/html/moveable.py:11-21`. The
published `top/left` values do not themselves update a Bag or Source attribute.
Persistence would have to be authored separately.

This is the closest legacy analogue to free canvas placement, but it has important
limits:

- coordinates come from page mouse coordinates and CSS offset positioning;
- constraint geometry is the immediate DOM parent, not an explicit model space;
- no zoom-transform compensation was found;
- no rotation, snapping, alignment guides, multi-selection, or local data schema
  was found;
- nested parents work only to the degree ordinary DOM offset geometry works.

### `labledbox` handle intent

The legacy `labledbox` builder wraps content and a label at LEGACY
`gnrjs/gnr_d11/js/genro_widgets.js:834-889`. When `moveable` is set, it assigns a
generated id into `labelBoxAttr.id`, but assigns `sourceNode.attr.moveable_handle`
from `label_attr.id`. Unless the author supplied a label id separately, that value
is undefined and the Moveable falls back to the whole node. The code suggests an
intended label handle, but the default path appears broken or conditional.

This does not approve a draggable current `labledBox`. At most, it motivates a
small experiment before deciding whether a label is a clear and accessible handle.

### Detachment and floating panes

A draggable source may be marked `detachable`. Drag start permits detachment only
while Shift is held and the source is not already detached. Dropping such a source
takes a special route before ordinary type/tag matching. `onDetach` creates a
FloatingPane at `event.pageX/pageY`, inserts a placeholder, moves the live DOM node
into the pane, and restores it when the pane hides (LEGACY
`gnrjs/gnr_d11/js/genro_dom.js:1117-1167`).

This is a live DOM relocation workflow. It is not a general Source/Data move, and
its page coordinates and global floating context are unsuitable as an implicit
nested-canvas model.

Dojo FloatingPane uses its title focus node as a Moveable handle and is absolutely
positioned. It creates a resize handle and reorders the global floating-pane set in
`bringToTop` (LEGACY
`dojo_libs/dojo_11/dojo_src/dojox/layout/FloatingPane.js:82-103,272-290`). Genro
configures the widget's starting z-index around 700
(LEGACY `gnrjs/gnr_d11/js/genro_widgets.js:2827-2829`).

The Genro palette wrapper adds cascaded default positions, docking, title-bar
templates, and optional grouping/detachment (LEGACY
`gnrjs/gnr_d11/js/genro_components.js:665-805`). It can persist a rectangle in
`localStorage` under `palette_rect_<pagename>_<nodeId>`, clamp it against the parent,
and restore it (LEGACY `genro_widgets.js:2886-2923`). This is per-widget UI state in
page coordinates, not a canvas-owned Bag of child coordinates.

The Dojo ResizeHandle uses mouse client coordinates, minimum dimensions, optional
active preview, and explicit listener cleanup (LEGACY
`dojo_libs/dojo_11/dojo_src/dojox/layout/ResizeHandle.js:10-233`). Genro also bridges
move/resize events across frames at `gnrjs/gnr_d11/js/genro.js:750-775`. None of
these mechanisms defines recursive coordinate transforms or local z-order.

## Touch, pointer, keyboard, and cancellation evidence

Legacy pages conditionally load `resources/js_libs/DragDropTouch.js` for mobile
devices (LEGACY `gnrpy/gnr/web/gnrwebpage.py:1396-1398`). The library translates
touch sequences into synthetic HTML5 drag events, uses a movement threshold of five
pixels, suppresses scrolling while dragging, and emits `dragend` even for a canceled
touch drag (LEGACY `resources/js_libs/DragDropTouch.js:149-271,383-405`).

`genro_mobile.js` separately patches Dojo Moveable for `touchstart`, `touchmove`, and
`touchend` (LEGACY `gnrjs/gnr_d11/js/genro_mobile.js:169-244`). This is evidence of
mobile accommodation, but it is split across compatibility layers and does not use
Pointer Events. No keyboard operation for generic drag/drop or Moveable, and no
explicit Escape cancellation in the generic HTML5 pipeline, was found. Keyboard
support in unrelated controls such as splitters does not fill that gap.

## Current Gramlot behavior

### `groupBox`: data offer only

Current `groupBox` explicitly implements a data offer and never moves Source or
Data (GRAMLOT `js/dom/src/collections/layout/group-box.js:9-113`). It observes
`copy`, `draggable`, `disabled`, and `lbl_variant`, and makes the generated header
native-draggable only when the feature is enabled.

The host listens for `pointerdown` and `dragstart`. A pointer down whose composed
path contains a button sets a guard so the following drag start is rejected
(`group-box.js:46-47`). A drag is accepted only when all of these are true:

- the composed event origin is exactly this groupBox's header;
- the button guard is clear;
- the header is draggable;
- `dataTransfer` exists.

The check and payload write are at `group-box.js:98-113`. It writes:

```json
{
  "application/x-gramlot-group+json": {"datapath": "...", "sourceId": "...", "data": "..."},
  "application/json": "values-only JSON"
}
```

and sets `effectAllowed='copy'`. The first line above is schematic JSON showing the
keys; the actual custom value contains structured snapshot data, not a quoted
placeholder.

The current Python-first gallery uses the actual declaration:

```python
root.data('contact', Bag({'name': 'Ada', 'city': 'London'}))
group = root.groupBox(lbl='Contact', lbl_variant='bar', datapath='contact',
                      copy=True, draggable=True)
group.textBox(value='^.name', lbl='Name')
```

See GRAMLOT `docs/examples/gallery/cases.py:176-182`. The example deliberately has
no drop target.

The renderer-injected snapshot reader requires an explicit datapath and a Bag and
returns the absolute datapath, source id, and value
(GRAMLOT `js/dom/src/components/data-scope.js:4-46`). Its JSON conversion rejects
cycles, duplicate labels, non-finite numbers, unsupported types, and symbols. Bag
attributes are omitted. These are real validation boundaries and should be kept
distinct from legacy typed-object permissiveness.

Existing assertions in GRAMLOT `js/dom/tests/group-box.test.js:83-97` verify that
drag starts only from the header, not the host, copy control, or another control;
that the effect is copy; that both payloads are written; and that Data remains
unchanged. Other tests cover errors and listener disconnection.

### Nested `groupBox` ownership risk

The same header-origin guard creates an important nested risk. A drag from an inner
groupBox header bubbles to the outer groupBox's host listener. For the outer
instance, `event.composedPath()[0]` is the inner header rather than its own header,
so the outer handler calls `preventDefault()`. That can cancel the inner drag even
though the inner instance produced a valid payload.

This is an inference from `group-box.js:98-110`. The existing test confirms that a
drag from an unrelated child input is canceled, but it does not construct nested
groupBoxes. Before recursive composition is promised, a nested test should prove
that exactly one owner handles the event and ancestors neither overwrite nor
cancel it.

### Decoration components

Current `labledBox` only provides shared label decoration
(GRAMLOT `js/dom/src/collections/decoration/labled-box.js:7-27`). `widget-label`
builds stable label/content composition and layout but has no movement or handle
contract (`js/dom/src/collections/decoration/widget-label.js:25-159`). No inspected
test or runtime path makes the label draggable.

Current `formlet` is likewise a layout component: it renders a CSS grid with fixed
or responsive columns and has no drag/drop or movement listeners (GRAMLOT
`js/dom/src/collections/layout/formlet.js:6-32`). FramePane is preserved as a
required future widget in the maintained open-work record, but it has no current
Gramlot component implementation (`docs/context/open-work.md:131-138`). These
containers do not supply a hidden precedent for `canvasBox` behavior.

### Palette movement, resizing, and stacking

Current `palette` implements its own Pointer Event gesture at GRAMLOT
`js/dom/src/collections/palette.js:9-140`. Its title bar is a move handle except when
the event starts on a button; a bottom-right handle resizes. It uses pointer capture,
clamps its fixed-position rectangle to the viewport, clears gesture state on end or
cancel, and removes its window resize listener on disconnect. With opt-in keyboard
control, arrow keys move it by ten pixels or one pixel with Shift, and Escape
closes it.

`bringToFront()` increments the static `Palette.level` counter and assigns it as
z-index (`palette.js:110-112`). All palettes therefore share one global stacking
sequence. This is a useful implementation technique for floating windows, but it
does not satisfy a design in which every canvas owns local z-order and nesting
creates stacking contexts.

The Python-first example at GRAMLOT `src/gramlot/pages/widgets/palette.py:10-30`
uses a normal Source declaration. No current palette path writes its rectangle to a
Data Bag, so its geometry is runtime DOM state rather than an application model.
Its declaration is simply:

```python
palette = pane.palette(title=title, value="^.open", left=left, keyboard=keyboard,
                       top="150px", width="460px", height="300px")
```

### Other current components and services

`storetree` explicitly leaves drag/drop for later and prevents a native button drag
(GRAMLOT `js/dom/src/collections/storetree.js:21-23,106`). Current grid work includes
column resizing with pointer capture, cancellation/Escape, and keyboard behavior,
but not the legacy row/selection data-drag pipeline. The HTML builder serializes
attributes and injects known services, including the Data snapshot reader, but no
central drag/drop dispatcher was found in the renderer or Application services.

The renderer also gives `labledBox` outer placement styles special treatment
(`js/dom/src/contrib/html/html-builder.js:111-121`). This matters to future movement:
the object whose geometry belongs to a canvas must be defined precisely when a
declaration renders through an outer decoration wrapper.

## Compatibility and difference table

| Question | Legacy observed behavior | Gramlot observed behavior | Design consequence |
| --- | --- | --- | --- |
| Does “draggable” move the authored object? | Usually no. It offers data; consumers may mutate stores. | `groupBox` offers a copied snapshot and preserves Data. | Keep data transfer and spatial repositioning as separate capabilities and vocabulary. |
| What is the handle? | Widget-specific; generic HTML target, optional Moveable handle, FloatingPane title. Legacy `labledbox` label intent is unreliable. | `groupBox` header for payload drag; palette title for movement. | A future child needs unambiguous separate data-drag and move handles. |
| Who owns nested events? | Exact resolved Source target; special components sometimes stop propagation manually. | Component-local bubbling listener; outer groupBox can cancel inner drag. | Define nearest eligible owner and prove it for recursive canvas/group boxes. |
| Where are positions stored? | CSS `left/top`; palette rect optionally in localStorage. | Palette writes inline runtime styles; no Bag persistence. | Decide a canonical Data schema and update boundary before building canvas UX. |
| What coordinate system? | Mouse page/client coordinates plus parent box constraints. | Palette fixed viewport coordinates. | Neither is a nested local canvas coordinate model. |
| How is stacking modeled? | Global floating-pane population. | Global static palette counter. | A canvas needs parent-local order and deterministic serialization. |
| What crosses a data drop? | Arbitrary text types and typed values, including Bag XML and JS objects. | Two JSON formats, values-only validated snapshot. | Add only required MIME contracts with explicit validation/versioning. |
| Are types/tags security? | No; routing only. | Snapshot validation exists, but no target acceptance service exists. | Validate payload structure and authorize domain operations at the receiver. |
| Copy versus move | Central UI forces `move`; domain mutation is consumer-defined. | `groupBox` advertises copy. | Effects should follow the declared domain operation and accessible feedback. |
| Files and external content | Files, text, HTML supported; central validation is shallow. | No generic target pipeline. | Introduce external types only with validation and consumer boundaries. |
| Pointer/touch | Native HTML5 plus touch shim; separate touch Moveable patch. | Palette uses Pointer Events; groupBox uses native DnD plus a pointer guard. | A canvas interaction should use a coherent pointer/cancel/capture model. |
| Keyboard | No generic evidence. | Palette has optional arrow movement and Escape close. | Keyboard move/reorder and focus behavior must be designed and tested. |
| Lifecycle | Mixed; global listeners and custom stale-listener regression. | Palette removes its window listener and clears gesture state; groupBox invalidates pending copy completion. | Cancellation, disconnect during gesture, and source removal are acceptance cases. |

## Implications for a possible `canvasBox`

### Define two independent interaction contracts

A child can plausibly support both:

- **data drag**: offer a typed snapshot or reference to another target; and
- **spatial manipulation**: update position, size, or z-order inside its owning
  canvas.

They need separate enabling attributes, handles, events, and results. Calling both
“draggable” would preserve the main legacy ambiguity. Browser `dropEffect='move'`
must not be taken to mean that Source or Data moved.

### Make ownership explicit

Recursive canvases need a deterministic rule such as “the nearest eligible canvas
owns a move gesture that starts on its direct child.” That rule must define:

- whether a nested canvas moves as one child of its parent while also managing its
  own children;
- how a handle inside decoration maps back to the positioned object;
- what happens when a child also starts a data drag;
- whether a drop target may delegate to an ancestor;
- how event propagation and composed Shadow DOM paths are handled;
- how ownership is released on pointer cancel, disconnect, Escape, or lost capture.

The legacy exact-target dispatcher and the current outer-group cancellation show
two ways this can fail. Neither should become an implicit compatibility rule.

### Store local geometry in the model

If each canvas owns its children, position and z-order should have a stable model
representation owned by that canvas. DOM `left/top` is an output, not the sole
source of truth. The contract needs answers for:

- local x/y units and origin;
- width/height ownership and optional constraints;
- deterministic local z-order, including bring-forward/send-back semantics;
- serialization and restoration;
- nested coordinate conversion;
- scrolling and clipping;
- zoom transforms and pointer-to-model conversion;
- reparenting between canvases and whether it is copy or move;
- transaction/undo semantics and binding notifications.

No inspected legacy mechanism answers these questions comprehensively. The nearest
pieces are parent-constrained Moveable geometry, palette rectangle persistence, and
global floating-pane stacking.

### Preserve Python-first authoring

An application author should declare the canvas, bindings, and callbacks in Python.
Large imperative JavaScript movement code in an example would conceal a framework
gap. Browser pointer handling belongs in a reusable Gramlot component or service;
the authored Data model and Source callbacks should expose meaningful changes.

A future declaration should not be inferred from the legacy attribute vocabulary.
In particular, this report does not propose `moveable`, `dragTags`, `dropTypes`, or
the legacy callback names as Gramlot APIs.

### Treat a label handle as a product decision

A label can be a discoverable move handle, and both legacy `labledbox` and floating
pane title code contain related intent. It can also conflict with selecting text,
activating label controls, starting a group data drag, or operating nested widgets.
The legacy `labledbox` path appears unreliable by default. Prototype the interaction
with pointer, touch, keyboard, and embedded-button cases before approving it.

### Validate drop data independently of routing

If canvas children can be created or reparented by drop, MIME/type and tag matching
cannot authorize the operation. A receiving contract should validate a versioned
payload, resolve provenance deliberately, reject unsupported structures, and apply
domain authorization before mutating Data. Gramlot's current values-only snapshot
validation is a better starting boundary than legacy `JS` evaluation or Bag XML
deserialization.

## Unknowns

The following were not established by this audit:

- browser-reproduced behavior of the inferred legacy nested-target dead zone;
- browser-reproduced stale `localStorage` transfer data after an external drag;
- browser normalization of every legacy custom transfer type across supported
  historical browsers;
- practical round-trip behavior of the lowercase `::bag` encoder output against
  the uppercase `BAG` decoder recognition path;
- whether downstream private Genropy packages depend on singular `dragTag`,
  `dropTag`, or `dragTypes` despite no observed core use;
- intended semantics of the broken/conditional legacy `labledbox` handle path;
- accessible screen-reader behavior of legacy drag/drop and Moveable;
- formal coordinate, persistence, and undo semantics for a future Gramlot canvas;
- whether current `groupBox` payload drag should remain header-only once spatial
  handles exist;
- whether group data payloads need Bag attributes, references, or only values;
- which legacy grid/tree workflows are actual migration requirements.

No focused legacy automated unit suite for the central drag/drop pipeline was found
in the inspected search. The cited legacy pages are executable/manual evidence, and
several contain stale vocabulary or explicit regressions. Their presence does not
prove current browser behavior.

## Recommended bounded experiments

1. **Fix the evidence boundary for nested `groupBox` drag.** Add a DOM test with an
   inner and outer groupBox, start on the inner header, and assert exactly one
   payload producer, no ancestor cancellation, and unchanged Data. This can be done
   before any canvas API decision.
2. **Prototype nested move ownership in an internal test fixture.** Use two local
   coordinate containers and direct children. Exercise inner-child movement,
   moving the inner container as a parent child, lost capture, pointer cancel,
   disconnect, and scroll. Keep the experiment out of an application API.
3. **Measure coordinate conversion.** Record pointer and model coordinates for a
   scrolled parent, a scrolled page, CSS zoom/transform, and a nested transformed
   container. Use the result to select a single conversion boundary.
4. **Test decoration as a handle.** Compare a dedicated handle with the full label
   across mouse, touch, pen, keyboard, text selection, buttons, and form controls.
   Do not infer the answer from legacy `labledbox`.
5. **Model local z-order.** Create two nested canvases with overlapping children;
   assert that bringing a child forward changes only its owning canvas and survives
   serialization. Contrast the result with `Palette.level`.
6. **Specify data drop separately.** If a migration case needs tree/grid/group data,
   select one payload, give it a versioned MIME contract, validate it, and test
   acceptance/rejection. Avoid implementing arbitrary legacy dtype evaluation.
7. **Reproduce only migration-critical legacy quirks.** For any claimed dependency,
   run the cited legacy page in a supported browser and capture the exact event and
   callback sequence. Do not promise the full apparent attribute surface.
8. **Add lifecycle and accessibility gates early.** Include keyboard positioning,
   focus retention, Escape cancellation, pointer capture loss, touch scrolling,
   deletion during a gesture, and reduced-motion/announced-state behavior in the
   first canvas experiment.

## Verification performed for this audit

The following existing current-Gramlot tests were run without changing runtime
code:

```text
node --test js/dom/tests/group-box.test.js \
  js/dom/tests/palette.test.js \
  js/dom/tests/clipboard.test.js
```

The Node test runner reported 8 passing tests and exit status 0. The run was not
clean: the palette test emitted repeated uncaught `TypeError` reports because the
test DOM does not provide `requestAnimationFrame`, reached from GRAMLOT
`js/dom/src/collections/palette.js:67,102`. Running `palette.test.js` alone likewise
reported one pass and exit status 0 while emitting the same errors. Accordingly,
the existing assertions passed, but this audit does not treat that output as proof
of a clean palette gesture environment.

No legacy browser example was executed. All legacy behavioral statements above are
marked or framed as inspected semantics, executable-example evidence, or inference.
