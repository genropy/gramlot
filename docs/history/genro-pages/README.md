# genro-pages

Reactive pages built with Python and Genro.

**Try the complete preview:** [Collaborator installation and launch guide](docs/collaborator-preview.md).

**Technical manual:** [Repository maps and manual](docs/manual/repository-maps.md).

## Status

**Alpha — registered startup prototype.** A genro-asgi worker registers each page
before emitting the bootstrap HTML. Its page-owned RPC service retrieves a typed
source recipe and genro-dom-js builds it in the browser. Hello World, the widget
gallery, inspector and JavaScript laboratory exercise this integration.

## Hello World

The class hierarchy is `RoutedApplication -> WebpageApplication -> HelloWorldPage`.
The concrete page defines `main(root)`. The common base serves an empty browser
shell at `/`, the typed recipe at `/main`, and explicitly configured JS sources
at `/_assets/`. The browser retains its source Bag and datastore.

For the verified launch command, dependency paths and test environment, follow
[Development checkout](docs/development-checkout.md). The current prototype uses
explicit experimental Python and JavaScript dependency checkouts; the published
Python packages alone are not sufficient. See [Dependency consolidation](docs/dependency-consolidation.md)
for the required upstream changes and release adoption criteria.

In the relocated checkout, do not substitute `--modules ..` for the documented
module directory: the canonical sibling DOM checkout does not yet provide the
required deferred-mount API. The development guide selects the verified sources.

The documented local server runs at http://127.0.0.1:8014/. The disclosure below
the page shows the mounted JavaScript source Bag as XML, using
`builder.source.toXml({pretty: true})`. It refreshes when opened. `window.genro`
and `window.page` expose the client runtime and source builder for inspection.

The command launches a native ASGI application in the genro-asgi worker pool
(requires genro-asgi >=0.43.1,<0.44 while the announced SPA import migration is pending). Each valid HTML request registers a toolbox-generated
22-character page ID before embedding it in the TYTX startup Bag. The core emits
the connection cookie. The browser creates its `PageApplication` (`genro`) before
requesting source, opens its registered WSX channel, then mounts the typed recipe.
`genro.rpc` owns calls and pending-call cleanup. The DOM library's standalone
`Application(host, builder)` API remains available; `Application(host)` followed
by `mountBuilder(builder)` supports deferred construction without any network.

Worker state defaults to `/tmp/genro-pages-PORT`; use `--state-dir` to select another
short local path (Unix socket paths have a length limit). The direct application
constructor used by isolated recipe tests still supports unregistered rendering.
The current local builder 0.23.2 is required and is not yet available from PyPI.

The server is mounted at the site root and binds to loopback by default. The
source-directory asset server is intended for this local experiment; bundled
asset distribution is not implemented. Only `.js` and `.mjs` files beneath the configured
roots are served.

## Validation

