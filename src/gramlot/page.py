# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Stateless Python pages and their explicitly exposed service methods."""

from __future__ import annotations

from dataclasses import dataclass
from inspect import isfunction
from typing import Any, Callable, Literal

from .builder import GramlotBuilder


PageMethodRole = Literal["data", "source"]


def _page_method(role: PageMethodRole):
    def decorate(function: Callable) -> Callable:
        if not isfunction(function):
            raise TypeError(f"@{role} can decorate only an instance method")
        previous = getattr(function, "__gramlot_page_role__", None)
        if previous is not None:
            raise TypeError(f"{function.__name__} already has the {previous!r} page role")
        function.__gramlot_page_role__ = role
        return function
    return decorate


endpoint = _page_method("data")
source = _page_method("source")


@dataclass(frozen=True, slots=True)
class InvocationContext:
    """Framework-owned context supplied to an explicitly annotated parameter."""

    page_name: str
    method_name: str
    role: PageMethodRole
    store: Any = None
    request: Any = None


@dataclass(frozen=True, slots=True)
class PageMethod:
    """One effective, allowlisted method selected by ordinary Python MRO."""

    name: str
    role: PageMethodRole
    function: Callable
    origin: type


def page_methods(page_class: type["WebPage"]) -> dict[str, PageMethod]:
    """Discover the effective marked methods, including plain library mixins.

    The first definition of a name in the MRO is final for exposure. Therefore an
    undecorated override hides an inherited marker and a redecorated override may
    deliberately select a new role. ``main`` is the sole implicit exception.
    """
    if not isinstance(page_class, type) or not issubclass(page_class, WebPage):
        raise TypeError("page_methods expects a WebPage class")
    discovered: dict[str, PageMethod] = {}
    shadowed: set[str] = set()
    for owner in page_class.__mro__:
        for name, value in vars(owner).items():
            if name in shadowed:
                continue
            shadowed.add(name)
            declared_role = getattr(value, "__gramlot_page_role__", None)
            if name == "main" and declared_role not in (None, "source"):
                raise TypeError("main has the implicit Source role and cannot be an endpoint")
            role = "source" if name == "main" else declared_role
            if role is None:
                continue
            if role not in ("data", "source") or not isfunction(value):
                raise TypeError(f"Exposed page method {name} must be an instance method")
            discovered[name] = PageMethod(name, role, value, owner)
    return discovered


class WebPage:
    """Subclass with ordinary Python inheritance."""

    source_builder = GramlotBuilder
    client_builder = ("gramlot-dom", "HtmlBuilder")
    client_setup: tuple[str, str] | None = None
    source_inspection = True
    example_view = False

    def main(self, root):
        """Populate the source tree."""
        raise NotImplementedError


__all__ = [
    "InvocationContext", "PageMethod", "WebPage", "endpoint", "page_methods", "source",
]
