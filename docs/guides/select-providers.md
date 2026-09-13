# Remote and callback selects

The complete [generated parameter reference](../source/reference/select-providers.rst)
covers dbSelect, remoteSelect and callbackSelect, including provider requests,
responses and complete minimal Python examples. Its source is
`js/dom/src/components/builtin-components.json`; the same descriptive metadata
is retained in the generated JavaScript catalogue and Python element schema.
Regenerate all three outputs with:

```sh
python scripts/generate_components.py --documentation docs/source/reference/select-providers.rst
```

The generation consistency test checks the documentation too. Parameter types
are descriptive metadata at this stage, not new runtime validation rules.

`remoteSelect` and `callbackSelect` belong to the `inputs` component collection.
They share dbSelect's identity/caption selection behavior; their providers need
not query database records. This is a local prototype, not a published release.

```python
pane.remoteSelect(value='^.table', rpcmethod=self.tables,
                  kw_package='=.package', lbl='Table')
pane.callbackSelect(value='^.table', kw_rows='=tables', callback='''
    return {rows: kw.rows.filter(row => kw._id != null
        ? row.id === kw._id
        : row.name.toLowerCase().includes((kw._querystring || '').toLowerCase())),
        identifier: 'id', caption: 'name'};
''', lbl='Table')
```

The remote method must be an exposed `@endpoint`. Callback code executes in the
browser with `this` bound to its SourceNode and `kw` containing the parameters.
JavaScript authoring may also supply a function. Synchronous values and Promises
are accepted. The callback component itself works in a standalone application.

Each request resolves `kw_*` bindings afresh and removes the prefix. Searching
adds `_querystring`; resolving an existing value adds `_id`. Providers must
handle both, since stored identity and displayed caption are separate.
Return an object with `rows` (record array), `identifier` (identity field name),
`caption` (caption field name), and optional `metadata`. Row identities must be
nonempty and unique; captions must be present. Remote results travel through the
existing typed RPC service. `selectedCaption` and `selected_<field>` publish
selection details as with dbSelect.

Search uses `searchdelay` (300 ms by default). A pending request refuses a second
one with the shared busy feedback. Obsolete results are discarded; there is no
automatic queue/replay. Clearing the bound value invalidates pending results and
cached choices. Cascading controls explicitly clear dependent values through
dataController declarations. Changing only a `kw_*` scope does not clear a value.

## Example and verified scope

With the optional GenroPy FastAPI host, open `/database/model-selects/`. Both
variants select a logical package, table and field from the same model metadata,
including virtual columns. Logical packages are not necessarily SQL schemas.
The callback catalogue is loaded with the initial Source; subsequent selection
uses no RPC. The remote variant calls `model_choices`. Both example providers
limit results to 40; pagination is not implemented.

The example uses Gramlot declarations throughout and displays its complete
Python module, including its endpoint. Browser verification covers
`invc → customer → email`, no callback RPC, and clearing table/field after a
package change. A standalone component test covers Promise and identity lookup.

Legacy `RemoteSelect`/`CallBackSelect` are the reference, but their `headers/data`
return format is not accepted by this prototype. Multi-column popup layout,
full legacy store adapters and remote-content replacement integration remain
separate work. This slice does not complete the all-store integration review.
