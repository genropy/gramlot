# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: typed inspector edits update a real runtime through Bag notifications."""
from pathlib import Path
import subprocess
import os

import pytest

from gramlot.inspector import build_inspector
from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx


@pytest.mark.parametrize("authoring", ["javascript", "python"])
def test_inspector_editing(authoring):
    folder = Path(__file__).parent
    builder = GramlotBuilder("main")
    build_inspector(builder.root)
    env = dict(os.environ)
    env.pop("INSPECTOR_PAGE_SOURCE", None)
    if authoring == "python":
        page = GramlotBuilder("page")
        page.root.data("amount", 12.5)
        page.root.data("color", "red")
        page.root.div("^amount", color="^color")
        page.source.input(value="^amount", type="number")
        page.root.textBox(value="^amount", lbl="Amount", lbl_position="TL")
        env["INSPECTOR_PAGE_SOURCE"] = to_tytx(page.source, transport="json")
    result = subprocess.run(
        ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
         str(folder / "inspector_editing.mjs")], capture_output=True, text=True, env=env,
        input=to_tytx(builder.source, transport="json"))
    assert result.returncode == 0, result.stderr
