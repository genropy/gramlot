# Common label and box attributes

Date: 2026-09-10. Source audit with existing Gramlot regression tests. The
position-only implementation update is recorded below; the earlier sections
retain the pre-change findings that motivated it.

## Names and source evidence

The recorded API spelling is `labledBox`, retained by explicit owner decision.
Legacy JS declares `gnr.widgets.labledbox`; Gramlot Python and JS expose
`labledBox`. The user's reference to labelbox is treated as the concept, not
authorization to rename the element.

Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`.
Read `gnrjs/gnr_d11/js/gnrdomsource.js:buildLblWrapper` (around line 1919)
and `genro_widgets.js:gnr.widgets.labledbox.onBuilding` (around line 839).
Gramlot: `js/dom/src/widget-label.js`, `recipe-policies.js`, and
`collections/layout.js:GnrLabledBox`.

## Legacy routing model

`lbl` is syntactic sugar for a labeled wrapper around the original widget.
`buildLblWrapper` changes the current Source node into labledbox and places
the original widget below it. It transfers layout item attributes to the wrapper.
`box_l_*` and `box_c_*` are extracted before the general `box_*` family.

| Widget shorthand | Explicit labledBox | Destination |
| --- | --- | --- |
| lbl | label | Caption content |
| lbl_color, lbl_font_size, other lbl_* presentation | label_color, label_font_size, other label_* | Caption element |
| lbl_side | side | Placement; distinct from caption styling |
| box_padding, box_border, other box_* | padding, border, other direct wrapper attributes | Outer labeled wrapper |
| box_l_* | box_l_* | Region containing the caption |
| box_c_* | box_c_* | Region containing the widget/children |
| Ordinary widget attributes | Attributes on the explicit child | Widget itself |
| Parent fld_* | fld_* on explicit container | Defaults applied to children |

This is a routing model, not a proposal for dictionary-valued lbl or box syntax.
No bare `box=` decoration contract was found in the inspected handlers.
`box` as a layout widget is a separate concept.

Legacy extracts `label_*` into the caption, builds a caption region and a content
region, then adds original children. Its fld_* fallback uses isNullOrBlank on
child attributes. Gramlot's explicit-child precedence is an already recorded
owner requirement and must not be silently replaced with that blank fallback.

## Gramlot behavior and differences

Both ordinary labeled widgets and explicit labledBox use WidgetLabel. A widget
keeps its Source identity; decoration is inside its shadow root. Explicit
labledBox wraps a slot. This is not the legacy Source rewrite.

The current explicit component accepts label/label_* as well as lbl/lbl_*;
unequal label and lbl captions throw. label_* wins over corresponding lbl_*
attributes (styles concatenate). Unequal side and lbl_side also throw in explicit
mode. Do not add aliases or new conflict rules as part of this review.

Direct attributes style the host, while box_* styles an inner decoration box,
including on explicit labledBox. Both border and box_border can therefore exist
and produce two borders; the existing forms test explicitly verifies them.
Consequently the routing table expresses the legacy authoring relationship, not
pixel-equivalence between the two current Gramlot DOM presentations.

Gramlot supports lbl_position L/R/TL/TC/TR/BL/BC/BR by a prior explicit owner
decision. It overrides side selection and alignment. The inspected legacy wrapper
uses lbl_side with top as fallback; Gramlot uses left for an ordinary widget,
top for explicit labledBox, and formlet supplies top. Placement defaults are a
compatibility difference to review, not a reason to make lbl_position mandatory.

RecipePolicies inherits lbl_* from ancestors, applies parent fld_* defaults,
and supplies formlet box_* defaults. Explicit local attributes win. It also
supports local fld_* on field webcomponents: the original textBox draft's claim
that fld_* could only occur on ancestors was too restrictive.

WidgetLabel routes lbl_*, box_*, box_l_* and box_c_* through HtmlAttributes,
including class_/_class adaptation. Its accepted families are not CSS-only:
HTML attributes such as title are also routed. Position/side are special
instructions, not generic style suffixes. Do not validate these families merely
as arbitrary strings or prohibit them using an incomplete suffix list.

Other scope limits: ordinary HTML div does not gain this widget decoration;
legacy unlabeled formlet action placeholders and wrp_* behavior need separate
parity checks. Reactive caption and style changes preserve Gramlot widget
identity in the existing tests. Full legacy browser and accessibility equivalence
has not been certified.

## Owner direction after review

The owner explicitly prioritizes legacy behavior for the differences found here.
The legacy routing model is the target for author-visible behavior; the existing
Gramlot DOM split is an implementation detail, not a reason to change attribute
meaning. Align default label placement and wrapper attribute destinations, and
make shorthand and explicit composition consistent with their legacy roles.
Existing tests describe the current implementation and may need revision where
they encode a legacy mismatch. Preserve separately recorded owner corrections.
No runtime fix has been performed by this documentation update.

## Recommended syntax direction

Preserve both existing authoring levels:

```python
pane.textBox(value="^.name", lbl="Name", lbl_color="gray",
             box_padding="6px", box_c_padding="2px")

