"""The small recipe experiment expands Source and retains browser binding."""
from importlib.util import module_from_spec, spec_from_file_location
import os
from pathlib import Path
import subprocess

from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx

ROOT = Path(__file__).resolve().parents[1]
SPEC = spec_from_file_location("message_box_example", ROOT / "docs/examples/recipes/recipe.py")
MODULE = module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_python_composition_and_browser_recipe():
    builder = GramlotBuilder("example")
    for key, detail in (("first", False), ("second", True)):
        box = MODULE.message_box(builder.root, datapath=f"python.{key}", show_detail=detail)
        assert box.node.node_tag == "div"
        assert [node.node_tag for node in box.node.value.get_nodes()] == (
            ["div", "textBox", "button"] + (["p"] if detail else []))
    result = subprocess.run(
        ["node", "--experimental-loader", str(ROOT / "tests/lab_loader.mjs"),
         str(ROOT / "tests/recipe_composition.mjs")],
        input=to_tytx(builder.source, "json"), text=True, capture_output=True,
        env={**os.environ, "GRAMLOT_CLIENT_MODULES": str(ROOT / "build/test-client")},
        timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
