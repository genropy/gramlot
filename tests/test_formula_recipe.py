# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: Python GUI formulas execute and react in the shared DOM runtime."""
from pathlib import Path
import subprocess

from genro_tytx import to_tytx
from gramlot.widget_test_builder import WidgetTestBuilder


def test_python_formula_runs_in_browser_runtime():
    builder = WidgetTestBuilder("main")
    builder.source.data("size", 14)
    builder.source.dataFormula(destination="css", formula="({size}) => size + 'px'",
                               size="^size", _on_start=True)
    builder.source.div("^css")
    folder = Path(__file__).parent
    result = subprocess.run(
        ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
         str(folder / "formula_recipe.mjs")],
        input=to_tytx(builder.source, "json"), text=True, capture_output=True, timeout=30)
    assert result.returncode == 0, result.stderr