Run the test command in [Development checkout](docs/development-checkout.md#environment)
with the same dependency environment used to start the server. Preserve both
`GENRO_CLIENT_MODULES` and the documented Python source overrides. Run
`.venv/bin/python -m ruff check src tests` for lint.

The integration test calls the real AsgiServer, sends its `/main` output to the
JS runtime under jsdom, and checks nesting/order, text, typed attributes and
source ownership. It requires Node and the sibling DOM repository's jsdom dev
dependency. Set `GENRO_CLIENT_MODULES` if the client repositories are elsewhere.
The second test checks the empty shell, asset serving and path confinement.

See [the experiment record](docs/hello-world.md) for exact dependency commits,
the command used locally and browser observations.

## Next steps

Preserve browser reactivity and legacy recipe names. This experiment does not
implement selective datastore synchronization, full per-user/page lifecycle,
remote fragments, resolver transport or component-body transport. Datastore root
semantics remain under review in genro-builders issue #37; Hello World does not
change them. Existing JS web-component collections remain available for the next
experiment, but this page uses ordinary HTML only.

## License

Apache License 2.0. Copyright 2025-2026 Softwell S.r.l.
See LICENSE and NOTICE.

## MessagePack comparison

The page has JSON and MessagePack source comparison buttons. Registered WSK
calls always travel in the core's text WSX envelope with TYTX JSON. Selecting
MessagePack changes the hosted recipe response codec; the core decodes that
response and sends it in its ordinary WSX envelope. This is not binary WebSocket
transport. Explicit HTTP source requests still return MessagePack bytes when
requested. The inspector displays the decoded, mounted source Bag as XML.

The Python environment needs `genro-tytx[msgpack]`; the client source checkout
needs `@msgpack/msgpack` in `genro-tytx/js/node_modules` (tested with 3.1.3).
The browser shim maps TYTX's lazy requires to the existing ESM codec and the
library's ESM distribution. No MessagePack codec is copied into pages.

Three integration cases pass: JSON and MessagePack both build the expected DOM,
plus shell/asset checks. Both transports were observed in the in-app browser.

## RPC transport configuration

`PageConfiguration(..., rpc_http_method="WSK")` sets the default, passed through
the worker and Python application into `startup.rpc.httpMethod`. The command-line
equivalent is `--rpc-http-method WSK` (also POST or GET). The application constructor
accepts the same `rpc_http_method` option. An individual call wins over the default:

```javascript
await genro.rpc.remoteCall('/main', {transport: 'json'});
await genro.rpc.remoteCall('/main', {transport: 'json'}, {httpMethod: 'POST'});
```

`method` remains the remote route; `httpMethod` selects WSK, POST or GET. Calls
return Promises, have timeouts, and reject on disposal or connection failure;
there is no automatic replay or switch to HTTP. The registered page channel is
opened during startup even if application RPC defaults to HTTP. Every source
request checks connection ownership and uses the registered page selection.
The unregistered test/demo application explicitly loads its recipe over GET.
Declarative `dataRpc`, callback compatibility, reconnection, nested iframe routing
and business validation remain subsequent work.

## Browser source ownership

`js/src` is the authoritative copy of page-integration JS/CSS. The wheel build
includes it under `genro_pages/resources`; development serves the original source.
`genro-dom-js` owns generic rendering and binding, independent of pages or ASGI.
Packaging all browser dependencies and validating a standalone installation without
sibling checkouts remain on the roadmap. A source move is not a complete release bundle.

## Architecture and handoff

The [architecture record](docs/architecture/index.md) and
[initial experiment handoff](docs/architecture/handoff.md) preserve the original
requirements and open questions. Consult the current GUI guide and active phased
plan for subsequent implementation progress.

Current local paths and commands: [development checkout](docs/development-checkout.md).

## Inspector editing

Open Inspector with Ctrl+Shift+D and select a node in Data or Source. The value
grid shows *value first, followed by attributes. Edit the right-hand cells directly;
the compact type selector preserves string, number, boolean and null values.
Use + to add an attribute and the row’s minus button to mark it for removal
(or undo that removal). Apply validates the whole draft before updating the
actual Bag; Discard reads the current node again. Complex values and attributes
remain read-only. A horizontal splitter divides the independently scrolling tree
and grid, while the selected path stays in the bottom bar.

External changes refresh an idle editor; pending edits require a reload if the
node changed. Removing the selected node disables editing. Changes affect only
the running instance, not the original recipe. Replacing a Source binding with
a literal intentionally changes that connection. The same client editor serves
Python-hydrated and JavaScript-authored pages without a server request.

## Local technical manual

After installing this checkout (`.venv/bin/python -m pip install -e . --no-deps`), run:

```sh
.venv/bin/genropages manual
```

Open http://127.0.0.1:8037/ in Chrome and use its page translation to read Italian.
Stop the server with Ctrl+C. Use `--port 8038` if the default port is occupied.
`python -m genro_pages manual` is the equivalent module command.

The command serves `docs/manual/html` from this checkout, falling back to a local
`temp/technical-manual-*/html` draft, independently of the current directory.
The manual is not bundled in the Python wheel: use `genropages manual --directory /path/to/html` for an exported
manual. It must contain `index.html`. The server binds to loopback by default;
it serves only the selected HTML directory. This command does not regenerate
or translate the manual. The existing `--modules PATH` page launch is unchanged.
