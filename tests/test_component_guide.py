"""The component guide example is generated and honest about Builders export."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "docs" / "examples" / "components" / "textbox"
GENERATED = EXAMPLE / "generated"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_component_example_generation_is_reproducible():
    result = subprocess.run(
        [sys.executable, str(EXAMPLE / "generate.py"), "--check"],
        cwd=ROOT, text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "8 generated files" in result.stdout


def test_generated_declaration_composes_and_preserves_open_gramlot_values():
    module = load_module(GENERATED / "textbox_declaration.py", "textbox_guide_declaration")
    builder = module.GuideTextBoxBuilder()
    field = builder.source.guideTextBox(
        value="^record.name",
        disabled=False,
        placeholder="",
        dtype="CUSTOM",
        default=False,
        default_value="",
        lbl="Name",
        lbl_position="TR",
        validate_notnull=True,
        custom_extension=None,
    )
    assert field.node_tag == "guideTextBox"
    assert field.attr["value"] == "^record.name"
    assert field.attr["disabled"] is False
    assert field.attr["placeholder"] == ""
    assert field.attr["dtype"] == "CUSTOM"
    assert field.attr["default"] is False
    assert field.attr["default_value"] == ""
    assert "custom_extension" not in field.attr  # Bag omits null attributes after acceptance.

    schema = module.GuideTextBoxBuilder._class_schema.get_node("guideTextBox")
    assert schema.attr["accepts_var_keyword"] is True
    assert {"value", "disabled", "dtype", "default", "lbl_position"}.issubset(
        schema.attr["declared_names"]
    )
    assert schema.attr["_meta"] == {
        "webcomponent": True,
        "render_tag": "gnr-textbox",
    }


def test_public_builders_export_and_example_parameter_envelope_are_distinct():
    grammar = json.loads((GENERATED / "textbox-builder-grammar.json").read_text())
    exported = grammar["elements"]["guideTextBox"]
    assert grammar["document_format"] == {"name": "builder_grammar", "version": "1.0"}
    assert exported["_meta"]["render_tag"] == "gnr-textbox"
    assert exported["doc"].startswith("An isolated textBox contract example")
    assert exported["attributes"] is None

    javascript = (GENERATED / "textbox-contract.js").read_text()
    assert '"name": "placeholder"' in javascript
    assert '"name": "default_value"' in javascript
    assert '"status": "Worked example only;' in javascript

    area_module = load_module(
        GENERATED / "textbox_area_declaration.py", "textbox_area_guide_declaration"
    )
    area_schema = area_module.GuideTextBoxAreaBuilder._class_schema.get_node(
        "guideTextBoxArea"
    )
    assert {"rows", "maxlength", "remainingHint", "value", "lbl"}.issubset(
        area_schema.attr["declared_names"]
    )
    area_grammar = json.loads(
        (GENERATED / "textbox-area-builder-grammar.json").read_text()
    )
    assert area_grammar["elements"]["guideTextBoxArea"]["_meta"]["render_tag"] == (
        "gnr-textboxarea"
    )
    parameters = (GENERATED / "textbox-area-parameters.rst").read_text()
    assert "``remainingHint``" in parameters


def test_generated_contract_links_to_the_real_component_in_jsdom():
    result = subprocess.run(
        ["node", "--test", str(ROOT / "js" / "dom" / "tests" / "component-guide.test.js")],
        cwd=ROOT / "js" / "dom", text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert "generated component contract" in result.stdout
