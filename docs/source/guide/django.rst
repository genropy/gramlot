Django integration
==================

``gramlot.contrib.django`` adds Python Gramlot pages to an existing Django
project. Django remains optional and the adapter does not depend on FastAPI.
This adapter is currently local development work after version 0.1.3.

Mount a collection in your Django URLconf::

    from django.conf import settings
    from django.urls import include, path
    from gramlot.contrib.django import DjangoPageCollection

    pages = DjangoPageCollection(settings.BASE_DIR, prefix='/ui')
    urlpatterns = [path('ui/', include(pages.urls))]

Create ``pages/hello.py`` under that directory::

    from gramlot.contrib.django import DjangoPage

    class Page(DjangoPage):
        def main(self, root):
            root.h1('Hello from Django')

Open ``/ui/hello/``. The prefix must match the full public mounting path.
Keep the project's existing Django middleware and management commands.
Install the local wheel with the ``django`` extra until a release includes it.

Services and data
-----------------

Pages retain ``@endpoint``, ``@source`` and ``InvocationContext``. ``DjangoPage``
adds invocation-scoped ``self.request`` and a ``selection_result`` helper that
materializes explicitly projected ORM fields into the shared row-selection
contract. The helper is also available as a module-level function.

Collection and page ``login_required`` and ``permission_required`` settings
protect HTML, recipes and RPCs. Defaults are public; write methods must check
appropriate permissions. Django session/CSRF middleware stays active. The
Gramlot runtime sends the host-provided masked CSRF token automatically.
Reload the page after a change of authentication state.

Synchronous services keep ORM work and materialization on the request thread.
Use Django transactions for writes; RPC error responses preserve rollback under
``ATOMIC_REQUESTS``. Packaged runtime assets are served by the collection.
Process-local Gramlot stores are not distributed or session-backed stores.

The repository's ``docs/django.md`` provides the full guide and
``docs/examples/django/`` contains a runnable customer grid and update example.
