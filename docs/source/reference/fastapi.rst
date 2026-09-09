FastAPI adapter reference
=========================

Command line
------------

.. code-block:: text

   gramlot fastapi serve [directory] [--host HOST] [--port PORT] [--prefix PREFIX]

.. list-table:: Command arguments
   :header-rows: 1

   * - Argument
     - Default
     - Meaning
   * - ``directory``
     - Current working directory
     - Application root containing pages/
   * - ``--host``
     - ``127.0.0.1``
     - Listening address
   * - ``--port``
     - ``8000``
     - Listening port
   * - ``--prefix``
     - ``/page``
     - URL prefix for pages and their assets

``gramlot manual --directory PATH`` remains a separate command for serving
already generated HTML documentation. It does not build Sphinx output.

Python entry points
-------------------

Import from ``gramlot.contrib.fastapi``. Importing this optional module requires
FastAPI; importing Gramlot's core does not.

.. py:class:: GramlotApplication(directory=None, *, prefix='/page', page_title='Gramlot', **fastapi_options)

   A FastAPI subclass that registers a page collection during construction.
   ``directory`` accepts a string or Path. ``page_title`` sets the HTML document
   title. Additional options are passed to FastAPI, so ``title='My API'`` changes
   the API documentation title rather than the page document title.

.. py:function:: mount_gramlot(app, directory=None, *, prefix='/page', title='Gramlot')

   Register pages on an existing FastAPI application and return its PageCollection.
   Here ``title`` is the HTML document title. The page collection is infrastructure;
   ordinary page authors do not need to instantiate it directly.

The URL prefix is one or more slash-separated segments, each beginning with a
lowercase letter and continuing with lowercase letters, digits, underscores or
hyphens. It must begin with ``/`` and must not end with ``/``. The bare root
``/`` is not a supported prefix in this version.

Registered routes
-----------------

For the default prefix:

.. list-table:: GET routes
   :header-rows: 1

   * - URL
     - Response
   * - ``/page/``
     - Index HTML shell
   * - ``/page/recipe``
     - Index Source in TYTX JSON
   * - ``/page/{name}/``
     - Page HTML shell, or 404 for an unknown name
   * - ``/page/{name}/recipe``
     - Page Source in TYTX JSON, or 404 for an unknown name
   * - ``/page/_runtime/...``
     - Shared frontend and packaged runtime files

No mutable Page or builder is cached between recipe requests. The registry
contains classes. Page authoring exceptions during a request remain server
errors; the browser startup shows a recipe-request failure.

Dependencies
------------

The ``fastapi`` extra adds FastAPI and Uvicorn.
The shared frontend is distributed in the Gramlot wheel alongside runtime
assets. Rebuilding the framework wheel is separate from authoring Python pages.
