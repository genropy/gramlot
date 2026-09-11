``formlet`` layout
==================

``formlet`` arranges fields and supplies shared presentation defaults. It does
not own data validity, dirty state or persistence, and it can be used without a
``form``.

.. code-block:: python

   fields = pane.formlet(
       columns=2,
       gap="12px",
       lbl_position="L",
       lbl_color="#344563",
       box_padding="4px",
   )
   fields.textBox(value="^.name", lbl="Name")
   fields.numberTextBox(value="^.seats", lbl="Seats", lbl_position="R")

``columns`` accepts a positive integer or a CSS grid track list.
``col_min_width`` enables an auto-fitting responsive grid. ``gap`` remains a
normal style attribute. Wrapping mode is not implemented.

Common ``lbl_*`` and ``box_*`` values are inherited by fields. A child that
declares its own value takes precedence. The same rule applies when the formlet
is inside a form; the form adds state and persistence without changing layout
ownership. See :doc:`labled-box` for label and box destinations and positions.
