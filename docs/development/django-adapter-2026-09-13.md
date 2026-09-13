# Optional Django adapter — 2026-09-13

## Owner scope and implementation

The owner requested `gramlot.contrib.django` with the required host integration,
then supplied the local Bakerydemo checkout as a real consumer to copy and use.
This supersedes the earlier decision register's deferred-Django status.

Implemented locally, without commit/push/release in this task:

- `DjangoPageCollection`: native Django URLconf composition, flat `pages/`
  discovery, fresh pages per invocation, Data/Source TYTX routes and request context.
- `DjangoPage`: invocation-scoped Django request and explicit ORM selection helper.
- Collection/page login and permissions on HTML, recipe and RPC routes; host
  middleware/session compatibility and framework-level masked CSRF headers.
- Thread-sensitive synchronous execution and materialization, explicit application
  transactions and preserved rollback for encoded RPC errors under `ATOMIC_REQUESTS`.
- Shared internal discovery/invocation, browser asset metadata and startup HTML,
  extracted from FastAPI. Existing FastAPI and GenroPy host hooks remain intact.
- Optional `django` extra, Python customer example, guide and CI coverage.

No Django/FastAPI/GenroPy dependency enters core. No Genro ASGI code is imported.
The GenroPy contrib still specifically hosts GnrApp under FastAPI; this work does
not claim that it is now an independently composable Django database provider.

## Real consumer: copied Bakerydemo

Source supplied by the owner:
`../genro-asgi/temp/django_lab/bakerydemo`.
Local copy: `temp/django_lab/bakerydemo` in the canonical Gramlot repository.
Copied 452 files, 26,692,590 bytes; every copied source file matched its original
SHA-256 after verification. The copy excludes Git administration, environments,
node_modules and Python caches. It contains its own copied SQLite database;
no symlinks point back to the original.

Only new integration files were added to the copy:

- `bakerydemo/settings/gramlot.py`: local settings forcing the copied SQLite DB.
- `bakerydemo/gramlot_urls.py`: Gramlot routes before the Wagtail catch-all.
- `gramlot_pages/pages/breads.py`: Python Gramlot grid over
  `BreadPage.objects.live().public()`, with explicit `id/title/slug` projection.

The isolated environment is `temp/django_lab/.venv`, with Django 6.0.8 and Wagtail
8.0. It consumes a locally built, normally installed Gramlot wheel and public
Python dependencies; no PYTHONPATH override was used to run Bakerydemo. The
browser smoke used the wheel built before the simultaneous source version bump
from 0.1.3 to 0.1.4. The final current-source wheel and browser distribution were
subsequently rebuilt and their payload parity verified.

Local server command, from the Gramlot repository:

```sh
temp/django_lab/.venv/bin/python temp/django_lab/bakerydemo/manage.py runserver \
  127.0.0.1:8063 --noreload --settings=bakerydemo.settings.gramlot
```

Browser verification at `/gramlot/breads/`: initial remote Source, 11 published
bread rows, Reload through Data RPC and the Python source panel all worked.
Django `check` reported no issues. Wagtail content/revisions were not edited.
The integration is local test material, excluded from distribution; its existing
CMS frontend is a host application, while the new Gramlot page uses only Gramlot.

## Verification and limits

- Django integration suite: 18 passed on Django 5.2.17 and 18 on Django 6.0.8.
  Includes actual middleware/CSRF modes, authenticated writes, ORM projection,
  rollback, ASGI dispatch, access restrictions, typed RPC and asset traversal.
- Combined Django, FastAPI, GenroPy, page-service, Data RPC and browser-distribution
  contracts: 56 passed after rebuilding assets for source version 0.1.4.
- JavaScript runtime suite: 378 passed, including same-origin CSRF headers and
  native middleware HTTP rejection handling.
- Wheel/browser ZIP: 46 identical files; strict Sphinx build passed.
- Broader Python run: 168 passed, 1 skipped, 5 failed at that checkpoint.
  Four failures concern the separately developed relationTree catalogue/gallery
  contract (required table and missing standalone gallery case). The remaining
  manual-server test failed under sandbox port restrictions and passed when
  rerun with local port permission. These do not make the whole repository green.

The source checkout changed concurrently: the relation-tree work was consolidated
as `8be2f7a` and the owner changed the source version to 0.1.4. Those changes were
preserved, and are distinct from this adapter implementation.

The maintained customer example uses only Python Gramlot declarations for UI,
state, requests and interaction. Small callback fragments only set Data/fire a
reload. The source audit found no application-local fetch, DOM construction or
manual DOM event wiring. Its standard Django admin is the host login mechanism.

