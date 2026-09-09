# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Behavioral contracts; fill skeletons with real runtime integration checks."""

from pathlib import Path
import base64
import json
import os
import subprocess

from gramlot.application import WebpageApplication
from gramlot.inspector import build_inspector
from gramlot.pages.playground import PlaygroundPage
from gramlot.widget_test_builder import WidgetTestBuilder
from genro_tytx import to_tytx


class TestRuntimeOwnership:
    def _check(self, scenario):
        page = WidgetTestBuilder("main")
        PlaygroundPage().main(page.source)
        inspector = WidgetTestBuilder("main")
        build_inspector(inspector.source)
        folder = Path(__file__).parent
        for transport in ("json", "msgpack"):
            payload = {"transport": transport,
                       "inspectorJson": to_tytx(inspector.source, transport="json")}
            if scenario == "bootstrap":
                application = WebpageApplication(client_modules=os.environ.get("GRAMLOT_CLIENT_MODULES"),
                                                 pages={"arbitrary-lab": PlaygroundPage},
                                                 default_page="arbitrary-lab")
                payload["html"] = application.index(transport=transport)
            for key, source in (("page", page.source), ("inspector", inspector.source)):
                value = to_tytx(source, transport=transport)
                payload[key] = base64.b64encode(value).decode() if transport == "msgpack" else value
            result = subprocess.run(
                ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
                 str(folder / "runtime_consumers.mjs"), scenario],
                input=json.dumps(payload), capture_output=True, text=True, timeout=30,
            )
            assert result.returncode == 0, result.stderr

    def test_rebuild_disposes_only_previous_experiment(self):
        # wf:contract: Build the real Python/TYTX laboratory, repeatedly reset its experiment, and prove old experiment callbacks stop while outer UI bindings and the latest preview keep working.
        self._check("rebuild")

    def test_page_disposal_owns_inspector_and_shortcut(self):
        # wf:contract: The page exposes its developer-tool owner as genro.dev; disposing the page stops its inspector and shortcut without affecting another page. Remount and repeated old disposal preserve the replacement.
        self._check("inspector")

    def test_late_bootstrap_completion_cannot_revive_old_page(self):
        # wf:contract: Control asynchronous page/tool responses during page replacement; only the current page may mount tools or report success, and delayed completion cannot revive a disposed page.
        self._check("bootstrap")
