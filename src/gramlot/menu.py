# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Static menu recipes; dynamic resolution is a future layer."""
from genro_builders.builder import BuilderBase, element


class MenuElements:
    """Legacy menu words preserving label and filepath."""

    @element(sub_tags="branch,webpage")
    def branch(self, label=None):
        """Group menu entries."""
        ...

    @element(sub_tags="")
    def webpage(self, label=None, filepath=None):
        """Reference a registered page through filepath."""
        ...


class MenuBuilder(BuilderBase, MenuElements):
    """Build menu source independently of its visible widget."""

    _name = "menu"
