# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Generated from its *.component.json + shared-attribute-sets.json (0e89c59d170e0ce6).

Regenerate with ``python docs/examples/components/textbox/generate.py``.
"""

from __future__ import annotations

from typing import Any

from genro_builders.builder import element
from genro_builders import BuilderBase


class GuideTextBoxDeclarations:
    """Generated declaration mixin for the isolated guide recipe."""

    @element(
        sub_tags='',
        _meta={
            "webcomponent": True,
            "render_tag": 'gnr-textbox',
        },
    )
    def guideTextBox(
        self,
        placeholder: str | None = None,
        disabled: bool | str | None = None,
        readonly: bool | str | None = None,
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
        """An isolated textBox contract example linked to Gramlot's existing gnr-textbox implementation.

        Explicit parameters come from the component descriptor and its
        referenced shared attribute sets. ``**kwargs`` preserves the open
        Gramlot attribute families documented by those sets.
        """
        ...


class GuideTextBoxBuilder(GuideTextBoxDeclarations, BuilderBase):
    """Builders composition used only by the worked guide example."""

    _name = "gramlot_guidetextbox_guide"
