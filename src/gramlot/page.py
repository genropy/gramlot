# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Python page recipes, independent of their ASGI host."""


from .builder import GramlotBuilder


class WebPage:
    """Subclass with ordinary Python inheritance."""

    source_builder = GramlotBuilder
    client_builder = ("gramlot-dom", "HtmlBuilder")
    client_setup: tuple[str, str] | None = None
    source_inspection = True

    def main(self, root):
        """Populate the source tree."""
        raise NotImplementedError
