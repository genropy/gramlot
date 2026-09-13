# Django adapter

`gramlot.contrib.django` hosts Python-authored Gramlot pages inside an existing
Django project. It provides Source and Data RPC, the packaged browser runtime,
request access, optional page permissions and an explicit ORM selection helper.
Django and FastAPI remain optional; this adapter does not import FastAPI or GenroPy.

This is local development work after 0.1.3, not a published release. Install the
locally built wheel with its `django` extra until a release includes the adapter.
The supported dependency range is Django 5.2 and 6.0, subject to each Django
version's Python requirements.

## Add pages to a project

Create `pages/hello.py` under your application's chosen directory:

```python
from gramlot.contrib.django import DjangoPage
from gramlot.page import endpoint

class Page(DjangoPage):
    def main(self, root):
        root.h1('Hello from Django')
        root.dataRpc('greeting', self.greeting, _onStart=True)
        root.p('^greeting')

    @endpoint
    def greeting(self):
        user = self.request.user
        return f'Hello {user.username}' if user.is_authenticated else 'Hello visitor'
```

Include the collection in your normal URLconf:

```python
from django.conf import settings
from django.urls import include, path
from gramlot.contrib.django import DjangoPageCollection

pages = DjangoPageCollection(settings.BASE_DIR, prefix='/ui', title='My application')
urlpatterns = [path('ui/', include((pages.urls, 'gramlot'), namespace='gramlot'))]
```

Open `/ui/hello/`. The `prefix` must match the full public mounting path, including
any outer `include()` paths. Nested paths such as `/tools/ui` are supported;
reverse-proxy script-prefix discovery is not automatic. Put these routes before
CMS catch-all routes. Multiple collections can use distinct prefixes/namespaces.

The collection discovers flat Python files under `pages/`, ignores underscore
files and directories, and requires a locally defined `Page(WebPage)` subclass.
It creates a fresh page and Source for every invocation. Ordinary `WebPage` also
works; `DjangoPage` adds `self.request` and `selection_result`. An annotated
`InvocationContext` parameter remains available with either base class.

No custom `manage.py` replacement, server bootstrap, Django REST Framework,
GenroPy, or `INSTALLED_APPS` entry for Gramlot is required. Keep Django's normal
middleware, URLconf and management commands.

## Use the host website template

Pass `template_name='products/explorer.html'` to `DjangoPageCollection` to use a
normal Django template, including inheritance and request context processors.
The template can extend the site's existing header/footer shell. Put the new
application UI in the Python Page's Source.

The adapter supplies `gramlot_title`, `gramlot_imports`, `gramlot_startup` and
`gramlot_entry`. Include the following in the host template:

```html
<script type="importmap">{{ gramlot_imports|safe }}</script>
<div id="root"></div>
<p id="error" role="status" hidden></p>
<script type="application/json" id="startup">{{ gramlot_startup|safe }}</script>
<script type="module" src="{{ gramlot_entry }}"></script>
```

The two JSON values are escaped by the adapter for script-element embedding;
keep them intact. Place the import map before scripts that import Gramlot modules.
CSRF and access checks are identical to the default shell. This contract embeds
one Gramlot application per document.

## Authentication, permissions and CSRF

Use Django's session and authentication middleware. You can require login and
permissions for an entire collection:

```python
pages = DjangoPageCollection(
    settings.BASE_DIR, prefix='/ui', login_required=True,
    permission_required='sales.view_customer',
)
```

Or declare `login_required` and `permission_required` on a page. Collection and
page requirements both apply to HTML, recipe GETs and every Source/Data RPC.
Unauthorized pages are omitted from the navigation recipe. Anonymous requests
receive 401; authenticated users lacking permission receive 403. The adapter
does not redirect RPCs to login HTML. Authentication UI belongs to the Django
host; return to/reload the Gramlot page after signing in or out.

Defaults are public. `@endpoint` exposes a callable; it does not authorize record
access. Check write permissions inside write methods and filter querysets for
the current user. `example_view=True` deliberately shows Python source, so use it
only for examples whose implementation is intended to be visible.

CSRF protection stays enabled on POSTs. The host embeds a masked token in startup
configuration and the shared Gramlot client sends the configured header for both
Source and Data RPC. This supports custom CSRF header/cookie names, HttpOnly
cookies and `CSRF_USE_SESSIONS`. Pages are not publicly cached. Token-bearing RPC
configuration only allows the same origin. No application JavaScript or
`csrf_exempt` is needed. Native middleware rejections retain their HTTP status
in client errors, even when their bodies are HTML.

## ORM results and transactions

Project selected fields explicitly:

```python
@endpoint
def customers(self):
    queryset = Customer.objects.filter(active=True).order_by('id')
    return self.selection_result(queryset, fields=['id', 'name', 'balance'])
```

Alternatively pass `queryset.values('id', 'name')`, or mappings from another data
provider. `selection_result` is also exported as a function. It returns the shared
`{rows, identifier, metadata}` contract; the browser constructs the Data Bag.
Decimal/date values retain their types through TYTX. Model instances and arbitrary
lazy objects are not automatically serialized. Identifiers must be unique,
nonempty string or finite numeric values; explicitly map UUID identities to
strings when needed.

Filtering, ordering, pagination, total counts and field authorization belong to
the application. `metadata.totalrows` defaults to the materialized row count;
pass explicit metadata when returning a page from a larger selection.

Views are synchronous under both WSGI and ASGI. Synchronous page services and
queryset materialization run on the request thread via Django's thread-sensitive
async bridge. Async services are supported, but synchronous ORM work must stay
inside synchronous methods or an appropriate Django async bridge. Use
`transaction.atomic()` around writes; the adapter also preserves
`ATOMIC_REQUESTS` rollback when RPC exceptions become error responses. It never
adds implicit commits. With `DEBUG=False`, unexpected exception details are
logged server-side and replaced with a generic response.

