# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Python page recipes, independent of their ASGI host."""


class WebPage:
    """Subclass with ordinary Python inheritance."""

    client_builder = ("gramlot-dom", "HtmlBuilder")
    client_setup: tuple[str, str] | None = None
    source_inspection = True

    def main(self, root):
        """Populate the source tree."""
        raise NotImplementedError
