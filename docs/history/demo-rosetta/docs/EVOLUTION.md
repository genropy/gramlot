# Keep the Rosetta versions aligned

The active baseline is static Hello World in React, Vue and Genro Pages. The
common frame is plain HTML outside the individual applications. Orders is
preserved in standby/orders and will return later as a separate example.

For each future revision:

1. Specify one behavior and inspect existing Genro components. If a component is
   missing, record the gap and implement it separately in its owning library.
2. Update SPEC.md and shared browser contracts.
3. Implement equivalent behavior in each dedicated worktree, using idiomatic
   framework code and identical backend semantics and data.
4. Integrate, build and verify all variants before advancing the baseline.
5. Regenerate source measurements, separating application code from framework
   setup, reusable adapters and the shared demo frame.

## Agreed next directions

- A second page with an input that changes the greeting.
- A third page adding a font-size slider, text and background color pickers, and
  a font select, using only available components.
- Restore Orders as a separate example, removing its old embedded demo frame.
- Add a minimal Genro ASGI host serving the same examples, without duplicating
  application code, to compare the six frontend/server combinations.
- Extract reusable FastAPI integration into the Pages library distribution.
  Rosetta should consume that adapter; its current host is exploratory evidence,
  not the final packaging.
- Assess how easily a Python author understands and modifies LLM-generated
  application code. Use documented composition methods for substantial pages;
  a two-statement Hello World does not need artificial helper methods.

These future capabilities are not claimed by the current demo. Do not fabricate
missing widgets or use a grid before the real component exists.

## RPC waiting indicator proposal

Record for future library work, not implemented in Hello World: adopt the legacy
hider pattern as a declarative RPC option instead of repeating pending bindings
on every input. Target a form or explicit container, with a page-wide option.
Separate immediate interaction protection from a delayed visual overlay (legacy
lockScreen defaults to 200 ms), with optional message/progress. Release protection
on success, error and cancellation; overlapping requests must not unlock each
other. Cover keyboard interaction and focus as well as pointer input.

This should be reusable outside Genro ASGI. When Orders returns, preserve equal
observable behavior across React, Vue and Pages while allowing idiomatic shared
form abstractions in every implementation. The archived React and Vue versions
explicitly bind disabled to busy; their input disabling was application code.

The first six binding increments are now implemented alongside Hello World.
Each has an independent source in four variants. Shared-state dual output,
remote calls and the library widget-label contract remain future work.
