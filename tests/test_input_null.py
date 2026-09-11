# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: Python-authored null values survive input editing and TYTX hydration."""
from pathlib import Path
import subprocess

from genro_bag import Bag
from gramlot.transport import to_tytx
from gramlot.builder import GramlotBuilder


def test_python_null_inputs():
    builder = GramlotBuilder("main")
    tags = ("textBox", "textBoxArea", "numberTextBox", "checkbox", "dateTextBox", "timeTextBox",
                "passwordbox", "comboBox", "filteringSelect", "horizontalSlider",
                "verticalSlider", "colorpicker")
    builder.root.data("sample", Bag(dict.fromkeys(tags)))
    pane = builder.root.div(datapath="sample")
    for tag in tags:
        getattr(pane, tag)(value=f"^.{tag}", lbl=tag)
    folder = Path(__file__).parent
    result = subprocess.run(
        ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
         str(folder / "input_null.mjs")], input=to_tytx(builder.source, transport="json"),
        capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
