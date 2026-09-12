# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Plain declaration mixins assembled by :class:`GramlotBuilder`."""

from .decoration import DecorationDeclarations
from .forms import FormDeclarations
from .inputs import InputDeclarations
from .layout import LayoutDeclarations
from .logic import LogicDeclarations, LogicElementDeclarations
from .native_html import NativeHtmlDeclarations
from .widgets import AdjacentWidgetDeclarations

__all__ = [
    "AdjacentWidgetDeclarations",
    "DecorationDeclarations",
    "FormDeclarations",
    "InputDeclarations",
    "LayoutDeclarations",
    "LogicDeclarations",
    "LogicElementDeclarations",
    "NativeHtmlDeclarations",
]
