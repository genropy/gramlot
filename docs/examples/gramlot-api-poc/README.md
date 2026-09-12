# Python OpenAPI explorer

The application is authored in **page.py**. It contains Python layout, Data,
resolver and component declarations, plus small button-action JavaScript snippets.
There is no application JavaScript module. The shared example panel displays page.py beside the live application
in dark, read-only CodeMirror. Open inspector sits immediately below the live border.

`root.openApiClient()` installs reusable browser client behavior, while
`content.openApiForm()` generates bound form Source from the selected operation.
These are framework declarations, not copies of application code embedded in a
Python string. Their implementation, domain compiler and request handling live
in `js/dom/src/services/openapi-client.js` and `openapi-schema.js`.
See [the API and Data contract](../../guides/openapi-client.md).

## Run

```sh
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python docs/examples/teaching/build_preview.py --output build/teaching-preview
node docs/examples/gramlot-api-poc/server.mjs
```

The server compiles page.py to page.tytx at startup using `.venv/bin/python`;
`GRAMLOT_PYTHON` can override the interpreter. Default port: 64324 (`PORT` overrides
it; zero picks a free port). After editing Python, recompile and reload:

```sh
.venv/bin/python docs/examples/gramlot-api-poc/build.py
```

`index.html` only supplies an import map and mount point to the generic Gramlot
standalone Python-page loader. It contains no application event handlers.
The Node server serves assets and local products/quotation API fixtures. All
external API calls use browser resolvers and obey browser CORS.

## Verification and boundaries

The integration test compiles the actual Python Page, decodes TYTX, mounts it in
the browser runtime, selects a referenced-body operation, and sends a request.
It also checks that page.py contains no DOM/HTTP bypasses. Run:

```sh
node --test js/dom/tests/openapi-poc.test.js
node --test docs/examples/gramlot-api-poc/schema.test.mjs
```

Chrome verification: quantity changed to 4 through the number editor, POST quote
returns HTTP 200 and 196 EUR. Source loads actual Python and CodeMirror is readonly.

This remains a bounded OpenAPI prototype, not full Swagger UI parity. Local refs,
scalar path/query/header fields and JSON bodies are supported. Nested objects and
arrays use Gramlot JSON text editors; visual nested forms, composed schemas,
external refs, files/multipart and OAuth flows are still missing. JSON-derived
Bag array shape is retained in memory, not guaranteed across TYTX serialization.
