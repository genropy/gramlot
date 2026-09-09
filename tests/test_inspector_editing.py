# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: typed inspector edits update a real runtime through Bag notifications."""
from pathlib import Path
import subprocess
import os

import pytest

from gramlot.inspector import build_inspector
from gramlot.widget_test_builder import WidgetTestBuilder
from genro_tytx import to_tytx


@pytest.mark.parametrize("authoring", ["javascript", "python"])
def test_inspector_editing(authoring):
    folder = Path(__file__).parent
    builder = WidgetTestBuilder("main")
    build_inspector(builder.source)
    env = dict(os.environ)
    env.pop("INSPECTOR_PAGE_SOURCE", None)
    if authoring == "python":
        page = WidgetTestBuilder("page")
        page.source.data("amount", 12.5)
        page.source.data("color", "red")
        page.source.div("^amount", color="^color")
        page.source.input(value="^amount", type="number")
        page.source.textBox(value="^amount", lbl="Amount", lbl_position="TL")
        env["INSPECTOR_PAGE_SOURCE"] = to_tytx(page.source, transport="json")
    result = subprocess.run(
        ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
         str(folder / "inspector_editing.mjs")], capture_output=True, text=True, env=env,
        input=to_tytx(builder.source, transport="json"))
    assert result.returncode == 0, result.stderr
