"""The published local-logic pair exercises the same browser behavior."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import subprocess

from gramlot.transport import to_tytx


def test_local_logic_python_transport_and_javascript_recipe_match():
    root = Path(__file__).resolve().parents[1]
    spec = spec_from_file_location('price_recipe', root / 'docs/examples/logical-blocks/recipe.py')
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    builder = module.PriceRecipe('example')
    builder.create()
    result = subprocess.run(
        ['node', '--experimental-loader', str(root / 'tests/lab_loader.mjs'),
         str(root / 'tests/local_logic.mjs')],
        input=to_tytx(builder.source, 'json'), text=True, capture_output=True,
        cwd=root, timeout=30,
    )
    assert result.returncode == 0, result.stderr
