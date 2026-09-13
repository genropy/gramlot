Gramlot documentation
=====================

Gramlot lets you describe an interface in Python and render it with its
JavaScript runtime in the browser. Start with a page recipe, then choose how
to serve it. The optional FastAPI adapter provides a small working application
without requiring you to write HTML, JavaScript startup code or a server module.

This English manual documents the current alpha. It starts the user-facing
manual and reference; it is not yet an exhaustive widget or JavaScript API
catalogue.

Integrations
------------

**FastAPI integration** is available now. Serve discovered Python pages with
``gramlot fastapi serve [directory]``, or add them to an existing FastAPI app.
See :doc:`guide/fastapi`.

**Django integration** is available in the current development tree. Add Gramlot
pages to an existing Django project; see :doc:`guide/django`.

.. toctree::
   :maxdepth: 2
   :caption: Learn Gramlot

   guide/overview
   guide/first-page
   guide/components
   guide/fastapi
   guide/django

.. toctree::
   :maxdepth: 2
   :caption: Reference

   reference/pages
   reference/fastapi
   reference/labled-box
   reference/formlet
   reference/validation
   reference/textbox-area
   reference/inspector
   reference/local-logic
   reference/select-providers

For a first runnable example, follow :doc:`guide/first-page`. For an existing
FastAPI project, go directly to :doc:`guide/fastapi`.
