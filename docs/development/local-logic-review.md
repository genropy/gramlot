# Local logic review — 2026-09-10

Coordinator review of the delegated dataSetter/dataFormula/dataController/inline
expression slice. This is a local implementation checkpoint, not completion of
the RPC/remote plan.

## Findings resolved

- Inline expression dependency scanning skipped template interpolation and
  misclassified object property keys as cycles. Replaced scanning with lazy
  lexical peer resolution; strict expression execution uses JavaScript's own
  scope rules. Tests cover templates, regex literals, object keys/shorthand,
  arrow-local variables, typeof, global-name shadowing, genuine cycles and
  once-only execution. No parser dependency or retry-on-ReferenceError scheme.
- Removing a formula after queuing it in the same live batch retained work and
  an invalid DOM patch. Teardown now removes pending execution; logical nodes
  are excluded from view patch scheduling.
- Per-node insertion preparation ran startup formulas before later setters in
  the same batch. Pending branches now prepare together before formula draining
  and widget construction. Tests cover passive inputs, whole SourceBag insertion,
  first custom-element connection, removed pending branches and startup failure.
- Restored the existing Python dataController `func` keyword. Accepting scripts
  does not authorize renaming its public argument or consuming a user input
  named `script`.
- Recursive controller execution now reports a bounded diagnostic rather than
  overflowing the JavaScript stack.

## Verified scope and retained boundaries

Explicit setter assignment includes null, precedes missing-only defaults, and
does not replay on ordinary rendering. Formula expressions and controller
scripts are supported along with existing function recipes. Inline == uses
named peers. ^ subscribes; = is passive and refreshed on execution. Existing
_on_start remains opt-in: no new startup policy was approved by this review.

The executable Python/JS price recipes are tested through real Python Source
serialization and browser-runtime mounting, including initial results, passive
updates and subsequent reactive updates. Component-guide integration remains
working. Browser resources were refreshed to include the new logic modules.

Final checks: DOM suite 251 passed; Python suite excluding the local manual
server tests 98 passed and 1 skipped; both manual-server tests separately passed
with local port access. Component-guide integration and diff whitespace checks
passed. One external Python deprecation warning remains.

RPC, FastAPI service registration, remote Source, additional scheduling hooks
and legacy macros remain outside this delivered slice. No commits or publishing.
