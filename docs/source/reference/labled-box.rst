Labels and ``labledBox``
========================

Gramlot keeps field, label and box presentation separate. The historical public
spelling is ``labledBox``.

Decorating a widget
-------------------

Use ``lbl`` for the caption, ``lbl_*`` for caption attributes, ``box_*`` for
the outer decorated box, ``box_l_*`` for the caption region and ``box_c_*``
for the content region:

.. code-block:: python

   pane.textBox(
       value="^.name",
       lbl="Name",
       lbl_position="L",
       lbl_color="#344563",
       box_padding="4px",
   )

``lbl_position`` accepts ``L``, ``R``, ``TL``, ``TC``, ``TR``, ``BL``, ``BC``
and ``BR``. If omitted, it uses ``TL``. The older label-placement ``lbl_side``
and ``side`` spellings are not aliases.

Explicit composition
--------------------

Use an explicit container when one caption describes a deliberate composition
or group. Its caption family is ``label`` and ``label_*``; its placement name is
``label_position``.

.. code-block:: python

   box = pane.labledBox(label="Name", label_position="R", padding="6px")
   box.textBox(value="^.name")

Both forms use the same runtime decoration mechanism. An explicit container can
also receive ``box_l_*`` and ``box_c_*`` attributes. Ordinary widget attributes
remain on the widget. Reactive label and layout values update without replacing
the control or discarding its focused draft.

Inheritance
-----------

A :doc:`formlet` can provide common ``lbl_*`` and ``box_*`` values. At an
explicit ``labledBox`` boundary, inherited ``lbl_position`` becomes
``label_position``. A child value wins, including an empty value or a retained
null attribute. Plain HTML elements do not automatically acquire this
decoration behavior.
