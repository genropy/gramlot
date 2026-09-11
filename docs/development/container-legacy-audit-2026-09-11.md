# Container roles and legacy messaging

Read-only source investigation, 2026-09-11. The design conclusions below are
proposals; no container API or implementation is changed by this audit.

## Structural roles

Separate placement from child implementation:

- Region containers assign children to named structural positions. Legacy
  `borderContainer` uses `region` (top, bottom, left, right, center).
- Page containers manage an ordered collection with one selected child.
  `stackContainer` supplies selection; legacy `tabContainer` extends it with
  tab controls. `pageName` identifies a page; `title` supplies its visible caption.
- Ordinary content/group containers host content without either selection or
  named-region semantics. They should not inherit page selection merely because
  they have children.

“Slot” here describes a structural role, not necessarily a native DOM slot.
One active page does not mean one child in the source tree.

Legacy pages are not restricted to contentPane. The executable example
`projects/gnrcore/packages/test15/webpages/components/tabSlots.py`, lines 31–37,
adds framePane children directly to a stack, with pageName and title. The same
file creates contentPane pages dynamically through Source insertion and removes
them through the Source Bag. ContentPane is a useful content host, not the
exclusive type of page.

## Public Genro messages

SourceNode.publish/subscribe prefixes messages with `nodeId` (or generated source
ID), followed by an underscore. With nodeId `pages`:

| Topic | Direction | Payload / behavior |
| --- | --- | --- |
| `pages_switchPage` | Command | Page name, numeric index, `*next*`, or `*prev*`; navigation stops at boundaries. |
| `pages_hiding` | Notification | `{pageName: oldName}` before delegated selectChild. |
| `pages_showing` | Notification | `{pageName: newName}` before delegated selectChild. |
| `pages_selected` | Notification | `{page, selected, change}` from child onShow/onHide; change is `<page>_show` or `<page>_hide`. |

Important historical details:

- hiding/showing require explicit container nodeId and a truthy child pageName.
- selected is emitted only through configured selected/selectedPage bindings.
  The former uses an index; the latter a pageName. Both bindings produce two
  notifications for each callback. Data is written on show, not hide.
- The selectChild wrapper publishes hiding/showing before the underlying Dojo
  equality guard; direct redundant calls can therefore announce no-op changes.
- Layout-induced show callbacks are suppressed in the TabContainer layout patch.
- Removing the selected child selects the first remaining child in Dojo;
  Genro clears selection bindings after removing the last selected child.

These are observed behaviors, not recommendations to reproduce their incidental
duplicates or timing. A Gramlot contract should explicitly settle notification
timing, payload identity and whether notification depends on a Data binding.

## Internal Dojo coordination

Dojo uses widget IDs and hyphens, a separate protocol:
`<id>-startup` carries `{children, selected}`; `<id>-addChild` carries child and
insertion index; `<id>-removeChild` and `<id>-selectChild` carry the page widget.
There is also `<id>-containerKeyPress`. These coordinate StackControllers/tab
bars, including dynamic children; they are not interchangeable with public Genro
underscore topics. Startup state plus child/selection updates is the reusable
capability to retain, without assuming Dojo topic names are the new public API.

BorderContainer subscribes to `<nodeId>_regions`, accepting a region map whose
entries specify size/show. Its splitter handler writes sizes into the Bag bound
through `regions`; that persistence is a Data update, not a dedicated splitter
publish in the inspected handler.

## Current Gramlot comparison

`js/dom/src/collections/layout.js` already implements named/index selection,
switchPage, dynamic rebuilding and Genro-style topic events. However:

- `_tabs()` restricts direct children to gnr-tab and gnr-contentpane, unlike
  the legacy framePane example.
- GnrStackContainer currently inherits GnrTabContainer and hides its bar. A
  shared selection core with optional tab/controller presentation would express
  the relationship more directly.
- Transition topics are coalesced in a microtask after display application.
  selected uses page names independently of selection bindings. This differs
  from legacy timing, conditional emission and index payloads.

These observations come from source inspection, not a fresh browser parity test.
Proposed next step: settle the region/page child contracts and event contract,
then review each container against them before changing implementation.

## Source references

Legacy root on the inspected machine:
`/Users/gporcari/Sviluppo/Genropy/genropy`.

- `gnrjs/gnr_d11/js/genro_widgets.js`: StackContainer 2258–2424;
  TabContainer 2426 onward; BorderContainer 2479 onward, splitter/regions 2645
  onward; ContentPane 3099 onward.
- `gnrjs/gnr_d11/js/gnrdomsource.js`: publish/subscribe 1300 onward.
- `dojo_libs/dojo_11/dojo_src/dijit/layout/StackContainer.js`: startup, addChild,
  removeChild, selectChild and keyboard topic.
- `projects/gnrcore/packages/test15/webpages/components/tabSlots.py`: dynamic
  pages, external stack buttons and direct framePane children.
