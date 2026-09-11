# Gramlot API exploration

Status, 2026-09-10: parked by the owner; no further work scheduled.
The tag -> path -> HTTP operation disclosure tree was added and verified,
including branch collapse and operation selection. To resume, the proposed
next experiment is one nested request (customer, address, editable item list),
including omitted/null/empty values and field errors. That experiment is not
authorized merely by this note. CDN packaging and a reusable public component
remain future work.

Local proof of concept, not a published package or complete OpenAPI client.
The browser reads `openapi.json` and generates the operation form as Gramlot
Source through HtmlBuilder. Navigation and response rendering are small DOM
adapters; requests use fetch while the framework service contract is pending.
No Python runs in the interface. The Node server only serves assets and provides
an in-memory demo API. Requests do not save orders or modify external services.

Run from the repository root (requires existing teaching-preview runtime assets):

```sh
node docs/examples/gramlot-api-poc/server.mjs
```

Open http://127.0.0.1:64324/.

Supported demonstration subset:
- Local OpenAPI 3.0.3 document, GET query and POST flat JSON object.
- String, number/integer, enum and optional boolean inputs.
- Required fields and numeric minimum through native HTML validation.
- Request preview, HTTP status/duration/headers, raw JSON and array table.
- Abort on operation changes and generation checks against stale responses.

This is intentionally bound to two local demo operations. It does not yet load
arbitrary schemas, resolve refs, handle nested objects, oneOf, authentication,
files, path/header parameters or OpenAPI parameter serialization styles.
Blank fields are omitted in this first PoC: explicit empty string versus null
versus omission needs a dedicated control before claiming general API support.
There is no CDN bundle or custom-element public API yet; import maps and local
assets are used to verify the interface concept first.

Browser checks performed: GET q=lamp returns only Desk lamp as table and JSON;
POST productId=1 and quantity=2 returns total=98 with HTTP 200 and response
headers. These are actual HTTP calls to the local demo server.
