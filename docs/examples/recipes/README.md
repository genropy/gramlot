# Recipe composition experiment

Owner discussion and local experiment, 2026-09-13. This is a small feasibility
probe before an IDE recipe, not a new registered grammar or a frozen manifest API.

## Run

From the repository with its installed development dependencies and prepared
browser distribution:

```sh
.venv/bin/python docs/examples/recipes/build.py
node docs/examples/recipes/serve.mjs
```

Open <http://127.0.0.1:8053/> for the comparison or
<http://127.0.0.1:8053/standalone.html> for the JavaScript-only page.
The output folder `build/teaching-preview/recipes` can also be served by any
static HTTP host. Regenerate it after rebuilding the general teaching preview.
Python runs only during the build; the static Node server has no Python process
or application endpoints. The standalone page does not import `python-source.js`.
Opening ESM directly with `file://` is not part of this experiment.

## Contract under discussion

- A component is an adapted Web Component, represented by one Source node;
  its internal DOM is not expanded into the caller's Source Bag.
- A recipe composes HTML, components and other recipes into ordinary Source
  nodes. Its box is a normal HTML `div`, not a synthetic recipe component.
- Python reuse requires only an importable function/method receiving the parent
  and explicit options. It does not automatically produce a JavaScript version.
- A JavaScript recipe can be used without Python and can declare reactions to
  browser Data. A plain JS function is not automatically reactive: this example
  explicitly uses a Source-owned `dataController` for structural changes.
- Python control flow evaluates at construction. The Source it constructs can
  still contain live bindings and browser controllers.
- A recipe manifesto should publish parameters, documentation and Python source
  that authors can copy and customize. The generated `manifest.json` embeds the
  actual Python function. Its schema is experimental and is not consumed by a
  registry or code generator in this probe.

The owner uses Gnr IDE as an example of a recipe, but requested this tiny box
first. Existing IDE code is unchanged. “Genro recipe” terminology, registration,
loading recipes from Python declarations and general JS/Python equivalence remain
to be settled; this experiment must not silently finalize those APIs.

## Try it

Each side has two independent boxes: a caption, a `textBox` and a Reset button.
Type a value and leave the input to commit it. Reset changes only that instance.
The JavaScript recipe receives `showDetail='^showDetail'`. Checking **Show extra
node** creates a bound paragraph in both JavaScript boxes; unchecking removes
those Source nodes. Input nodes and Data remain intact.

The Python helper receives `show_detail=False` when building the comparison, so
its structure stays fixed. Passing `True` adds the paragraph at build time; its
message binding then remains live in the browser. This is an intentional semantic
difference, not full dynamic equivalence.

Open the inspector and choose **Source**, then expand `div_0` on the standalone
page: the caption, `textBox`, button, controller and optional paragraph are visible
as separate nodes. The controller is a logic node, not a visible widget.

## Verification

```sh
.venv/bin/python -m pytest tests/test_recipe_composition.py -q
```

Passed against the current source runtime: Python/TYTX binding, component versus
recipe Source shape, four independent instances, reset isolation, repeated live
insertion/removal without duplicate nodes, preservation of input identity and
Data, and disposal of a removed recipe's controller. Uses the existing
`build/test-client` layout (`scripts/prepare_test_client.py` if needed).

Browser verification passed on both static pages: real keyboard input and commit,
reset, extra-node insertion/removal, independent values, inspector Source
expansion, and visual layout. No application DOM construction, event listeners,
ad hoc fetch or parallel state machinery is used. The DOM mount in `start.js` is
the normal Application bootstrap; UI and interactions use Gramlot.

No framework runtime changes, IDE migration, release or publication are included.
