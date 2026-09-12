# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Gramlot authoring dialect on the public HTML builder."""
from genro_builders.builder import SourceBag, SourceBagNode
from genro_bag import Bag
from genro_builders.contrib.html.html_builder import HtmlBuilder

from .grammar.resources import ResourceDeclarations, ResourceAuthoring
from .grammar.grid import GridAuthoring
from .grammar.resolvers import ResolverAuthoring

from .grammar import (
    AdjacentWidgetDeclarations,
    DecorationDeclarations,
    FormDeclarations,
    InputDeclarations,
    LayoutDeclarations,
    LogicElementDeclarations,
    LogicDeclarations,
    NativeHtmlDeclarations,
)


class GramlotBuilder(
    ResourceDeclarations,
    FormDeclarations,
    DecorationDeclarations,
    InputDeclarations,
    LayoutDeclarations,
    LogicElementDeclarations,
    AdjacentWidgetDeclarations,
    NativeHtmlDeclarations,
    HtmlBuilder,
):
    def __init__(self, name=None):
        super().__init__(name)
        self._authoring_nodes = {}

    def _wrap(self, value):
        if isinstance(value, (SourceBag, SourceBagNode)):
            key = id(value)
            if key not in self._authoring_nodes:
                self._authoring_nodes[key] = AuthoringNode(value, self)
            return self._authoring_nodes[key]
        if isinstance(value, list):
            return [self._wrap(item) for item in value]
        if isinstance(value, tuple):
            return tuple(self._wrap(item) for item in value)
        if isinstance(value, dict):
            return {key: self._wrap(item) for key, item in value.items()}
        return value

    @property
    def root(self):
        """Authoring surface; source remains the unwrapped Builders tree."""
        return self._wrap(self.source)

    def create(self):
        """Build browser declarations without evaluating them in Python."""
        self.setup(self.data)
        self.main(self.root)

    def compute_logic(self, nodes):
        """Browser runtime owns execution of declarative logic."""


class AuthoringNode(GridAuthoring, ResolverAuthoring, ResourceAuthoring, LogicDeclarations):
    """Recipe facade: names do not replace properties on generic source nodes.

    Pass this surface to helpers to build into an existing parent. ``node`` is
    the underlying node/Bag and ``store`` is the owning document datastore.
    """

    def __init__(self, node, builder):
        self.node = node
        self.builder = builder

    @property
    def store(self):
        return self.builder.data

    def _declaration(self, tag, **attrs):
        target = self.node
        if isinstance(target, SourceBagNode):
            if not isinstance(target.value, Bag):
                target.set_value(self.builder.new_root())
            target = target.value
        return self.builder._wrap(self.builder.set_child(target, tag, **attrs))

    def validate(self, **rules):
        """Attach validation rules to this declaration and return it.

        ``validate(notnull=True)`` is authoring shorthand for setting
        ``validate_notnull=True`` on the same source node.  The browser
        validator therefore receives exactly the attributes used by inline
        declarations; this method does not introduce a validation child node.
        """
        if not isinstance(self.node, SourceBagNode):
            raise TypeError('validate() is available only on declared elements')
        invalid = [name for name in rules if not name or name.startswith('validate_')]
        if invalid:
            names = ', '.join(sorted(name or '(empty key)' for name in invalid))
            raise TypeError(
                f'validate() expects unprefixed rule names; use {names} as direct attributes'
            )
        self.node.set_attr({f'validate_{name}': value for name, value in rules.items()})
        return self

    def __getattr__(self, name):
        member = getattr(self.node, name)
        if not callable(member):
            return member
        def call(*args, **kwargs):
            result = member(*args, **kwargs)
            return self.builder._wrap(result)
        return call
