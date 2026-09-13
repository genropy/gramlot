# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Produce a self-contained static preview using the prepared browser runtime."""
import json
from pathlib import Path
import shutil

from gramlot.builder import GramlotBuilder
from gramlot.transport import to_tytx
from page import comparison

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUTPUT = ROOT / "build/teaching-preview/recipes"


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    runtime = ROOT / "src/gramlot/resources/browser/esm"
    if not runtime.is_dir():
        raise SystemExit("Prepare the browser assets with scripts/prepare_assets.py first.")
    shutil.copytree(runtime, OUTPUT / "runtime", dirs_exist_ok=True)
    sources = {name: (HERE / name).read_text() for name in ("recipe.py", "recipe.js")}
    builder = GramlotBuilder("example")
    comparison(builder.root, sources["recipe.py"], sources["recipe.js"])
    (OUTPUT / "python-source.js").write_text(
        "export const pythonSource = " + json.dumps(to_tytx(builder.source, "json")) + ";\n")
    for name in ("recipe.js", "start.js", "style.css"):
        shutil.copy2(HERE / name, OUTPUT / name)
    manifest = {
        "kind": "recipe", "name": "messageBoxRecipe", "status": "experiment",
        "description": "A label, textBox and Reset button expanded into an HTML box.",
        "javascript": {"module": "./recipe.js", "export": "messageBoxRecipe"},
        "parameters": {"datapath": "Instance Data path", "title": "Box caption",
                       "showDetail": "Boolean or reactive Bag pointer (JavaScript)"},
        "python": {"name": "message_box", "source": sources["recipe.py"],
                   "note": "show_detail is evaluated at construction; value bindings stay live."},
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    imports = {name: f"./runtime/{name}.js" for name in
               ("gramlot-dom", "gramlot-builder", "genro-tytx")}
    html = ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Gramlot recipe experiment</title><link rel="stylesheet" href="style.css">'
            '<script type="importmap">' + json.dumps({"imports": imports}) + '</script>'
            '<body><main id="root"></main><script type="module" src="start.js"></script></body></html>')
    for name in ("index.html", "standalone.html"):
        (OUTPUT / name).write_text(html)
    print(OUTPUT)


if __name__ == "__main__":
    build()
