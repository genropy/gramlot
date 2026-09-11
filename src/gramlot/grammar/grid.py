# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Shorthand authoring for the shared static grid structure."""
from genro_bag import Bag


class GridAuthoring:
    def quickGrid(self, value=None, **attrs):
        """Declare the ordinary grid; column() builds a Data structure Bag."""
        if 'store' in attrs:
            raise TypeError('quickGrid uses value; use grid for an explicit store')
        return self._declaration('grid', store=value, **attrs)

    def column(self, field, **attrs):
        """Append a null-valued cell with attributes to a Data structure Bag."""
        if getattr(self.node, 'node_tag', None) != 'grid':
            raise TypeError('column() belongs to a grid declaration')
        if not isinstance(field, str) or not field:
            raise TypeError('column() requires a nonempty field')
        if '_grid_structure' not in self.__dict__:
            if self.node.get_attr('structpath') or self.node.get_attr('columns'):
                raise TypeError('column() cannot extend an external structure')
            serial = getattr(self.builder, '_grid_struct_serial', 0) + 1
            self.builder._grid_struct_serial = serial
            path = f'__grid_structures.grid_{serial}'
            self._grid_structure = Bag()
            self._grid_structure.set_item('view_0.rows_0', Bag())
            self.builder.root.data(path, self._grid_structure)
            self.node.set_attr({'structpath': path})
        cells = self._grid_structure.get_item('view_0.rows_0')
        cells.set_item(f'cell_{len(cells)}', None, **dict(attrs, field=field))
        return self
