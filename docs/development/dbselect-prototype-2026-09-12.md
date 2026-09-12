# dbSelect: first server-backed experiment

Owner requested a working reproduction on 2026-09-12. This local experiment
follows the [legacy audit](dbselect-legacy-contract-2026-09-12.md); it is not full
legacy parity and is included in the owner-requested consolidation commit, without release.

```python
root.dbSelect(value='^selected_state', rpcmethod=self.lookup_states,
              lbl='Find a state', selectedCaption='selected_state_caption')
```

The method must be an explicitly decorated `@endpoint` when supplied as a Python
bound method. Logical method-name strings are also accepted. A configured server
is required; standalone rendering rejects the component. The browser uses the
shared Gramlot server service and TYTX, never SQL or a Genropy dependency.

The endpoint receives `_querystring` for a search or `_id` for identity lookup.
It returns `{rows, identifier, caption, metadata}`; identifier and caption name
columns in the row dictionaries. This first example uses string state codes.
The Genropy selection helper normalizes fetched rows; the example adds the
caption column name. Selection metadata stays distinct from row fields.

The component reuses filteringSelect's keyboard, popup, validation and decoration
behavior. It waits 300ms before searching (`searchDelay` can override this), keeps
one pending call on its SourceNode, refuses another with the shared busy feedback,
and ignores obsolete responses. It cancels owned calls when disconnected.
An existing identity is resolved separately rather than treated as a caption.
Choosing a row writes the value through the normal binding, plus optional
`selectedCaption` and `selected_<column>` destinations. These extra destinations
currently update on explicit choice, not on identity lookup or clearing.

The states example uses a fixed table and parameterized query, a ten-row search
limit and one-row identity lookup. It searches name/code case-insensitively.
Selecting a state drives the existing locality/customer grids; selecting a grid
row resolves the corresponding caption in the input.

## Verified and remaining

Chromium against `test_invoice_pg`: text search for Victoria, committing VIC,
customer-grid refresh, external NSW selection resolving New South Wales, and an
empty search result. The complete Python page is shown in CodeMirror.

Not implemented: legacy fallback search stages, metadata-derived table/field
configuration, reactive condition/exclude parameters, selectedRecord Bags,
identity caching/invalidation, relaxed-condition warnings, rich generic RPC
result attributes, and a reusable Genropy table-policy helper. Non-string keys
need a typed identity contract before claiming support. SQL policy and access
control remain explicitly in each endpoint. A refused request is not queued;
the user can repeat a search after the pending call finishes.

## Owner follow-up: separate customer page

The live trial has moved to `/database/customer-select/`, linked as Customer
 dbSelect in Applications. It searches `invc.customer.account_name` and returns
id, name, locality, postcode and state. Explicit selection demonstrates
selectedCaption and selected-column bindings. The states page retains only its
three linked grids. The earlier state-search checks above describe the initial
trial; a new Chromium check covers customer search and selection on the real DB.