box = pane.labledBox(label="Name", label_color="gray",
                    padding="6px", box_c_padding="2px")
box.textBox(value="^.name")
```

These show the legacy routing relationship; they do not claim identical host
layout or accessibility semantics in current Gramlot. Use the shortcut for a
single widget and the explicit container for a group or deliberate composition.
A bare field font_size stays a field property; lbl_font_size styles the caption.

Keep meta-attribute families in one shared contract, outside textBox-specific
parameters. Document destination, inheritance, binding support and precedence
for each family. The schema should classify special placement keys before
routing generic suffixes. No new labelbox name, nested attribute dictionaries,
or flattening of label/region/content responsibilities is needed.

Before altering runtime, assess the concrete compatibility gaps: placement
defaults, host versus inner-box sizing, fld_* null fallback, wrp_* and placeholder
behavior. Preserve existing owner corrections and identity/focus guarantees.

## Verification

Executed existing widget-labels.test.js and forms.test.js: 43 passed, 0 failed.
These verify current Gramlot behavior in jsdom, not full legacy equivalence.
No new tests or runtime edits were made.

## Superseding owner decision: position-only label syntax

The owner selected lbl_position for widget decoration and label_position for
explicit labledBox (L/R/TL/TC/TR/BL/BC/BR), replacing label-placement lbl_side/side
without compatibility aliases. Earlier side mappings above describe the audited
legacy/current implementation, not the target syntax. Migrate affected recipes
and shared inherited defaults along with runtime, documentation and tests. Do
not change unrelated side attributes.

## Implementation update — 2026-09-10

The local runtime now uses only lbl_position on decorated widgets and
label_position on explicit labledBox, with TL as the omitted-placement default.
Formlet supplies and inherits lbl_position; at an explicit labledBox boundary
that inherited value becomes label_position. Explicit child values retain
precedence, including an empty value and a retained null attribute.

The stable layout collection now assembles focused formlet and labledBox modules,
and all widget collections consume one shared decoration module. Tests cover all
eight positions, all eleven inputs, reactive inherited presentation, focus and
Source identity, and equivalent label/box routing for the shorthand and explicit
forms. The historical lbl_side/side placement spellings are ignored rather than
treated as aliases; unrelated side attributes are unchanged.

This update does not certify the remaining wrp_* and placeholder behavior or
legacy's blank fld_* fallback. Those remain compatibility work, and the owner's
explicit-child precedence continues to override the legacy blank fallback.

## Reference documentation organization — owner direction

Provide a dedicated labeled-container widget reference covering explicit
composition, shared label/box attributes, placement, inheritance and the mapping
from label_* to lbl_* when decorating another widget. Present these as reusable
attributes available across widgets. Explain verified scope and implementation
limitations once in this reference rather than implying every HTML node is
already supported. Individual widget pages need only basic usage and a link.
Do not repeat legacy history or the full shared attribute catalogue there.
This is documentation structure, not authorization to rename labledBox.
