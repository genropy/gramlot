Pages and metadata
==================

Page contract
-------------

A discovered file defines a class named ``Page`` derived from
``gramlot.page.WebPage``. It must be defined in that file rather than merely
imported from another module, and must implement ``main(self, root)`` directly
or through a base class other than the unimplemented ``WebPage.main``.

The loader instantiates it without arguments for each recipe request. Therefore
its constructor must accept no required arguments. A class that fails that
requirement will fail when requested; discovery does not instantiate it.

``root`` is the authoring surface of a fresh ``GramlotBuilder``. The adapter
calls ``main(root)`` and serializes ``builder.source``. Classes are imported
once at startup; mutable page and builder instances are created per request.

Use the existing metadata decorator
-----------------------------------

.. code-block:: python

   from genro_toolbox import metadata
   from gramlot.page import WebPage

   @metadata(title="Hello", example_level="beginner")
   class Page(WebPage):
       """Display a greeting and demonstrate the page convention."""

       def main(self, root):
           root.h1("Hello World")

Genro Toolbox's ``metadata`` supports classes and functions. It assigns keyword
arguments as attributes with ``setattr`` and returns the same object. It does
not register the class and does not create an isolated metadata dictionary.
Writing ``@metadata(title='Hello')`` has the same attribute effect as writing
``title = 'Hello'`` in the class body.

Reserved metadata interpreted by this adapter
---------------------------------------------

.. list-table:: Current reserved metadata
   :header-rows: 1
   :widths: 15 15 45 25

   * - Name
     - Type
     - Meaning
     - Default
   * - ``title``
     - ``str``
     - Text of the link in the generated page index
     - Filename stem

A non-string title is rejected at startup. An empty string is accepted and
produces an empty link label; authors should supply a meaningful label.
``title`` does not change the URL, create a heading, or set the browser tab title.
The application-level HTML title belongs to the adapter configuration.

Other metadata
--------------

Custom attributes are allowed, but have no automatic effect. For example,
``order`` and ``category`` are not interpreted: the current index remains flat
and sorted by filename. A future reader may interpret them only after its
contract is documented.

Because the decorator writes real attributes, do not overwrite page behavior
such as ``main`` or ``__init__``. ``source_builder`` is an existing framework
extension point, not descriptive metadata. Other existing WebPage attributes
include ``client_builder``, ``client_setup`` and ``source_inspection``; they
must not be repurposed as arbitrary metadata, and are not interpreted as metadata by the FastAPI integration.

The decorator's keyword ``prefix`` controls attribute names. For example,
``@metadata(prefix='example', level='beginner')`` creates ``example_level``.
It is unrelated to the adapter's URL prefix. A prefixed title becomes
``example_title`` and is not used as the index title.

Docstrings
----------

Use the class docstring to explain what the page demonstrates or does. It is
ordinary Python documentation accessible through ``Page.__doc__`` and tools
such as ``inspect.getdoc``. The current adapter neither adds it to the index
nor renders it inside the page. Rendering descriptions is a possible later
feature, not an effect of adding a docstring today.

Discovery rules
---------------

* Discover direct ``*.py`` files in ``pages/`` at server startup.
* Ignore files whose names begin with ``_`` and ignore nested directories.
* Use the filename stem as the URL name. Names begin with a lowercase letter
  and then contain lowercase letters, digits, underscores or hyphens.
* ``recipe`` is reserved for the index recipe endpoint; ``_runtime`` is
  reserved for assets and is already excluded by the underscore rule.
* Reject discovered file links that resolve outside the pages directory.
* An empty ``pages/`` is allowed and generates an empty index. A missing
  ``pages/`` is an error.

Page code is trusted application Python. Importing it executes its module body.
This first loader does not define recursive discovery or package-relative
imports between page modules. URL parameters cannot select arbitrary files.
