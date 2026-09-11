# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Legacy-style structure authoring; transport snapshots contain ordinary Bags."""
from genro_bag import Bag


class GridStruct(Bag):
    """Declare view/rows/cell nodes with column definitions in attributes."""

    def _branch(self, tag, attrs):
        child = GridStruct()
        index = 0
        while self.get_node(f'{tag}_{index}') is not None:
            index += 1
        self.set_item(f'{tag}_{index}', child, tag=tag, **attrs)
        return child

    def view(self, **attrs):
        return self._branch('view', attrs)

    def rows(self, **attrs):
        return self._branch('rows', attrs)

    def cell(self, field=None, name=None, width=None, dtype=None, **attrs):
        index = 0
        while self.get_node(f'cell_{index}') is not None:
            index += 1
        definition = dict(attrs, tag='cell', field=field, name=name or field,
                          width=width, dtype=dtype)
        definition = {key: value for key, value in definition.items() if value is not None}
        self.set_item(f'cell_{index}', '', **definition)
        return self.get_node(f'cell_{index}')
