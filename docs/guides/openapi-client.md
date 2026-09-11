# Python OpenAPI client declarations

`openApiClient` and `openApiForm` are Python authoring helpers that emit ordinary
Source controllers. The corresponding browser behavior lives in Gramlot's
`OpenApiClientService`; the application does not supply JavaScript functions to
build fields, read inputs or send HTTP requests.

```python
root.openApiResolver('schema', url='=loadUrl', reload='^reload', status='schemaState')
root.openApiClient()
root.storeTree(store='^navigation', selectedPath='^selection', labelAttribute='caption')
root.openApiForm()
```

Use these declarations within the same datapath. Multiple clients can be placed
in separate datapaths. `schema` and `selection` binding arguments may be changed
on both helpers; the other session keys below are the current explicit contract.
`openApiForm` accepts normal container attributes and returns its Source pane.

| Data | Role |
| --- | --- |
| `loadUrl`, `reload` | Schema URL and explicit reload counter |
| `schema`, `schemaState` | OpenAPI resolver output and load status |
| `navigation`, `apiTitle` | Generated operation tree and API title |
| `selection` | Tree-relative operation key |
| `operationModel`, `fields` | Compiled operation and input definitions as Bags |
| `input.fN.value`, `input.fN.mode` | Bound field values and include/omit/null mode |
| `includeBody` | Whether the JSON body is sent |
| `send`, `cancel` | Counters changed by application button actions |
| `authorization` | Explicit Authorization header for operation requests |
| `requestPreview`, `requestState`, `formError` | Request preview, lifecycle and validation |
| `response` | HTTP envelope Bag: body, headers, status and timing |
| `responseText`, `responseHeaders`, `responseSummary` | Bound display values |
| `responseRows`, `responseStruct` | Attribute rows and legacy GridStruct Bag |

The application declares its own layout, navigation widget, response widgets and
buttons in Python. Tiny local button actions increment a counter or toggle a
boolean. The service responds to those Data changes, generates Source from the
schema, and delegates requests to `genro.resolvers`. Source removal cancels an
in-flight request through the existing resolver lifecycle.

An operation change rebuilds only the generated form Source and resets its
input Data. Navigation/group expansion remains owned by storeTree. The generator
uses formlet, Gramlot input widgets and Source-authored selects; it never reads
DOM inputs or mounts an independent UI.

The existing bounded OpenAPI support remains: local refs, scalar parameters,
JSON bodies, enum/number/boolean inputs and nested JSON validation. Nested objects
and arrays currently use textBoxArea JSON editors. Full JSON Schema composition,
external refs, multipart, richer nested forms and OAuth remain future work.

## Running a Python-authored static page

The PoC's `build.py` constructs `Page().main(builder.root)` and serializes Source
with `gramlot.transport.to_tytx`. The browser's generic `standalone-page.js` host
loads that document and mounts a GramlotBuilder. Python executes at build time;
HTTP API calls execute through browser resolvers. A Python server is not required.
The local demo server compiles the page at startup; after editing Python, run the
build script again and reload. The source viewer fetches `page.py` through a
text resolver and displays it with readonly CodeMirror using Python syntax.
