# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Authoring declarations for browser-owned local data logic."""


class LogicDeclarations:
    """Mixin for the :class:`gramlot.builder.AuthoringNode` facade."""

    def dataSetter(self, destination, value, **attrs):
        """Assign ``value`` to a Data destination when this branch is installed."""
        if not isinstance(destination, str) or not destination:
            raise TypeError('dataSetter destination must be a nonempty string')
        declaration = self._declaration('dataSetter', destination=destination, **attrs)
        # Generic Bag authoring removes null attributes by default. A setter's
        # explicit None is data, so retain it deliberately on the Source node.
        declaration.node.set_attr({'value': value}, _remove_null_attributes=False)
        return declaration

    def data(self, destination, value, **attrs):
        """Compatibility spelling for :meth:`dataSetter`."""
        return self.dataSetter(destination, value, **attrs)

    def dataFormula(self, destination, formula, **attrs):
        """Declare a JavaScript expression which writes ``destination``."""
        if 'func' in attrs:
            raise TypeError('dataFormula uses formula; func is not supported')
        if not isinstance(destination, str) or not destination:
            raise TypeError('dataFormula destination must be a nonempty string')
        if not isinstance(formula, str) or not formula:
            raise TypeError('dataFormula requires a nonempty JavaScript expression')
        return self._declaration('dataFormula', destination=destination, formula=formula, **attrs)

    def dataController(self, func, **attrs):
        """Declare a JavaScript side-effect script (stored as ``func`` on Source)."""
        if not isinstance(func, str) or not func:
            raise TypeError('dataController requires a nonempty JavaScript script')
        return self._declaration('dataController', func=func, **attrs)
