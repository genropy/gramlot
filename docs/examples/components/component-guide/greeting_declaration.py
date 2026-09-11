# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Small Python declaration for the component guide."""

from typing import Any

from genro_builders.builder import element


class GreetingDeclarations:
    @element(
        sub_tags="",
        _meta={"webcomponent": True, "render_tag": "gnr-guidegreeting"},
    )
    def greeting(self, name: str | None = None, **kwargs: Any):
        """Display a greeting for ``name``."""
        ...
