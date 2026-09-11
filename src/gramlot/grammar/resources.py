# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Source-owned CSS resource declarations."""
from genro_builders.builder import element


class ResourceDeclarations:
    @element(sub_tags="", _meta={"render_tag": "style"})
    def css(self, **kwargs): ...

    @element(sub_tags="", _meta={"render_tag": "style"})
    def styleSheet(self, **kwargs): ...


class ResourceAuthoring:
    def css(self, rule, styleRule='', **attrs):
        """Declare a complete CSS rule or a selector and declaration text."""
        return self._declaration('css', rule=rule, styleRule=styleRule, **attrs)

    def styleSheet(self, cssText=None, cssTitle=None, href=None, **attrs):
        """Declare inline CSS or an external stylesheet owned by this Source node."""
        return self._declaration('styleSheet', cssText=cssText, cssTitle=cssTitle,
                                 href=href, **attrs)
