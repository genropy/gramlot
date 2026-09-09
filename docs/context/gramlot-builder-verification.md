# GramlotBuilder feasibility verification

Date: 2026-09-09. Scope: isolated probes, no production runtime changes.

## Environment and reproducibility

Python probes run with `python -I`, prepending the downloaded **public** genro-builders 0.23.2 wheel to sys.path before importing Builders. Module provenance in results.json confirms imports came from the wheel, not the installed preview. Existing Pages virtual-environment dependencies supplied Bag/TYTX; no package was installed or replaced. This isolates Builders provenance, but is not a fresh public-only installation test.

Scripts and machine-readable results are under `temp/gramlot-builder-probe-20260909/`: probe.py, results.json, browser-contract.mjs, js-results.json and generated JSON/MessagePack payloads. The JS checks use Gramlot's test-client map and jsdom, not a live browser.

Run from the Gramlot root:

```sh
/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages/.venv/bin/python -I temp/gramlot-builder-probe-20260909/probe.py
GRAMLOT_CLIENT_MODULES="$PWD/build/test-client" node --experimental-loader ./tests/lab_loader.mjs temp/gramlot-builder-probe-20260909/browser-contract.mjs
```

The scripts record expected limitations as results: successful process exit does not mean every capability is available.

## Results

| Capability | Observation |
| --- | --- |
| Add a remote element in a subclass | Works with resource supplied by keyword; declaration only, no remote execution implemented |
| Override dataFormula(destination, formula) | Fails: positional input is silently stored as func; formula keyword raises missing func |
| Inherit that specialized builder again | Same failure, so ordinary deeper inheritance does not solve it |
| Override dataController(script) | script keyword raises missing func |
| Declare data on root Source Bag | Keyword authoring works |
| Declare data on a nested Source node | Fails: existing data property returns the datastore Bag, preventing recipe-method dispatch |
| Generic create | Executes a Python controller, confirmed by a datastore write |
| Override compute_logic in subclass | Prevents controller execution while preserving one declarative Source node |
| Specialized Source with explicit XS registration | JSON and MessagePack round-trip preserve custom Source branches, ordinary Bag branches and null/empty/zero/false |
| Python specialized Source -> existing JS decoder | Both transports hydrate as JS SourceBag with ordinary Bag payload and preserved values |
| HTML containing SVG in Python | Existing dialect produces svg/circle markup |
| HTML containing SVG in JS HtmlBuilder | Fails at root.svg().circle: subgrammar is not available through that path |
| Standalone JS SvgBuilder | SVG namespace and reactive radius update pass in jsdom |

New ordinary element positional parameters do not automatically mirror special data-element positional handling: the initial remote positional probe failed and the declared resource keyword passed. The final public positional mapping must be tested rather than inferred from a Python signature alone.

## What can remain entirely in Gramlot

- Browser-only execution policy, via an explicit builder override rather than changing generic classes.
- Definitions of new grammar entities, once their public argument mapping is specified.
- A specialized Source transport registration: demonstrated in an isolated interpreter, without monkey-patching the generic SourceBag class. The probe reused XS because the JS runtime already recognizes it; coexistence with other registrations still needs an explicit ownership rule.
- Existing standalone SVG runtime can be reused. HTML/SVG grammar switching is a distinct missing integration, not a reason to rewrite SVG.

## Generic extension limitations

1. Generic data-element schema processing overwrites specialized signatures. The published wheel therefore cannot honor the proposed formula/script declarations through an ordinary decorator override. Removal/relocation of these elements under #43 may remove this conflict; otherwise an override-preservation fix is needed.
2. BuilderBase.__init__, new_root and _expansion_root instantiate SourceBag directly. No configurable Source class factory is used at these construction sites. A specialized Source/SourceNode would let Gramlot own callable data and transport behavior, but wiring it consistently would currently require replacing construction internals. If specialized Source construction is chosen, prefer a small generic factory/class hook over copying those internals into Gramlot. Nested child creation already uses type(node.parent_bag); the missing hook concerns root and temporary/expansion construction. A facade does not require replacing Source classes just to resolve the data name.

Removing dataSetter alone does not remove SourceBagNode.data, so it does not resolve the nested data call conflict. The choice between a separate datastore name and a Gramlot-specific node facade must remain explicit.

## Recommendation before implementation

Coordinate dialect-owned element signatures (or relocation of the concrete data-elements) with Builders. Source/node construction hooks are conditional on choosing a specialized Source approach; the facade probe below shows they are not a prerequisite for callable data alone. These are extension mechanisms, not a request that Builders adopt Gramlot GUI names.

Then implement the first GramlotBuilder slice with keyword/positional conformance and browser-only execution. Preserve the preview until the selected public dependency and the new dialect pass full integration checks. Keep HTML/SVG switching on the follow-up list unless SVG embedding is required for the first slice.

The checks do not establish a complete working GramlotBuilder, a remote implementation, a loader contract, or permission to delete the old worktrees.

## Parent and authoring facade probe

`parent_proxy.py` and `parent-proxy-results.json` use the same public wheel. The constructor signature is `(self, name: str | None = None)`: **there is no parent constructor argument**. Construction under an existing node is already supported by calling its grammar methods; this preserves builder ownership. Public `set_child(build_where, ...)` also accepts an explicit destination Bag, but is not a constructor attachment or subtree ownership-transfer contract.

An isolated facade maps `data(...)` to the existing dialect-prefixed grammar accessor (`probe_data` in this experiment). The underlying SourceBagNode.data remains the original datastore Bag. Nested data declarations with zero and false, independent relative datapaths, a fragment receiving an existing parent, and ordinary relative datastore access all passed. No generic class was patched and no node was reparented. This proves an authoring route, not runtime initialization by the new data declaration.

The prototype reads `_name` to construct the prefix. Production code must use an explicit dialect identity or a supported accessor; depending on a private field is not the proposed API. The minimal facade also retains the original builder across wrapped returns: subbuilder transitions, callbacks, container returns, identity, serialization boundaries and complete method coverage still require conformance work.

This is a viable alternative to specialized nodes, not an approved facade implementation. It does not fix formula/controller schema reinjection or select a transport registration policy.
