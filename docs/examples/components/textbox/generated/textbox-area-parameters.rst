.. Generated from its component descriptor (55324819396e36b7); do not edit.

.. list-table:: Declared and shared parameters
   :header-rows: 1
   :widths: 18 22 60

   * - Name
     - Type / default
     - Meaning
   * - ``rows``
     - ``integer|string|null`` / ``null``
     - Native textarea row hint; a string also permits ^/= binding.
   * - ``cols``
     - ``integer|string|null`` / ``null``
     - Native textarea column hint; a string also permits ^/= binding.
   * - ``placeholder``
     - ``string|null`` / ``null``
     - Hint shown while the native textarea has no text.
   * - ``maxlength``
     - ``integer|string|null`` / ``null``
     - Native maximum length in UTF-16 code units; a string also permits ^/= binding.
   * - ``minlength``
     - ``integer|string|null`` / ``null``
     - Native minimum length; a string also permits ^/= binding.
   * - ``readonly``
     - ``boolean|string|null`` / ``null``
     - Make the native editor read-only; a string also permits ^/= binding.
   * - ``disabled``
     - ``boolean|string|null`` / ``null``
     - Disable editing; a string also permits ^/= binding.
   * - ``wrap``
     - ``string|null`` / ``null``
     - Native textarea wrap policy.
   * - ``autocomplete``
     - ``string|null`` / ``null``
     - Native textarea autocomplete hint.
   * - ``remainingHint``
     - ``integer|string|null`` / ``null``
     - Absolute integer or 0..100 percentage threshold for the optional live remaining count; requires maxlength.
   * - ``value``
     - ``any`` / ``null``
     - Literal value or an existing ^/= data path expression.
   * - ``dtype``
     - ``string|null`` / ``null``
     - Optional dtype metadata; the component contract does not restrict its vocabulary.
   * - ``default``
     - ``any`` / ``null``
     - Existing default policy value, preserved without narrowing its type.
   * - ``default_value``
     - ``any`` / ``null``
     - Existing explicit default value, including false and empty-string values.
   * - ``blankIsNull``
     - ``boolean|string|null`` / ``null``
     - Blank-value policy; a string also permits the existing ^/= binding syntax.
   * - ``updateOn``
     - ``string|null`` / ``null``
     - Existing input/change update policy.
   * - ``lbl``
     - ``string|null`` / ``null``
     - Widget label text or a ^/= data path expression.
   * - ``lbl_position``
     - ``string|null`` / ``null``
     - Label placement: L, R, TL, TC, TR, BL, BC or BR.

Open shared families:

* ``lbl_*``: Additional label presentation attributes.
* ``box_*``: Additional inner-box presentation attributes.
* ``validate_*``: A supported validation rule such as validate_notnull or validate_len.
