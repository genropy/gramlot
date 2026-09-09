FastAPI integration
===================

Choose the amount of server code you need
-----------------------------------------

For pages alone, :doc:`first-page` uses ``gramlot fastapi serve [directory]``.
The adapter creates FastAPI and starts Uvicorn. You only author pages.

For a customized FastAPI application, create ``main.py`` at the application root:

.. code-block:: python

   from gramlot.contrib.fastapi import GramlotApplication

   app = GramlotApplication()

   @app.get('/health')
   def health():
       return {'status': 'ok'}

Run it from that root with ``uvicorn main:app``. ``GramlotApplication`` is a
FastAPI subclass; normal endpoint decorators, middleware registration and
FastAPI options remain available. The directory default is the working
directory, not the directory containing the calling Python file.

The discovery CLI does not load your custom ``main.py``. Use Uvicorn explicitly
when you want to execute that application module.

Integrate with an existing application
--------------------------------------

.. code-block:: python

   from fastapi import FastAPI
   from gramlot.contrib.fastapi import mount_gramlot

   app = FastAPI()
   mount_gramlot(app, directory='/srv/catalogue', prefix='/catalogue')
   mount_gramlot(app, directory='/srv/help', prefix='/help')

Each application root contains its own ``pages/`` directory. Each registration
has a separate page collection. Choose distinct prefixes and avoid collisions
with your existing routes. This registration is not the same operation as
mounting the whole Gramlot application below another ASGI URL prefix.

What happens after a request
----------------------------

1. At startup, the adapter discovers Page classes and registers routes and
   packaged static assets. It has not run the page's ``main`` yet.
2. ``GET /page/hello/`` checks the registry and returns an HTML shell containing
   a root element, an import map, startup data and the shared JavaScript entry.
3. The browser loads runtime modules and fetches ``/page/hello/recipe``.
4. The adapter creates a new Page and builder, calls ``main(root)``, then
   returns the Source tree as ``application/vnd.tytx+json``.
5. The browser decodes TYTX, loads the Source into the JavaScript builder and
   mounts it using the runtime Application. That creates the visible DOM.

The index follows the same shell/recipe flow. Its recipe builds the navigation
from the discovered files. Links navigate to full documents; this adapter does
not add a client-side router. This is not server-side HTML rendering of page
content, so do not assume content is in the initial HTML for crawlers.

Where the shared code lives
---------------------------

.. list-table:: Read the implementation in this order
   :header-rows: 1
   :widths: 45 55

   * - File under ``src/gramlot/``
     - Responsibility
   * - ``__main__.py``
     - Command parsing and optional Uvicorn startup
   * - ``contrib/fastapi/application.py``
     - FastAPI subclass, page collection, discovery and request methods
   * - ``contrib/fastapi/runtime.py``
     - Wheel asset locations, URL mapping and import map constants
   * - ``contrib/fastapi/frontend/index.html``
     - Initial document placeholders
   * - ``contrib/fastapi/frontend/entry.js``
     - Fetch, decode and mount the recipe
   * - ``contrib/fastapi/frontend/module.js``
     - Bridge for the current TYTX codec module lookup

Constants describe conventions shared by applications. Instance properties
hold application configuration and discovered classes. Page and builder local
variables belong to a single request. ``PageCollection`` is separate from
FastAPI so its method names do not override FastAPI methods.

Supported scope
---------------

The current adapter supports pages, packaged resources and startup recipes.
It does not inject requests into Page, add server calls, retain sessions,
configure authentication or enable an inspector. Custom FastAPI applications
remain free to provide their own endpoints and middleware.

Browser deployment under a reverse-proxy subpath or a parent ASGI mount
(``root_path``) is not supported yet; generated URLs assume registration at
the server root with the configured page prefix. The default local command is
a development entry point, not a production deployment recipe.

See :doc:`../reference/fastapi` for constructor options and routes.
