# Legacy dbSelect: database, RPC and widget contract

Static source investigation · 2026-09-12. No legacy database/browser run performed.
No Gramlot database dependency or dbSelect implementation is authorized by this
record. Sources below are relative to `/Users/gporcari/Sviluppo/Genropy/genropy`.

## Database-aware authoring

`gnrpy/gnr/web/gnrwebstruct/dojo11.py:998–1071` inspects a field's related column
and relation joiner. The relation branch chooses DbSelect, supplies dbtable and
app.dbSelect, derives labels/zoom information and database-store routing, and
handles a relation key other than the target table's primary key. This is stronger
than an autocomplete receiving a manually assembled list of labels.

`gnrpy/gnr/web/gnrwebpage_proxy/apphandler/db_select.py:55–205` is the public
server method. The database table determines caption fields through
rowcaptionDecode; getQueryFields resolves search columns; auxiliary and hidden
columns extend the fetched data. Table metadata can supply preferred rows, ordering
and weak conditions. rowcaptionDecode in `gnr/sql/gnrsqltable/record.py:638`
resolves the caption template and replaces * with the primary key.

## Two different operations

1. Search: _querystring/querystring searches a bounded candidate selection. Default
   limit is the configured dbselect limit, falling back to 10. The widget uses a
   300ms search delay by default. Search fields, caption fields and extra fields
   are separate concerns.
2. Resolve identity: _id fetches the row for an existing value, using the primary
   key or alternatePkey. The current implementation tests _id by truthiness.
   It explicitly allows logically deleted rows on this lookup path. If a condition
   excludes the current identity, it retries by identity without that condition
   and adds `errors='current value does not fit condition'`. Thus it can retain
   the current caption while marking the value invalid. Draft filtering remains
   explicitly passed on this path.

`gnrjs/gnr_d11/js/gnrstores.js:625–666` can reuse the form record's relation caption,
otherwise resolves _id through the remote resolver and caches the identity result.
It reads result-node errors into the widget's validation state. This behavior is
not merely filtering the dropdown candidates.

## Search algorithm and extension points

The actual `dbSelect_default` implementation (`db_select.py:268–355`) starts with
contains on the first query field; when the result reaches the limit it retries
startswith. If empty it tries case-insensitive word-boundary regex across the
concatenated fields, then ILIKE across those fields. The class-level summary's
startswith-first description is inconsistent with the executable code.

Condition parameters accompany the query; exclude removes selected keys.
weakCondition may relax filtering when no candidates match and reports
resultClass='relaxedCondition'. preferred affects ordering/classes and
invalidItemCondition adds _is_invalid_item. selectmethod replaces the search
handler; applymethod post-processes the selection and can extend result attributes.
Do not treat these filters or browser-supplied parameters as an authorization model.

## Response has two attribute levels

The server returns `(result, resultAttrs)` using the rich RPC result protocol.

- result is a Bag of candidate rows. `gnr/sql/gnrsqldata/selection.py:1230` puts
  row fields in each row node's attributes, with identity/caption metadata. The
  node label is sanitized and is not itself the reliable database identifier.
- resultAttrs describes the selection as a whole: columns, localized headers,
  resultClass, dbselect_time (seconds), optional errors and applymethod additions.
- An optional null candidate is inserted when results exist, notnull is false
  and this is not identity resolution.

This demonstrates why generic RPC needs value-plus-result-attributes support,
without conflating collection metadata with the individual row attributes.

## Browser contract

`gnrjs/gnr_d11/js/genro_widgets.js:4886–4950` constructs a GnrStoreQuery backed by
a resolver. Identity is alternatePkey, explicit store id or _pkey; caption is
separate. selected_* declarations automatically request hidden columns so fields
needed on selection are actually returned. Conditions and exclusion remain tied
to SourceNode parameters instead of being copied once as static UI state.

`genro_widgets.js:5066–5086` chooses app.dbSelect by default and subscribes to
changeInTable to clear the relevant cached identity. `:5380` composes dbSelect
from dbBaseCombo and BaseSelect.

`genro_widgets.js:4533–4574` writes selectedCaption, selectedRecord and selected_*
destinations. selectedRecord is a Bag built from the returned row attributes,
not an unconditional fetch of every column in the database record. The bound
value is the identity; displayed caption and dependent Data fields are distinct.

## Implications to discuss for Gramlot

The reusable contract needs identity lookup as well as text search, schema-derived
caption/search/validation metadata, typed row data, selection-level attributes,
reactive dependent filters and cache invalidation. SQL/table policy belongs to an
explicit server integration, while the browser should consume the service contract.
The exact Gramlot APIs and choice of database adapter remain undecided. First
complete the RPC result-node metadata contract; do not implement a superficial
application-local autocomplete as a substitute for this framework capability.
