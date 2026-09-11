Local data logic
================

Gramlot recipes can install values and browser logic alongside widgets. These
declarations are transparent: they create no DOM element.

``dataSetter(destination, value, **attributes)`` assigns the value when its
Source branch is installed. Assignment is explicit, including ``None`` in
Python and ``null`` in JavaScript. Widget defaults run afterwards and only fill
a missing Data node, so they never replace null, false, zero or an empty string.
The shorter Python spelling ``data(...)`` remains available for compatibility.

``dataFormula(destination, formula, **inputs)`` evaluates a JavaScript
expression and writes its result. ``dataController(func, **inputs)`` executes
a JavaScript script for side effects. Inputs beginning with ``^`` are reactive;
inputs beginning with ``=`` are read when execution occurs without subscribing.
Startup remains opt-in through ``_on_start=True``. Dependencies are installed
even without startup, so a later reactive change can run the declaration.

Python authoring is positional and concise::

   pane.dataSetter('.quantity', 2)
   pane.dataSetter('.price', 5)
   pane.dataFormula('.total', 'quantity * price',
                    quantity='^.quantity', price='=.price', _on_start=True)
   pane.dataController('sourceNode.SET(".status", `total: ${total}`)',
                       total='^.total')

JavaScript uses an options object::

   pane.dataFormula({
       destination: '.total', formula: 'quantity * price',
       quantity: '^.quantity', price: '=.price', _on_start: true,
   });

Existing JavaScript callable values, resolvable named functions and complete
function strings remain supported. An unresolved bare identifier is an
expression, which permits formulas such as ``formula: 'price'`` without
mistaking them for a missing function name.

Inline expressions
------------------

An attribute or element value beginning with ``==`` is computed from its named
peer attributes. It does not write a separate Data destination::

   pane.span('==quantity * price',
             quantity='^.quantity', price='=.price')

Changing ``quantity`` refreshes the span and reads the current passive
``price``. Inline expressions may reference other inline attributes on the same
node. Cycles and evaluation failures stop with an error naming the affected
attribute.

Installation order and lifetime
-------------------------------

For each available branch Gramlot runs all setters, then missing-only defaults,
then formulas and controllers explicitly marked for startup, and only then
builds widgets. Normal rendering does not replay setters. A newly inserted
branch follows the same preparation path; unavailable lazy branches are not
forced. Removing a logical declaration removes its reactive subscriptions.

Startup formulas are ordered by their declared Data dependencies. A startup
cycle fails before widget construction. Reactive cycles use the runtime's
bounded cascade diagnostic.
