"""Executable teaching recipes and their generated local preview."""

from html import escape
from importlib import util
import json
import os
from pathlib import Path
import subprocess

from genro_builders.builder import SourceBag
from gramlot.transport import to_tytx


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "docs" / "examples" / "teaching"


def load_page(slug):
    source = EXAMPLES / slug / "recipe.py"
    spec = util.spec_from_file_location(f"test_teaching_{slug.replace('-', '_')}", source)
    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Page()


def child_tags(node):
    value = node.node if hasattr(node, "node") else node
    bag = value.value if hasattr(value, "value") else value
    if not isinstance(bag, SourceBag):
        return []
    return [child.node_tag for child in bag.get_nodes()]


def test_five_progressive_python_recipes_keep_each_step_bounded():
    lessons = json.loads((EXAMPLES / "manifest.json").read_text())
    assert [lesson["slug"] for lesson in lessons[:5]] == [
        "01-text", "02-standalone-widget", "03-explicit-labled-box",
        "04-shared-decoration", "05-formlet",
    ]
    assert len([lesson for lesson in lessons if lesson["kind"] == "progression"]) == 5
    assert len([lesson for lesson in lessons if lesson["kind"] == "follow-on"]) == 2
    supplemental = {lesson["slug"] for lesson in lessons if lesson["kind"] == "supplemental"}
    assert {"08-textbox-area", "09-shared-validation", "10-local-logic", "11-source-slider",
            "12-symbolic-date", "13-number-format", "14-publish-subscribe", "15-stack-topics",
            "16-date-input", "17-text-mask", "18-date-format", "19-required-validation",
            "20-tree-selection", "21-grid-records", "22-grid-attributes",
            "23-email-validation", "24-number-validation"} == supplemental

    builders = []
    for lesson in lessons[:5]:
        page = load_page(lesson["slug"])
        builder = page.source_builder("example")
        page.main(builder.root)
        builders.append(builder)

    assert [node.node_tag for node in builders[0].source.get_nodes()] == ["p"]
    assert [node.node_tag for node in builders[1].source.get_nodes()] == ["textBox"]
    explicit = builders[2].source.get_nodes()[0]
    assert explicit.node_tag == "labledBox" and child_tags(explicit) == ["textBox"]
    assert [node.node_tag for node in builders[3].source.get_nodes()] == [
        "textBox", "numberTextBox", "checkbox",
    ]
    formlet = builders[4].source.get_nodes()[0]
    assert formlet.node_tag == "formlet"
    assert child_tags(formlet) == [
        "textBox", "numberTextBox", "dateTextBox", "filteringSelect", "checkbox",
    ]
    assert formlet.attr["lbl_position"] == "L"
    assert formlet.attr["box_padding"] == "4px"
    assert formlet.value.get_nodes()[-1].attr["lbl_position"] == "R"


