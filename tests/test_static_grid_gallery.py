"""Focused Python/JavaScript parity check for the generated static-grid gallery."""

from importlib import util
from pathlib import Path
import os
import subprocess


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "docs" / "examples" / "teaching"


def test_static_grid_python_javascript_data_parity(tmp_path):
    spec = util.spec_from_file_location("static_grid_preview", EXAMPLES / "build_preview.py")
    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    output = tmp_path / "preview"
    module.build(output)
    case = output / "gallery" / "grid" / "grid" / "1"

    result = subprocess.run(
        [
            "node",
            "--experimental-loader",
            str(ROOT / "tests" / "lab_loader.mjs"),
            str(ROOT / "tests" / "static_grid_gallery.mjs"),
            str(case / "recipe.tytx"),
            str(case / "recipe.js"),
            str(case.parent / 'attributes' / '3' / 'recipe.tytx'),
            str(case.parent / 'attributes' / '3' / 'recipe.js'),
            str(case.parent / '4' / 'recipe.tytx'),
            str(case.parent / '4' / 'recipe.js'),
        ],
        cwd=ROOT,
        env=os.environ.copy(),
        text=True,
        capture_output=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "static-grid gallery data agree" in result.stdout