See [the adapter guide](../django.md) for supported APIs and explicit limits:
public defaults, application-owned record authorization/pagination/transactions,
process-local shared stores, explicit URL prefix and no custom CSP nonce support.

## Public Bakerydemo explorer — subsequent owner request

The owner chose a public linked-grid explorer with an image that follows the
selected product. The local copy now exposes `/products/explore/`, linked as
**Explore breads** in both desktop and mobile public navigation.

The optional `template_name` argument on `DjangoPageCollection` lets its document
use a Django host template with the normal request context processors. Bakerydemo
extends its existing `base.html`; all new catalogue UI is authored in the Python
Gramlot page, with no iframe, custom application fetch or DOM event machinery.
The adapter supplies escaped startup/import-map JSON and the packaged entry URL.

`public_products/pages/explore.py` selects only live/public BreadPages within the
current site's tree. It materializes the small 11-product catalogue as Data Bags.
A bread-type grid selects the product Bag; product selection drives image,
description, ingredients and the native public detail link through two short
Data controllers. First-row selection is explicit. This resident prototype does
not issue one RPC per selection, so fast keyboard navigation cannot race stale
HTTP replies. Large-catalogue pagination remains outside this local example.
Images use Wagtail renditions generated in the copied media/database environment.

Verified in the actual browser: home → mobile menu → Explore breads; all 11 rows;
Anpan selection; ArrowDown changes photo/details to Appam; Flatbread filters to
Bammy/Bolani and selects Bammy. The rendition files returned HTTP 200, and the
photo was visually checked next to the grids. The page uses a responsive layout
with a sticky detail panel at intermediate widths and stacked content on narrow
screens. The Django adapter suite now has 19 passing tests, including custom
host-template startup and CSRF. Original Bakerydemo files remain untouched;
the earlier copy-equality checkpoint precedes these requested local edits.


## Minimal schema admin PoC

The owner requested an admin tree of the complete installed Django model schema.
The copied Bakery host now exposes `/spa_admin/models/`, wrapped with native
`admin.site.admin_view`, with a staff-only menu link. Its Python page uses
`dataRpc`, Data bindings and `storeTree`; no application DOM or fetch bypass.
The reusable `DjangoPage.model_tree` endpoint is staff-only and requires explicit
model opt-in. Lazy branches traverse app → model → fields → related model.

Verified against the installed local wheel on Django 6/Wagtail 8: 78 models in
22 apps, 1,253 field/relation entries, anonymous redirect, authenticated HTML and
Source RPC. Browser expansion of breads → BreadPage → origin → Country shows
scalar fields and reverse relations. The 21 Django adapter tests pass, including
zero-query schema traversal, lazy descriptors, allowed roots and staff enforcement.
The local host restores Django's normal password hashers because its inherited
test settings accepted only MD5, whereas copied demo accounts use PBKDF2.
No record editing, admin actions or model form generation is implemented.


## SPA dashboard shell

`/spa_admin/` now renders the Python-authored dashboard directly. The model
explorer remains a child page at `/spa_admin/models/`. A split borderContainer
hosts the navigation storeTree and a tabContainer with iframe content panes.
The small explicit page registry includes Model Explorer, Breads grid and
Product explorer. Tabs are declared once, initially hidden, and their iframe
URLs are assigned on first selection. Subsequent selections reuse the same
iframe and preserve its state. All interactions use Data bindings/controllers.
The host permits same-origin frames on these explicit PoC routes; the dashboard
and schema routes retain native staff authentication.

Browser verification: root dashboard, navigation selection, two simultaneously
open tabs, embedded bread grid with 11 rows, and returning to Model Explorer
with the breads branch still expanded. This remains the existing Bakery host;
a standalone Django project and generated CRUD dialogs are separate pending work.

## Generated tables and record editor PoC

The dashboard now includes Tables (`/spa_admin/tables/`). The reusable
`gramlot.contrib.django.tables.DjangoTablesPage` accepts an explicit `table_fields`
map. The Bakery page enables Country (title, sort_order) and BreadType (title).
It generates a model navigation tree, a text search, a bounded 100-record grid
and a record editor with New, Save and Cancel. Table changes use remote Source;
rows use rpcStore; editor state uses Data Bags and standard controllers/RPC.

The grid now publishes `<nodeId>_onRowActivated` with `key` on double-click or
Enter. This reusable framework event drives the Python-authored record dialog.
Read/add/change permissions and active staff status are checked server-side.
Saving uses an allowlisted Django ModelForm inside a transaction, returning
field/non-field validation errors without writing invalid records.

Verified: 22 Django adapter tests, including insert/update, required-field
validation, search and denied writes; 14 grid tests including activation.
Browser: Countries search for Japan, double-click editor, blank-title validation,
cancel, switch to BreadType, double-click and save with grid refresh.

