Your first three pages
======================

Install Gramlot
---------------

Use Python 3.11 or newer and a virtual environment. The first alpha is available
on PyPI. Pin its version explicitly because it is a prerelease:

.. code-block:: console

   python3 -m venv .venv
   source .venv/bin/activate
   python -m pip install 'gramlot[fastapi]==0.1.0a1'

On Windows, activate the environment with ``.venv\Scripts\activate`` instead.
The wheel includes browser assets; these Python examples do not require Node
or an application frontend build.

Create the application directory
--------------------------------

.. code-block:: text

   my_app/
   └── pages/
       ├── hello.py
       ├── alfa.py
       └── beta.py

No ``main.py`` or ``application.json`` is needed. Each file defines its own
``Page`` subclass. Save this as ``pages/hello.py``:

.. literalinclude:: ../../examples/hello/pages/hello.py
   :language: python

``metadata`` comes from Genro Toolbox, already a Gramlot dependency. It sets
the class attribute ``title`` used by the index. The docstring explains the
page to a reader of the source; the current index does not display it.
See :doc:`../reference/pages` for reserved names and exact behavior.

Save the other two pages:

.. literalinclude:: ../../examples/hello/pages/alfa.py
   :language: python
   :caption: pages/alfa.py

.. literalinclude:: ../../examples/hello/pages/beta.py
   :language: python
   :caption: pages/beta.py

Start the server
----------------

From anywhere, provide the application directory:

.. code-block:: console

   gramlot fastapi serve /path/to/my_app --port 8000

Or enter that directory first:

.. code-block:: console

   cd /path/to/my_app
   gramlot fastapi serve

Open http://127.0.0.1:8000/page/. The generated index lists Alfa, Beta and Hello,
ordered by filename. Follow each link to see its heading. The three URLs are
``/page/alfa/``, ``/page/beta/`` and ``/page/hello/``.

Change the text in ``root.h1(...)``, stop the server with Ctrl+C, start it again
and refresh the browser. Discovery happens at startup: this command does not
currently enable automatic reload.

The files above are also runnable directly from a Gramlot checkout:

.. code-block:: console

   gramlot fastapi serve docs/examples/hello

If startup fails
----------------

* **Missing optional dependencies:** install ``gramlot[fastapi]==0.1.0a1`` in
  the same environment that provides the ``gramlot`` command.
* **Pages directory not found:** pass the parent of ``pages/``, not ``pages/``
  itself. With no argument, the current working directory is used.
* **Cannot load page:** inspect the named file. It must define a local
  ``Page(WebPage)`` with an implementation of ``main``.
* **Address already in use:** stop the previous server or select another
  ``--port``. Opening a URL does not start the server.