def test_python_and_javascript_recipes_build_the_same_live_source():
    modules = Path(os.environ["GRAMLOT_CLIENT_MODULES"])
    lessons = json.loads((EXAMPLES / "manifest.json").read_text())
    payload = []
    for lesson in lessons:
        if set(lesson.get("languages", ["python", "javascript"])) != {"python", "javascript"}:
            continue
        for example in lesson.get("examples", [{"path": "."}]):
            slug = str(Path(lesson["slug"]) / example["path"])
            page = load_page(slug)
            builder = page.source_builder("example")
            page.main(builder.root)
            payload.append({
                "slug": slug,
                "python": to_tytx(builder.source, "json"),
                "javascript": str(EXAMPLES / slug / "recipe.js"),
            })
    result = subprocess.run(
        ["node", "--experimental-loader", str(ROOT / "tests" / "lab_loader.mjs"),
         str(ROOT / "tests" / "teaching_examples.mjs")],
        cwd=modules, input=json.dumps(payload), text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr
    assert f"{len(payload)} Python/JavaScript pairs passed" in result.stdout


def test_preview_build_uses_the_executed_sources(tmp_path):
    source = EXAMPLES / "build_preview.py"
    spec = util.spec_from_file_location("gramlot_teaching_preview", source)
    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    output = tmp_path / "preview"
    module.build(output)
    builder_html = (output / "builder/index.html").read_text()
    assert "__IMPORTS__" not in builder_html
    assert "/runtime/" in builder_html
    assert "Rosetta" not in builder_html
    assert 'href="/builder/"' in (output / "index.html").read_text()
    assert (output / "builder/hover-editor.js").is_file()
    assert (output / "builder/edit.svg").is_file()

    lessons = json.loads((EXAMPLES / "manifest.json").read_text())
    assert len(list((output / "lessons").iterdir())) == len(lessons)
    for lesson in lessons:
        slug = lesson["slug"]
        page = (output / "lessons" / slug / "index.html").read_text()
        for example in lesson.get("examples", [{"path": "."}]):
            example_path = Path(slug) / example["path"]
            for extension in ("py",):
                if {"py": "python", "js": "javascript"}[extension] not in lesson.get("languages", ["python", "javascript"]):
                    continue
                recipe = (EXAMPLES / example_path / f"recipe.{extension}").read_text()
                assert (output / "lessons" / example_path / f"recipe.{extension}").read_text() == recipe
                assert escape(recipe) in page
                assert 'data-language="javascript"' not in page
            assert (output / "lessons" / example_path / "recipe.tytx").is_file() == (
                "python" in lesson.get("languages", ["python", "javascript"]))
    slider_page = (output / "lessons" / "11-source-slider" / "index.html").read_text()
    assert 'data-language="javascript"' not in slider_page
    assert 'readonly aria-label="Python code (read only)"' in slider_page
    assert 'data-action="run"' not in slider_page
    assert 'data-source-mode="module"' in slider_page
    assert 'function randomContacts' not in slider_page
    assert 'function populate' not in slider_page
    assert 'window.contactData.populate' in slider_page
    slider_frame = (output / "lessons" / "11-source-slider" / "python.html").read_text()
    assert 'data-support="/assets/contact-data.js?v=' in slider_frame
    assert 'function populate' in (output / "assets" / "contact-data.js").read_text()
    page = (output / "lessons" / "10-local-logic" / "index.html").read_text()
    assert "Complete Python file" not in page
    assert page.count('class="recipe-editor"') == 4
    assert page.count('readonly aria-label="Python code (read only)"') == 4
    assert page.count('data-action="run"') == 0
    assert page.count('class="code-language"') == 4
    assert page.count('class="inspector-tool"') == 4
    assert (output / "assets" / "lab.js").is_file()
    runtime = next((output / "runtime").iterdir())
    assert (runtime / "dom" / "collections" / "forms.js").is_file()
    assert (output / "reference" / "labled-box" / "index.html").is_file()
    assert (output / "reference" / "validation" / "index.html").is_file()
    result = subprocess.run(
        ["node", "--experimental-loader", str(ROOT / "tests/shipped_runtime_loader.mjs"),
         "--input-type=module", "-e", """
import assert from 'node:assert/strict';
import {fromTytx, isDecimal} from 'genro-tytx';
import {formatNumber} from '/_assets/dom/number-format.js';
const value = fromTytx('12345678901234567890.123456789::N');
assert.ok(isDecimal(value), 'browser TYTX must hydrate Decimal, never boxed Number');
assert.equal(value.toString(), '12345678901234567890.123456789');
assert.equal(formatNumber(value,{format:'0.000000000',locale:'en-US'}),
             '12345678901234567890.123456789');
"""], env={**os.environ, "GRAMLOT_SHIPPED_PREVIEW": str(output)},
        text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr



def test_source_slider_preserves_data_and_existing_cards():
    page = load_page("11-source-slider")
    builder = page.source_builder("example")
    page.main(builder.root)
    result = subprocess.run(
        ["node", "--experimental-loader", str(ROOT / "tests" / "lab_loader.mjs"),
         str(ROOT / "tests" / "source_slider.mjs")],
        cwd=ROOT, input=to_tytx(builder.source, "json"), text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr


def test_gallery_covers_the_component_catalogue_and_mounts_cases(tmp_path):
    spec = util.spec_from_file_location("gallery_preview", EXAMPLES / "build_preview.py")
    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    output = tmp_path / "preview"
    module.build(output)
    catalogue = json.loads((output / "gallery/catalogue.json").read_text())
    for collection in catalogue["collections"]:
        for component in collection["components"]:
            if component["name"] == "dbSelect":
                # Requires the server-backed customer test, not a standalone frame.
                assert (ROOT / "tests/browser/dbselect.spec.js").is_file()
                continue
            page = output / "gallery" / collection["name"] / component["name"] / "index.html"
            content = page.read_text()
            assert 'aria-current="page"' in content
            assert content.count('class="panel lab-row"') >= 2
    result = subprocess.run(
        ["node", "--experimental-loader", str(ROOT / "tests/lab_loader.mjs"),
         str(ROOT / "tests/gallery_examples.mjs"), str(output / "gallery")],
        text=True, capture_output=True, timeout=40,
    )
    assert result.returncode == 0, result.stderr
    assert "gallery cases hydrated" in result.stdout
