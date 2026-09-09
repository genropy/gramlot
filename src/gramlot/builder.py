# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Gramlot authoring dialect on the public HTML builder."""
from genro_builders.builder import SourceBag, SourceBagNode, element
from genro_bag import Bag
from genro_builders.contrib.html.html_builder import HtmlBuilder


class GramlotBuilder(HtmlBuilder):
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


    @element(sub_tags="*")
    def form(self, **kwargs): ...

    @element(sub_tags="*")
    def labledBox(self, **kwargs): ...

    @element(sub_tags="")
    def copyButton(self, **kwargs): ...

    @element(sub_tags="*")
    def palette(self, **kwargs): ...

    @element(sub_tags="")
    def codeMirror(self, **kwargs): ...

    @element(sub_tags="summary,div")
    def details(self, **kwargs): ...

    @element(sub_tags="*")
    def div(self, **kwargs): ...

    @element(sub_tags="")
    def textBox(self, **kwargs): ...

    @element(sub_tags="")
    def filteringSelect(self, **kwargs): ...

    @element(sub_tags="")
    def comboBox(self, **kwargs): ...

    @element(sub_tags="")
    def passwordbox(self, **kwargs): ...

    @element(sub_tags="")
    def numberTextBox(self, **kwargs): ...

    @element(sub_tags="")
    def dateTextBox(self, **kwargs): ...

    @element(sub_tags="")
    def timeTextBox(self, **kwargs): ...

    @element(sub_tags="")
    def horizontalSlider(self, **kwargs): ...

    @element(sub_tags="")
    def verticalSlider(self, **kwargs): ...

    @element(sub_tags="")
    def checkbox(self, **kwargs): ...

    @element(sub_tags="*")
    def formlet(self, **kwargs): ...

    @element(sub_tags="*")
    def panel(self, **kwargs): ...

    @element(sub_tags="*")
    def box(self, **kwargs): ...

    @element(sub_tags="*")
    def borderContainer(self, **kwargs): ...

    @element(sub_tags="*")
    def tabContainer(self, **kwargs): ...

    @element(sub_tags="*")
    def stackContainer(self, **kwargs): ...

    @element(sub_tags="*")
    def contentPane(self, **kwargs): ...

    @element(sub_tags="")
    def stackButtons(self, **kwargs): ...

    @element(sub_tags="*")
    def tab(self, **kwargs): ...

    @element(sub_tags="")
    def colorpicker(self, **kwargs): ...

    @element(sub_tags="")
    def storeTree(self, **kwargs): ...


class AuthoringNode:
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

    def data(self, destination, value, **attrs):
        if not isinstance(destination, str) or not destination:
            raise TypeError('data destination must be a nonempty string')
        return self._declaration('dataSetter', destination=destination, value=value, **attrs)

    def dataFormula(self, destination, formula, **attrs):
        if 'func' in attrs:
            raise TypeError('dataFormula uses formula; func is not supported')
        if not isinstance(destination, str) or not destination:
            raise TypeError('dataFormula destination must be a nonempty string')
        if not isinstance(formula, str) or not formula:
            raise TypeError('dataFormula requires browser code as a nonempty string')
        return self._declaration('dataFormula', destination=destination, formula=formula, **attrs)

    def dataController(self, func, **attrs):
        if not isinstance(func, str) or not func:
            raise TypeError('dataController requires browser code as a nonempty string')
        return self._declaration('dataController', func=func, **attrs)

    def __getattr__(self, name):
        member = getattr(self.node, name)
        if not callable(member):
            return member
        def call(*args, **kwargs):
            result = member(*args, **kwargs)
            return self.builder._wrap(result)
        return call
