# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Generate isolated textBox-family component-contract examples.

This is deliberately an example tool, not a public Gramlot descriptor API.
It never imports or executes the browser implementation.  The only grammar
export step is the public ``BuilderBase.to_grammar`` method.
"""

from __future__ import annotations

import argparse
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import tempfile
from typing import Any


HERE = Path(__file__).resolve().parent
SHARED_PATH = HERE / "shared-attribute-sets.json"
GENERATED = HERE / "generated"

PYTHON_TYPES = {
    "any": "Any",
    "string|null": "str | None",
    "boolean|string|null": "bool | str | None",
    "integer|string|null": "int | str | None",
}


def _load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _expanded_parameters(descriptor: dict[str, Any], shared: dict[str, Any]) -> list[dict[str, Any]]:
    result = list(descriptor["parameters"])
    for name in descriptor["shared_attributes"]:
        if name not in shared:
            raise ValueError(f"unknown shared attribute set: {name}")
        result.extend(shared[name].get("parameters", []))
    names = [parameter["name"] for parameter in result]
    if len(names) != len(set(names)):
        raise ValueError("component and shared parameter names must be unique")
    return result


def _python_default(value: Any) -> str:
    if value is None:
        return "None"
    return repr(value)


def _python_names(recipe_name: str) -> tuple[str, str]:
    words = []
    current = ""
    for character in recipe_name:
        if character.isupper() and current:
            words.append(current)
            current = character
        else:
            current += character
    if current:
        words.append(current)
    base = "".join(word[:1].upper() + word[1:] for word in words)
    return f"{base}Declarations", f"{base}Builder"


def _render_python(
    descriptor: dict[str, Any], shared: dict[str, Any], source_hash: str
) -> str:
    identity = descriptor["identity"]
    recipe_name = identity["recipe_name"]
    declarations_name, builder_name = _python_names(recipe_name)
    params = _expanded_parameters(descriptor, shared)
    lines = [
        "# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0",
        f'"""Generated from its *.component.json + shared-attribute-sets.json ({source_hash}).',
        "",
        "Regenerate with ``python docs/examples/components/textbox/generate.py``.",
        '"""',
        "",
        "from __future__ import annotations",
        "",
        "from typing import Any",
        "",
        "from genro_builders.builder import element",
        "from genro_builders import BuilderBase",
        "",
        "",
        f"class {declarations_name}:",
        '    """Generated declaration mixin for the isolated guide recipe."""',
        "",
        "    @element(",
        f'        sub_tags={descriptor["children"]["sub_tags"]!r},',
        "        _meta={",
        '            "webcomponent": True,',
        f'            "render_tag": {identity["custom_tag"]!r},',
        "        },",
        "    )",
        f"    def {recipe_name}(",
        "        self,",
    ]
    for parameter in params:
        type_name = parameter["type"]
        try:
            python_type = PYTHON_TYPES[type_name]
        except KeyError:
            raise ValueError(f"unsupported example type: {type_name}") from None
        lines.append(
            f'        {parameter["name"]}: {python_type} = '
            f'{_python_default(parameter.get("default"))},'
        )
    if descriptor.get("open_attributes"):
        lines.append("        **kwargs: Any,")
    lines.extend([
        "    ):",
        f'        """{descriptor["summary"]}',
        "",
        "        Explicit parameters come from the component descriptor and its",
        "        referenced shared attribute sets. ``**kwargs`` preserves the open",
        "        Gramlot attribute families documented by those sets.",
        '        """',
        "        ...",
        "",
        "",
        f"class {builder_name}({declarations_name}, BuilderBase):",
        '    """Builders composition used only by the worked guide example."""',
        "",
        f'    _name = "gramlot_{recipe_name.lower()}_guide"',
        "",
    ])
    return "\n".join(lines)


