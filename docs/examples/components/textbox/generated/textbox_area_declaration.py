# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Generated from its *.component.json + shared-attribute-sets.json (55324819396e36b7).

Regenerate with ``python docs/examples/components/textbox/generate.py``.
"""

from __future__ import annotations

from typing import Any

from genro_builders.builder import element
from genro_builders import BuilderBase


class GuideTextBoxAreaDeclarations:
    """Generated declaration mixin for the isolated guide recipe."""

    @element(
        sub_tags='',
        _meta={
            "webcomponent": True,
            "render_tag": 'gnr-textboxarea',
        },
    )
    def guideTextBoxArea(
        self,
        rows: int | str | None = None,
        cols: int | str | None = None,
        placeholder: str | None = None,
        maxlength: int | str | None = None,
        minlength: int | str | None = None,
        readonly: bool | str | None = None,
        disabled: bool | str | None = None,
        wrap: str | None = None,
        autocomplete: str | None = None,
        remainingHint: int | str | None = None,
        value: Any = None,
        dtype: str | None = None,
        default: Any = None,
        default_value: Any = None,
        blankIsNull: bool | str | None = None,
        updateOn: str | None = None,
        lbl: str | None = None,
        lbl_position: str | None = None,
        **kwargs: Any,
    ):
        """An isolated textBoxArea contract linked to Gramlot's production gnr-textboxarea implementation.

        Explicit parameters come from the component descriptor and its
        referenced shared attribute sets. ``**kwargs`` preserves the open
        Gramlot attribute families documented by those sets.
        """
        ...


class GuideTextBoxAreaBuilder(GuideTextBoxAreaDeclarations, BuilderBase):
    """Builders composition used only by the worked guide example."""

    _name = "gramlot_guidetextboxarea_guide"
