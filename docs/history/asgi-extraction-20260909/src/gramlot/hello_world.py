# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Compatibility entry point for the original one-page demo."""
from .application import WebpageApplication
from .pages.hello_world import HelloWorldPage as HelloRecipe


class HelloWorldPage(WebpageApplication):
    """Serve the original recipe through the application interface."""

    def main(self, root):
        HelloRecipe().main(root)