## Assets and limits

The collection serves the shared packaged runtime under `PREFIX/_runtime/`.
Installed bundles have content-versioned URLs and immutable caching; source
checkout assets use no-cache. File traversal and symlink escapes are rejected.
No npm build or `collectstatic` is required in the consuming application. For
high-volume delivery, a front server may serve that same packaged asset subtree.
A restrictive custom CSP needs host-specific integration; nonce handling is not
implemented by this adapter.

`ExclusiveBagStore` remains local to one collection/process and is not a Django
session store or shared multi-worker backend. This integration does not add
WebSockets, automatic ModelForms, admin generation,
Wagtail revision editing, or a universal ORM abstraction.

## Examples and verification

The maintained [Django customer example](examples/django/README.md) uses a grid,
a permission-checked update and a transaction, authored entirely through Gramlot.
The owner-supplied local Bakerydemo copy is separately exercised with Django 6.0
and Wagtail 8; see the [implementation checkpoint](development/django-adapter-2026-09-13.md).

## Staff-only model schema tree (PoC)

`DjangoPage.model_tree` exposes lazy model metadata to active staff users only.
It is disabled by default (`model_roots = ()`). Set `model_roots` to explicit
lowercase Django labels, or `('*',)` to include all installed models.

```python
class Page(DjangoPage):
    login_required = True
    model_roots = ('*',)

    def main(self, root):
        root.dataRpc('schema', self.model_tree, _on_start=True)
        root.storeTree(store='^schema', selectedPath='^selected',
                       typeAttribute='dtype', relationAttribute='relation_direction')
```

The root lists apps; expanding an app lists models, and expanding a model lists
fields with data types and lazy related-model branches. Foreign keys, reverse
relations and many-to-many relations are included. Each expansion uses the same
permission-checked endpoint. Metadata traversal makes no record queries.
Wrap the collection URL callbacks with `admin.site.admin_view` to protect the
HTML entry and integrate the native admin login, as the local Bakery PoC does.

This is a schema explorer, not a record editor or ModelAdmin replacement.
Auto-created intermediary models and hidden fields are excluded; generic targets,
Python properties and internal StreamField block schemas are not expanded.
Relation paths are limited to 24 levels, including cyclic model graphs.

## Generated table editor (local PoC)

Subclass `gramlot.contrib.django.tables.DjangoTablesPage` and declare explicit
`table_fields = {'myapp.country': ['title', 'sort_order']}`. The page provides
model selection, search (up to 100 rows), and New/Save/Cancel in a record dialog.
Double-click or Enter activates a grid row. Server-side ModelForms validate
allowlisted fields; each operation checks active staff status and Django model
permissions. The first projection uses text inputs for scalar fields only.
Relations, deletion and custom widget mapping are not implemented in this slice.

## Django template preview in the IDE

`DjangoIdePage.document_preview` renders the unsaved HTML template through the
Django template backend and request context processors. Override
`template_preview_context(root, path)` to supply application example data.
The provider requires an active staff superuser, an existing file in a named
allowlisted root and bounded HTML text. It does not save the submitted content.
Declare `gramlotIde(..., previewmethod='document_preview')` in the common UI.

The Bakery dashboard matches page templates to a published/public Wagtail page
within the current site and uses that page's context. `breads/bread_page.html`
was verified with Anadama, including inherited layout, CSS, image and ingredients.
Partials, unmatched templates and app shells requiring extra startup data need
an explicit preview context; they return an explanatory error. The preview is
sandboxed, so scripts and interactive menus do not execute. Click Preview again
after edits to render the current text; changes to included templates use their
saved versions on disk.

## Remote field validation and custom clean methods

`DjangoTablesPage.table_forms` maps an exposed model label to a custom ModelForm
class. Both remote validation and saving use that class, restricted to
`table_fields`. Its `clean_<field>()`, form `clean()` and model validation run
through the ordinary Django `is_valid()` lifecycle.

Generated fields use the shared `validate_remote='validate_record_field'` RPC
bridge. `validate_remote_<name>` attributes supply request parameters; the
candidate `value` is authoritative. The form sends its current record values
and identity, replaces the selected field with the candidate, and returns that
field's errors plus non-field errors to Gramlot's validation UI. Dependency
changes revalidate against the other draft fields. Validation does not save;
Save independently repeats the complete ModelForm validation.

Custom clean methods must remain free of persistence side effects, as they may
run repeatedly during editing. Cross-field errors appear on the validating
field and in the form's validation summary; save-time errors retain the existing
field/non-field mapping. This does not translate Python clean methods to JS.

### Automatic relations in table forms

`DjangoTablesPage` maps exposed ForeignKey and OneToOne fields to the shared
`dbSelect`, using the ModelForm queryset for search and identity lookup. The
related model must grant Django view permission; ModelForm validation still
checks the submitted identity on save and during remote validation.

Reverse one-to-many and many-to-many relations automatically become separate
`tabContainer` panes below the form when their target model is exposed through
`table_fields` or `table_related_fields`. The latter mapping declares read-only
related columns without adding a table to the navigation. Only scalar allowlisted
columns are projected. Each grid filters through the selected parent's relation,
returns at most 100 rows and checks parent and target view permissions on every
request. An unsaved parent displays a save-first message.

The Bakery example exposes an image dbSelect and operating-hours grid for
LocationPage, and related bread grids for countries and bread types. Related
grids are currently read-only; saving the parent preserves existing many-to-many
links. These declarations use shared Gramlot components; ORM discovery and
permission checks belong to the Django adapter.
