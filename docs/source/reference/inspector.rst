Inspector
=========

Pages rendered by ``GramlotBuilder`` provide an inspector by default. Click the
small inspector icon or press **Ctrl+Shift+D**, including while editing a field.
The component, recipe and property editors are created only on first opening.
Closing the palette retains its selection; disposing the application removes
its launcher, shortcut, component and Bag subscriptions.

Data and Source are the application's actual Bags. Changes affect the running
instance; they never rewrite the Python or JavaScript recipe files.

Disabling inspection
--------------------

A Python page served by the FastAPI integration can explicitly disable it:

.. code-block:: python

   class Page(WebPage):
       source_inspection = False

       def main(self, root):
           root.h1("Hello")

JavaScript hosts pass an application option:

.. code-block:: javascript

   const app = new Application(host, builder, {inspector: false});

The option also works when constructing the application first and calling
``mountBuilder(builder)`` later. Other hosts of Python recipes must forward the
page's ``source_inspection`` setting. Plain DOM ``HtmlBuilder`` applications do
not install the inspector. The inspector's internal application always opts out.
Disabling the UI is not a security boundary: browser data remains browser data.

Host integration
----------------

``app.inspector`` is a lightweight controller available after mounting a
``GramlotBuilder``. Its ``open()`` and ``toggle()`` methods return promises;
``close()`` is synchronous. ``opened`` reports visibility and ``element`` is
``null`` until first creation. The element is ``<gramlot-inspector>`` and its
``application`` property refers to the inspected application.

The bubbling, composed ``gramlot-inspector-change`` event carries
``event.detail.opened`` and is emitted only when visibility changes, including
closing with the palette's close button. The element is appended inside the
application host, so the host can listen to this event directly. Embedding sites
can forward it to their parent window to resize an iframe. Cross-frame messaging
and origin checks remain the embedding site's responsibility.

Shortcut and launcher failures dispatch ``gramlot-inspector-error`` with
``event.detail.error``. Direct calls to ``open()`` or ``toggle()`` reject on
failure, and subsequent calls may retry. Serve the packaged browser resources,
including ``pages/inspector.tytx``, alongside the JavaScript modules.

Theme
-----

The inspector inherits the page's CSS ``color-scheme``. Set ``color-scheme: dark``
on a dark page and ``color-scheme: light`` on a light page. Changes are applied
through CSS without rebuilding the inspector. ``data-theme="dark"`` and
``data-theme="light"`` ancestors are also recognized in browsers supporting
``:host-context``; explicit ``color-scheme`` is the portable choice.

Applications can override the inherited ``--gramlot-inspector-bg``,
``--gramlot-inspector-surface``, ``--gramlot-inspector-selected``,
``--gramlot-inspector-line``, ``--gramlot-inspector-text``,
``--gramlot-inspector-muted`` and ``--gramlot-inspector-accent`` CSS properties.
These reach the palette, tabs, tree and typed property editor through their
normal CSS variable contracts, including shadow DOM boundaries.

Embedded presentation
---------------------

An application can display the same Data/Source inspector as an integrated
panel instead of a floating palette:

.. code-block:: javascript

   const app = new Application(host, builder, {
       inspector: {presentation: 'embedded'}
   });

An embedding host can also set ``app.inspector.presentation = 'embedded'``
before the first opening. The default is ``'floating'``. Changing presentation
after loading starts raises an error.

The embedded component contains the same tabs, tree, splitter and property
editors, without a palette. It has ``presentation="embedded"``, fills its
allocated height, and its ``hidden`` state follows ``opened``. The embedding
application owns its sidebar position, available space and responsive layout.
Visibility events and lifecycle methods are identical in both presentations.
Both packaged recipes are generated from the same Python inspector definition.

Typed property editing
----------------------

The property grid selects an editor automatically instead of showing a type
selector on each row. The primary ``*value`` row first uses supported
``node.attr.dtype`` metadata, then the actual value type. Attribute rows infer
only their own values; the node's dtype never determines an attribute's editor.

Supported dtype codes are ``T``/``A`` (text), ``L``/``I`` (safe integer),
``N``/``R`` (finite number), ``B`` (boolean), ``D`` (date), ``H`` (time), and
``DH``/``DHZ`` (datetime). Text, numeric, checkbox, date and time cells use native
controls, consistent with the input types used by Gramlot's input components.
Date/time objects retain the TYTX Date representation. Datetime editing displays
UTC components and preserves the instant in UTC; TYTX's canonical datetime tag
is DHZ. Unsupported complex values, including arbitrary decimal objects, remain
read-only rather than being converted to numbers.

Changes commit when focus leaves the row. Invalid conversions do not partially
update the node; errors remain visible. Empty text and null are different:
leaving an unchanged null cell preserves null, while Backspace on an empty cell
sets null. Boolean null is shown as an indeterminate checkbox; Backspace also
sets a checkbox to null. Typing or checking a value leaves null state. The editor
remembers the known type for a selected node's nullable property during its
lifetime, and declared dtype continues to determine nullable primary editors.

Only a newly added attribute offers a type choice. That choice disappears after
a successful focus-out commit. Existing values do not expose a type dropdown.
