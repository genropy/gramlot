# Verification and reproducibility record

Version: 0.1 · 2026-09-08 · 🔴 DA REVISIONARE.

[Return to manual](README.md)

## Scope

Read the user-provided handoff, canonical Pages `CLAUDE.md`, parent policies, `.phased/roadmap.md` and archived plans, development checkout record, architecture/authoring/handoff documents, and the labelled-box/form proposal. Read current Python hosting and recipe code, browser integration, DOM model/rendering/reactivity/collection code, installed Bag notification APIs and targeted legacy source. The source navigation index and file hashes identify time-stamped observations. A concurrent task changed D and P; see the closing addendum and separate closing manifest. The test counts refer to the earlier collected suite, not to tests added afterward.

Only documentation and temporary verification tooling were written. No runtime source, dependency checkout, existing test, workflow plan, branch or repository was changed. The reference suite runs and a standalone diagnostic exercise existing code without introducing new runtime behavior. No Git commit or release was made.

## Executed checks

| Check | Result | Interpretation |
| --- | --- | --- |
| Pages `pytest tests/` with documented source overrides and C module root | 99 passed, 1 environment-blocked; 100 collected; 66.22 s | The launched-server case could not bind loopback inside the sandbox |
| Isolated rerun `pytest tests/test_registered_server.py` with local socket permission | 1 passed, 1.22 s | Actual worker/HTTP/WebSocket test; all 100 Pages cases passed across the two runs |
| C `genro-dom-js`: `node --test tests/*.test.js` | 184 passed, zero failures; 5.95 s | Real current DOM assembly under jsdom |
| Pages `js/tests/rpc.test.mjs` with `tests/lab_loader.mjs` | 3 passed, zero failures | Focused RPC service tests with controlled Socket, not a real network claim |
| D `src/` vs C `genro-dom-js/src/` | `diff -qr` reported no differences | Initial comparison matched; closing comparison diverged during concurrent form development |
| Python import provenance | Pages/B source overrides, installed Bag 0.21.1, TYTX 0.15.0, ASGI 0.43.1 | Pages has no installed distribution metadata; do not infer wheel verification |
| Existing Git hook inventory | Recorded in `observed-state.json` | Read-only inventory; hooks were not installed/rewritten for a documentation task |
| storeTree retained-Bag diagnostic | One `_render` callback after disposal | Reproduced runtime gap, not fixed |

See Chapter 4 for complete commands and directory settings. The original failed test was not a product regression: it failed at `reservation.bind(('127.0.0.1', 0))` with `PermissionError: [Errno 1] Operation not permitted`, before constructing the server. Only that environment-blocked test was rerun with the needed permission.

## storeTree diagnostic

Run from canonical P after exporting the same `GENRO_CLIENT_MODULES` as Chapter 4:

```sh
node --experimental-loader ./tests/lab_loader.mjs --input-type=module <<'JS'
import {setupDom} from './temp/client-releases-20260908/genro-dom-js/tests/dom.js';
import {Bag} from 'genro-bag-js';
import {Application, HtmlBuilder} from 'genro-dom-js';
import '/_assets/dom/collections/storetree.js';
setupDom();
class Page extends HtmlBuilder {
    static wc_requires = ['storeTree'];
    setup(data) { data.setItem('items', new Bag({x: 'one'})); }
    main(root) { root.storeTree({store: '^items'}); }
}
const host = document.createElement('div');
document.body.append(host);
const app = new Application(host, new Page('main'));
const bag = app.builder.data.getItem('items');
const tree = host.firstElementChild;
let callbacks = 0;
const original = tree._render.bind(tree);
tree._render = () => { callbacks++; original(); };
app.dispose();
bag.setItem('x', 'after disposal');
console.log({detached: !tree.isConnected, renderCallbacksAfterDispose: callbacks});
JS
```

Observed: detached `true`, callbacks `1`. The temporary wrapper counts actual widget render calls; it does not replace Bag, Application, renderer or DOM with mocks. Bag's `unsubscribe` default flags are all false, while storeTree omits them. This is retained-callback evidence, not a quantified long-running memory benchmark.

## Diagram validation

Embedded Mermaid is the authoritative diagram source. Standalone `.mmd`, rendered `.svg` and `.png` files are in [diagrams](diagrams/README.md). All 13 diagrams passed Mermaid parse and SVG rendering. The rendering report records Mermaid/browser version and dimensions. A PNG contact sheet was visually inspected; overly wide diagrams and the lifecycle layout were revised and rendered again. Local document/source links were checked for existing targets. Rendering used a temporary local tool installation and headless Chrome; it did not navigate or reload the user's existing app/demo tabs.

## Official host references checked

- [FastAPI subapplications and mounts](https://fastapi.tiangolo.com/advanced/sub-applications/)
- [FastAPI static files](https://fastapi.tiangolo.com/tutorial/static-files/)
- [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/)
- [Starlette routing](https://starlette.dev/routing/)
- [Starlette lifespan](https://starlette.dev/lifespan/)

These establish the host primitives used in the proposal. They do not establish the existence of `PortableGui`, `AsgiGui`, a portable startup manifest or the new context/capability APIs. Those names are placeholders in clearly labelled pseudocode, and the examples were not run as implemented GUI integrations.

## Checks not performed

No fresh real-browser walkthrough of the running Pages demo, no physical touch-device check, no complete browser accessibility audit, no new clean-wheel launch, no Python-version matrix, no newly implemented FastAPI/Starlette integration and no full legacy test suite. Existing notes describe historical browser/release work; the manual does not relabel those as results from this run. Visual verification here is limited to the manual's diagrams, not the product UI.

## Snapshot refresh

`observed-state.json` contains full repository status and source/test SHA256 hashes. It records relevant local changes, not just commits. Do not reproduce this run from clean HEAD alone. A later DOM copy refresh or another task's edit invalidates its snapshot equality and may change this manual's findings.
