Field validation
================

Validation is configured on a field's existing Source node. You can declare
the prefixed attributes inline, or call ``validate()`` with their prefixes
removed. Both forms reach the same browser validator.

.. code-block:: python

   field = pane.textBox(value="^.email")
   field.validate(
       notnull=True,
       email=True,
       email_warning="Check address",
   )

This is equivalent to:

.. code-block:: python

   pane.textBox(
       value="^.email",
       validate_notnull=True,
       validate_email=True,
       validate_email_warning="Check address",
   )

The method returns the field, so it can follow a declaration directly. It does
not add a validation child node or create a separate validation object.

Reuse ordinary dictionaries and objects
---------------------------------------

Keep keys unprefixed for ``validate()``. Expand the dictionary with ``**`` in
Python; pass the object directly in JavaScript. Several fields can share the
same rules without a custom class or an extra copy:

.. code-block:: python

   email_validation = {
       "notnull": True,
       "email": True,
       "email_warning": "Check address",
   }

   pane.textBox(value="^.primaryEmail").validate(**email_validation)
   pane.textBox(value="^.backupEmail").validate(**email_validation)

.. code-block:: javascript

   const emailValidation = {
       notnull: true,
       email: true,
       email_warning: 'Check address',
   };

   pane.textBox({value: '^.primaryEmail'}).validate(emailValidation);
   pane.textBox({value: '^.backupEmail'}).validate(emailValidation);

For direct widget arguments, use a dictionary or object whose keys already
start with ``validate_``:

.. code-block:: python

   required_code = {
       "validate_notnull": True,
       "validate_len": "3:8",
   }
   pane.textBox(value="^.code", **required_code)

.. code-block:: javascript

   const requiredCode = {validate_notnull: true, validate_len: '3:8'};
   pane.textBox({value: '^.code', ...requiredCode});

Calls do not modify the supplied dictionary or object. An inline value can be
replaced by a later ``validate()`` call, and repeated calls replace only the
rules they name. A later direct attribute assignment wins in the same way.
``None`` in Python or ``null`` in JavaScript removes that validation attribute,
matching normal Source attribute assignment.

Rules, messages and callbacks
-----------------------------

The local validator currently recognizes ``select``, ``notnull``, ``empty``,
``case``, ``len``, ``min``, ``max``, ``email``, ``regex``, ``call``,
``gridnodup``, ``nodup``, ``exist`` and ``remote``. Rules that require a grid,
database or remote adapter report a configuration error when that adapter is
not available.

Rule options keep the established suffixes. For example,
``email_if`` controls whether the email rule runs; ``email_warning`` and
``email_error`` supply messages; and ``email_iswarning`` selects severity.
The global option names are ``depends``, ``onAccept``, ``onReject`` and
``timeout``. Their spelling and callback behavior are unchanged by
``validate()``.

Values beginning with ``^`` or ``=`` retain their normal reactive or passive
binding meaning. Empty strings, zero, false and null keep the same treatment as
the equivalent inline ``validate_*`` attributes. Validation outside a form and
validation on fields inside a :doc:`formlet <formlet>` use the same field service; a
form adds dirty, valid, pending and persistence state rather than a different
rule syntax.
