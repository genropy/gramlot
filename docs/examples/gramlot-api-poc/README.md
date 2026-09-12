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
.venv/bin/python docs/examples/serve.py
```

Open http://127.0.0.1:8051/openapi/. The common FastAPI server compiles page.py
at startup, serves the shared prepared browser runtime, and provides synthetic
products/quotation API fixtures. After changes, restart without --no-build.

`index.html` supplies the import map and mount point to the generic Gramlot
Python-page loader. The application contains no DOM or request bypasses. Browser
resolvers execute external API calls, subject to browser CORS. The fixture schema
explicitly uses the host root for its API paths.

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
