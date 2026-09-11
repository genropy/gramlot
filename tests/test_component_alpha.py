"""The production component catalogue generates the current open Python dialect."""
import importlib.util
import json
from pathlib import Path

from gramlot.builder import GramlotBuilder

ROOT = Path(__file__).resolve().parents[1]


def test_catalogue_generation_matches_checked_in_sources(tmp_path):
    spec = importlib.util.spec_from_file_location('generate_components', ROOT/'scripts/generate_components.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.generate(ROOT/'js/dom/src/components/builtin-components.json', tmp_path/'components.js', tmp_path/'python')
    assert (tmp_path/'components.js').read_bytes() == (ROOT/'js/dom/src/components/builtin-components.js').read_bytes()
    for path in (tmp_path/'python').iterdir():
        assert path.read_bytes() == (ROOT/'src/gramlot/grammar'/path.name).read_bytes()


def test_every_catalogued_recipe_accepts_runtime_attributes():
    catalog = json.loads((ROOT/'js/dom/src/components/builtin-components.json').read_text())
    builder = GramlotBuilder()
    for collection in catalog['collections']:
        for component in collection['components']:
            node = getattr(builder.root, component['name'])(value='^record.value', extension_flag=True)
            assert node.node.node_tag == component['name']
            assert node.node.attr['value'] == '^record.value'
            assert node.node.attr['extension_flag'] is True
            schema = builder._class_schema.get_node(component['name'])
            assert schema.attr['_meta']['render_tag'] == component['tag']
