# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract: CodeMirror label decoration preserves editor interaction and lifetime."""
from pathlib import Path
import subprocess


def test_codemirror_labels():
    folder = Path(__file__).parent
    result = subprocess.run(
        ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
         str(folder / "codemirror_labels.mjs")], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
