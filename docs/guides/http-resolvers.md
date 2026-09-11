# HTTP and OpenAPI resolvers

Python declarations produce ordinary Source data controllers. Requests run in
the browser; Python does not fetch the URL during page construction.

```python
root.data('apiUrl', '/openapi.json')
root.openApiResolver('schema', url='^apiUrl', status='requestState', timeout=30)
root.storeTree(store='^schema', labelAttribute='caption')

root.urlResolver('contacts', url='/api/contacts', qs={'city': '^filters.city'},
                 status='contactsState')
```

JavaScript authoring exposes the same helpers:

```javascript
root.openApiResolver('schema', '^apiUrl', {status: 'requestState', timeout: 30});
root.urlResolver('contacts', '/api/contacts', {qs: {city: '^filters.city'}});
```

The destination and status paths are relative to the controller's datapath.
Declarations load at startup and when a `^` binding changes; `=` bindings are
sampled without triggering a request. Nested query/header/body bindings work too.
Use `_on_start=false` to suppress the initial load. An additional bound option,
such as `reload='^reloadCounter'`, can explicitly trigger a fresh request.
Each declarative execution creates a new resolver, so it always fetches anew.

Status is a Bag with `state` (`loading`, `ready`, or `error`) and `error`.
On failure, the previous result remains intact. A newer request cancels the old
one and prevents stale responses from publishing. Removing the Source controller
or disposing the application cancels its request.

Options include `method`, `qs`, `headers`, JSON `body`, and `timeout` in seconds
(default 30; zero disables the timeout). Browser CORS rules apply. Authentication
headers must be supplied explicitly. `_onResult` accepts JavaScript with a
`result` variable; returning a value replaces the stored result. `_onError`
receives `error`. Both run in the controller context.

## Result structure

`urlResolver` converts JSON objects and arrays into Bags recursively. Array
labels are `r_0`, `r_1`, etc. Scalar JSON results remain scalar. Keys containing
dots remain literal labels, accessible with Bag path arrays.

`openApiResolver` accepts an OpenAPI 3.x JSON document. Following the Python
`genro_bag.resolvers.openapi_resolver.OpenApiResolver` convention, it exposes:

- `info`: description value, with title/version attributes.
- `api.<tag>.<operationId>`: operation metadata, method, path, resolved URL,
  combined parameters, query placeholders, requestBody, responses and security.
- `components`, `servers`, `externalDocs`, `security` when present.
- `spec`: the complete original document converted to a Bag.

Relative servers and server-variable defaults are supported. Missing operation
IDs receive a method/path label. Schema `$ref` values are preserved, not expanded;
YAML and external-reference fetching are not implemented. Request bodies remain
OpenAPI metadata rather than generated input forms.

## Explicit operation calls

The exported JavaScript classes also work independently:

```javascript
import {OpenApiResolver} from 'gramlot-dom';

const resolver = new OpenApiResolver('/openapi.json');
const schema = await resolver.resolve();
const operation = schema.getItem('api.contacts.getContact');
const result = await resolver.operationResolver(operation, {
    pathParams: {id: '42'},
    headers: {Authorization: 'Bearer ...'}
}).resolve();
```

After discovery, `resolver.document` exposes the original JSON document for
schema compilers; `resolve()` still returns the navigable Bag described above.

Unlike the Python implementation's `value` resolver, discovery and tree expansion
do not invoke API operations. Invocation uses `operationResolver` explicitly.
Missing path parameters raise an error. Supply body/query values explicitly;
Bag bodies are encoded as objects, so use ordinary JSON arrays for array bodies.

Standalone instances cache through BagResolver (`cacheTime` seconds): URL defaults
to 300, OpenAPI to indefinitely (-1), and operation calls to 20 for GET or zero
for other methods. Declarative helpers do not share those instance caches.

The gallery's storeTree examples 3 and 4 demonstrate OpenAPI discovery and JSON
loading using local fixtures. The schema's example endpoints are descriptive;
the static preview does not implement them.

## Response modes and envelopes

`responseType='text'` reads source/text resources. `responseType='auto'` parses
JSON when possible and otherwise retains text. The default remains strict JSON.
With `envelope=True` (JavaScript `true`), the result is a Bag containing `status`,
`statusText`, `ok`, `duration` in milliseconds, `headers`, `body` and original
`text`. HTTP errors are returned in that envelope; network errors still reject.
This permits API explorers to display non-2xx responses through Data bindings.

The exported `jsonBag` and `plainJson` utilities preserve arrays in memory,
including empty nested arrays. Array shape is attached to the in-memory Bag;
TYTX serialization of this shape is not yet guaranteed. Explicit JSON null bodies
are sent as `null`; omit the body option (or pass undefined) for no request body.
