# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Intentional extensions of inherited native HTML declarations."""

from genro_builders.builder import element


class NativeHtmlDeclarations:
    """Admit Gramlot children while retaining the existing override contracts."""

    @element(sub_tags="summary,div")
    def details(self, **kwargs): ...

    @element(sub_tags="*")
    def div(self, **kwargs): ...
