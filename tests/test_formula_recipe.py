# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: Python GUI formulas execute and react in the shared DOM runtime."""
from pathlib import Path
import subprocess

from gramlot.transport import to_tytx
from gramlot.builder import GramlotBuilder


def test_python_formula_runs_in_browser_runtime():
    builder = GramlotBuilder("main")
    builder.root.data("size", 14)
    builder.root.dataFormula(destination="css", formula="size + 'px'",
                               size="^size", _on_start=True)
    builder.root.div("^css")
    folder = Path(__file__).parent
    result = subprocess.run(
        ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
         str(folder / "formula_recipe.mjs")],
        input=to_tytx(builder.source, "json"), text=True, capture_output=True, timeout=30)
    assert result.returncode == 0, result.stderr
