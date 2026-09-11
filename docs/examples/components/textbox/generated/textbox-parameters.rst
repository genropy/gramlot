.. Generated from its component descriptor (0e89c59d170e0ce6); do not edit.

.. list-table:: Declared and shared parameters
   :header-rows: 1
   :widths: 18 22 60

   * - Name
     - Type / default
     - Meaning
   * - ``placeholder``
     - ``string|null`` / ``null``
     - Hint shown while the field has no text.
   * - ``disabled``
     - ``boolean|string|null`` / ``null``
     - Disable editing; a string also permits the existing ^/= binding syntax.
   * - ``readonly``
     - ``boolean|string|null`` / ``null``
     - Make the inner input read-only; a string also permits ^/= binding.
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
