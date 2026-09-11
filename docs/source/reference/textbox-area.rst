``textBoxArea``
===============

``textBoxArea`` is Gramlot's dedicated multiline input. It renders as
``gnr-textboxarea`` with a native ``textarea`` inside its shadow root. The
native HTML ``textarea`` recipe remains available separately and is not
replaced.

.. code-block:: python

   pane.textBoxArea(
       value="^.notes",
       lbl="Notes",
       rows=5,
       cols=48,
       placeholder="Write more than one line",
       maxlength=240,
       minlength=3,
       wrap="soft",
       autocomplete="off",
       remainingHint="25%",
   )

The component-specific native parameters in the generated table are forwarded
to the inner native control. Shared locking behavior matches ``textBox``. The
widget preserves newlines in ``value`` and uses the existing ``^``/``=``
binding syntax. By default it commits on focus-out; ``updateOn="input"``
selects live write-back.

The parameter table below is generated from the same example descriptor that
generates the explicit Python declaration and JavaScript association proof:

.. include:: ../../examples/components/textbox/generated/textbox-area-parameters.rst

``remainingHint`` adds a small remaining-character indicator beneath the
textarea when ``maxlength`` is present and the threshold is reached. Use a
nonnegative integer such as ``remainingHint=120`` for an absolute threshold, or
a percentage string such as ``remainingHint="10%"`` for a threshold relative
to ``maxlength``. Equality shows the hint; ``"100%"`` therefore shows it for
every within-limit value. Malformed, negative and greater-than-100 percentage
values are rejected. Omit the option to keep the hint hidden.

The count updates immediately from the native editor draft even when data
write-back waits for focus-out. It follows the browser's UTF-16 code-unit
convention. An over-limit externally supplied value reports the amount over the
limit. With no ``maxlength`` the indicator stays hidden. It is associated
through ``aria-describedby`` without announcing every keystroke as a live
region.

The field supports :doc:`shared validation <validation>` and form ownership,
including ``blankIsNull`` and ``validate_*`` attributes. It also inherits formlet
defaults and the shared label/box attributes described in :doc:`labled-box`.