def _load_generated_builder(path: Path, recipe_name: str):
    spec = importlib.util.spec_from_file_location(f"gramlot_{recipe_name}_guide_generated", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load generated module {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return getattr(module, _python_names(recipe_name)[1])


def _render_javascript(
    descriptor: dict[str, Any], shared: dict[str, Any], grammar: dict[str, Any], source_hash: str
) -> str:
    identity = descriptor["identity"]
    recipe_name = identity["recipe_name"]
    contract = {
        "descriptor_format": descriptor["document_format"],
        "identity": identity,
        "summary": descriptor["summary"],
        "parameters": _expanded_parameters(descriptor, shared),
        "shared_attributes": {
            name: shared[name] for name in descriptor["shared_attributes"]
        },
        "integration": descriptor["integration"],
        "lifecycle": descriptor["lifecycle"],
        "presentation": descriptor["presentation"],
        "open_attributes": descriptor["open_attributes"],
        "status": descriptor["status"],
        "builder_grammar": grammar,
    }
    payload = json.dumps(contract, indent=2, ensure_ascii=False)
    export_name = f"{recipe_name[:1].lower() + recipe_name[1:]}Contract"
    return f"""// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Generated from its *.component.json + shared-attribute-sets.json ({source_hash}).
// Regenerate with: python docs/examples/components/textbox/generate.py
import '{identity['implementation_module']}';
import {{getCollection, registerCollection}} from '../../../../../js/dom/src/collections.js';

export const {export_name} = Object.freeze({payload});

const identity = {export_name}.identity;
const implementation = getCollection(identity.implementation_collection);
if (!implementation) {{
    throw new Error(`missing implementation collection: ${{identity.implementation_collection}}`);
}}
const exportedEntry = {export_name}.builder_grammar.elements[identity.recipe_name];
if (!exportedEntry) {{
    throw new Error(`missing exported recipe grammar: ${{identity.recipe_name}}`);
}}
registerCollection(identity.collection, {{
    grammar: {{elements: {{[identity.recipe_name]: exportedEntry}}}},
    defineComponents() {{ implementation.defineComponents(); }},
}});
"""


def _render_rst(descriptor: dict[str, Any], shared: dict[str, Any], source_hash: str) -> str:
    lines = [
        f".. Generated from its component descriptor ({source_hash}); do not edit.",
        "",
        ".. list-table:: Declared and shared parameters",
        "   :header-rows: 1",
        "   :widths: 18 22 60",
        "",
        "   * - Name",
        "     - Type / default",
        "     - Meaning",
    ]
    for parameter in _expanded_parameters(descriptor, shared):
        default = json.dumps(parameter.get("default"))
        lines.extend([
            f"   * - ``{parameter['name']}``",
            f"     - ``{parameter['type']}`` / ``{default}``",
            f"     - {parameter['doc']}",
        ])
    patterns = [pattern for name in descriptor["shared_attributes"]
                for pattern in shared[name].get("open_patterns", [])]
    if patterns:
        lines.extend(["", "Open shared families:", ""])
        for pattern in patterns:
            lines.append(f"* ``{pattern['pattern']}``: {pattern['doc']}")
    lines.append("")
    return "\n".join(lines)


def generated_files() -> dict[Path, str]:
    shared = _load(SHARED_PATH)
    result: dict[Path, str] = {}
    seen = {name: set() for name in ("recipe_name", "custom_tag", "collection")}
    paths = sorted(HERE.glob("*.component.json"))
    if not paths:
        raise ValueError("no convention-named *.component.json descriptors found")
    for descriptor_path in paths:
        descriptor = _load(descriptor_path)
        if descriptor["document_format"] != {
            "name": "gramlot_component_example",
            "version": "0.1",
        }:
            raise ValueError(f"unsupported example descriptor format: {descriptor_path.name}")
        identity = descriptor["identity"]
        for name, values in seen.items():
            value = identity[name]
            if value in values:
                raise ValueError(f"duplicate component {name}: {value}")
            values.add(value)
        if not identity["custom_tag"].startswith("gnr-"):
            raise ValueError("Gramlot component custom tags must use the gnr- prefix")
        stem = descriptor_path.name.removesuffix(".component.json")
        digest = sha256(descriptor_path.read_bytes() + SHARED_PATH.read_bytes()).hexdigest()[:16]
        python_source = _render_python(descriptor, shared, digest)

        with tempfile.TemporaryDirectory() as folder:
            declaration = Path(folder) / f"{stem}_declaration.py"
            grammar_path = Path(folder) / f"{stem}-builder-grammar.json"
            declaration.write_text(python_source, encoding="utf-8")
            builder_class = _load_generated_builder(declaration, identity["recipe_name"])
            builder_class.to_grammar(grammar_path)
            grammar = _load(grammar_path)

        result[GENERATED / f"{stem.replace('-', '_')}_declaration.py"] = python_source
        result[GENERATED / f"{stem}-builder-grammar.json"] = (
            json.dumps(grammar, indent=2, ensure_ascii=False) + "\n"
        )
        result[GENERATED / f"{stem}-contract.js"] = _render_javascript(
            descriptor, shared, grammar, digest
        )
        result[GENERATED / f"{stem}-parameters.rst"] = _render_rst(
            descriptor, shared, digest
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if generated files are stale")
    args = parser.parse_args()
    expected = generated_files()
    if args.check:
        stale = [str(path.relative_to(HERE)) for path, content in expected.items()
                 if not path.is_file() or path.read_text(encoding="utf-8") != content]
        if stale:
            raise SystemExit("stale generated component example: " + ", ".join(stale))
        print(f"Component example is reproducible ({len(expected)} generated files)")
        return
    GENERATED.mkdir(parents=True, exist_ok=True)
    for path, content in expected.items():
        path.write_text(content, encoding="utf-8")
    print(f"Generated {len(expected)} component example files")


if __name__ == "__main__":
    main()