Scope: scalar text/integer fields in the two explicit models; no relation widgets,
delete action, pagination UI, optimistic concurrency detection, Wagtail revision
workflow or general widget mapping yet. This is ordinary Django ORM/ModelForm
editing in the copied host, not a replacement for Wagtail page publication.


## Owner-directed consolidation

The owner requests commit and push of the Django work on develop. The source-only
Bakery overlay is preserved under `docs/examples/django/bakery_overlay`; local
data and media remain untracked. No release, tag or deployment is requested.

Next architectural step: move the record editor shell and common lifecycle into
base Gramlot components and the Python base page. Django specializes model
metadata, validation, permissions and persistence. Backend capabilities may be
Genropy-only; distinguish those from capabilities merely missing in an adapter.
The current DjangoTablesPage remains a PoC pending that extraction.

## Minimal IDE components in the SPA

Owner correction: the SPA uses `gramlotIde` directly inside its tab panes, without
an IDE page wrapper, nested iframe or workspace selector. The main navigation
has Source files entries for Django templates, SPA pages, public pages/CSS and
bread grid pages. Each entry maps to an explicit named filesystem root and an
independent editor Data scope. Django gates provider operations to active staff
superusers; the shared filesystem provider owns bounded reads, revision checks
and atomic saves. No arbitrary folder path is accepted by this integration.

Verified in the browser: direct template tree, switching to the public source
root and opening explore.py. The preceding provider integration also verified
editing/saving a temporary template comment and restoring the original content.
Focused Django/filesystem tests passed 27 cases. Python source saves do not
hot-reload the current no-reload host; restart it to execute changed page code.
HTML preview does not render Django template tags.

## Server-rendered template preview

The shared IDE now accepts a generic `previewmethod` endpoint. Django renders
unsaved template text with application-provided context and request processors;
Bakery supplies the first matching published/public page in the current site.
The existing sandboxed preview iframe displays returned HTML with a host base
URL. No file write occurs during preview. This supersedes the raw-template-only
preview limitation above for supported page templates.

Verification: 28 Django/filesystem tests and 7 IDE tests pass. A new regression
checks unsaved rendering without file mutation, and a client regression checks
stale results after edits/disposal. Actual browser rendering of bread_page.html
shows Anadama, its photo, origin, bread type and ingredients, with assets HTTP 200.

## Unified GramlotPages sources

Owner correction: all Bakery Gramlot pages and their CSS now live together in
`GramlotPages/pages/`. The IDE navigation exposes a single **GramlotPages** root
beside Django templates. The three URL collections load that directory and keep
explicit page subsets, preserving public/admin routing boundaries. This replaces
the separate schema_admin, public_products and gramlot_pages source directories.
Verified registry membership and the browser tree containing all seven source
files. The complete Bakery snapshot and source overlay use the same layout.

## validate_remote bridge

The core validator now accepts a logical RPC method name in addition to the
existing injected callback. Named remote parameters and the current candidate
are sent through ServerCallService with the field's abort signal. Existing
field generation/signature checks remain responsible for stale results.
DjangoTablesPage now owns its draft in a Gramlot form, accepts custom ModelForms
through table_forms, and validates remote candidates with the same factory as
Save, without persisting the validation result.

Verified: 25 Django tests and 24 JS form/validation tests. The custom ModelForm
regression covers clean_name and cross-field clean, agreement with Save, and
unchanged database values. Browser: empty title → blur → required-field error
before Save; corrected title → blur → error removed; Cancel without writing.

## Form presentation and richer sample

The record editor now uses the shared groupBox (record caption), form and a
two-column formlet with top-left labels. Textarea ModelForm widgets map to
textBoxArea. The backdrop and SPA header use a light palette. LocationPage is
explicitly exposed with seven scalar fields (title, slug, introduction, address,
coordinates, title tag and meta description); creation is disabled on both the
UI and server because Wagtail tree insertion belongs to its native admin.
Existing row edits retain the PoC's ordinary ModelForm semantics, without Wagtail
revision/publication handling. Remote validation waits for a loaded draft.
Verified 25 Django tests and the Hof editor in the browser, including the titled
GroupBox and seven aligned fields. No existing location was changed.

### Automatic relation widgets and related tabs

Exposed single relations now use dbSelect with identity/caption lookup backed by
the ModelForm queryset. Reverse and many-to-many relations to explicitly exposed
targets generate separate read-only grid tabs under the record. Bakery enables
LocationPage.image, hours_of_operation, and breads under Country/BreadType.
Unsaved parents do not query children. Saving scalar fields preserves M2M links.
A shared select fix deduplicates repeated pending identity assignments and waits
for identity lookup during select validation, including numeric ORM identities.
