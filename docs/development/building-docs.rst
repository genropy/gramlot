Building and extending this manual
==================================

The HTML manual uses the Furo theme and the existing logo in
``assets/gramlot-logo.png``. Theme colors are configured in ``conf.py``.

The user documentation lives in ``docs/source/``. It uses Sphinx and
reStructuredText. Runnable introductory recipes live in ``docs/examples/``
and are included directly in the tutorial, so the displayed sources and files
used for verification are the same.

From the repository root:

.. code-block:: console

   python -m pip install -r docs/requirements.txt
   python -m sphinx -W --keep-going -b html docs/source docs/_build/html
   gramlot manual --directory docs/_build/html --port 8037

``-W`` treats warnings as build failures. The build reads the version from
pyproject.toml and does not import Gramlot, FastAPI or application pages. Sphinx
is a documentation dependency, not a runtime requirement. Once dependencies
are installed, HTML generation requires no remote theme or script downloads.

Use the tutorial for a sequential learning path, the general guide for concepts
and the reference for reserved names and exact behavior. Add a page to the
index toctree when expanding the manual. Describe proposals as proposals and
do not document metadata as supported until a consumer actually interprets it.

A page docstring is documentation for that page's author and readers. It is not
a promise that the runtime displays it. Do not duplicate genro_toolbox.metadata
inside Gramlot: its actual attribute-setting semantics are documented in
`the page reference <../source/reference/pages.rst>`_.

Only ``docs/source/`` is published as the user manual. The
``docs/fastapi.md`` entry links here instead of maintaining a second guide.

See the `Sphinx getting-started guide
<https://www.sphinx-doc.org/en/master/usage/quickstart.html>`_ for the underlying
documentation structure and build tools.

Inspector browser assets
------------------------

The asset preparation command now compiles the Python inspector recipe into
``pages/inspector.tytx``. Run it with a Python environment containing the core
project dependencies, for example ``.venv/bin/python scripts/prepare_assets.py``.
The package manifest checks the Python recipe, builder and transport inputs as
well as browser sources, so a changed recipe requires asset regeneration.
