"""Build the local, executable Python/JavaScript teaching preview."""

from __future__ import annotations

import argparse
import ast
from html import escape
import hashlib
from importlib import util
import json
from pathlib import Path
import shutil
import textwrap

import gramlot
from gramlot.transport import to_tytx


HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parents[2]
DEFAULT_OUTPUT = PROJECT_ROOT / "build" / "teaching-preview"
IMPORTS = {
    "gramlot-dom": "/runtime/dom/index.js",
    "gramlot-builder": "/runtime/pages/builder.js",
    "/_assets/dom/": "/runtime/dom/",
    "/_assets/pages/": "/runtime/pages/",
    "/_assets/tytx/": "/runtime/tytx/",
    "genro-bag-js": "/runtime/bag/index.js",
    "#uuid": "/runtime/bag/browser-uuid.js",
    "genro-tytx": "/runtime/tytx/index.js",
    "genro-tytx/": "/runtime/tytx/",
    "decimal.js": "/runtime/decimal/decimal.mjs",
    "@msgpack/msgpack": "/runtime/msgpack/index.mjs",
    "@xmldom/xmldom": "/runtime/pages/xmldom.js",
    "module": "/runtime/pages/module.js",
}
REFERENCES = {
    "labled-box": (
        "Labels and boxes",
        "Use lbl and lbl_* on a widget. Use label, label_* and label_position "
        "on an explicit labledBox. box_*, box_l_* and box_c_* target the outer "
        "box, label region and content region. Supported positions are L, R, "
        "TL, TC, TR, BL, BC and BR; omitted placement uses TL.",
    ),
    "formlet": (
        "Formlet layout",
        "formlet arranges fields without owning form state. Put columns, gap, "
        "lbl_* and box_* defaults on the formlet. A child declaration wins when "
        "it supplies its own value. formlet works both inside and outside form.",
    ),
    "validation": (
        "Shared validation",
        "Call validate with unprefixed rules to write the same validate_* source "
        "attributes accepted inline. Ordinary dictionaries and JavaScript objects "
        "can be reused across fields; no validation class or child node is needed.",
    ),
}


def write(output: Path, relative: str, content: str) -> None:
    target = output / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def asset_url(name: str) -> str:
    revision = hashlib.sha256((HERE / "assets" / name).read_bytes()).hexdigest()[:12]
    return f"/assets/{name}?v={revision}"


def navigation(lessons: list[dict], current: str) -> str:
    groups = {}
    for lesson in lessons:
        groups.setdefault(lesson['group'], []).append(lesson)
    def link(url, title):
        selected = ' aria-current="page"' if current == url else ''
        icon = ('grid' if url == '/gallery/' or '/grid/' in url else 'file') if url.startswith('/gallery/') else 'book'
        return f'<a href="{escape(url, quote=True)}" data-nav-icon="{icon}"{selected}>{escape(title)}</a>'
    gallery = current.startswith('/gallery/')
    branches = ([link('/gallery/', 'Gallery overview'), link('/', 'Tutorial →')] if gallery else
                [link('/', 'Introduction'), link('/gallery/', 'Component gallery →'), link('/builder/', 'Visual Source builder · PoC')])
    hierarchy = {}
    for group, items in groups.items():
        cursor = hierarchy
        for part in group.split(' / '):
            cursor = cursor.setdefault(part, {})
        cursor.setdefault('_lessons', []).extend(items)

    def render_groups(nodes, parents=()):
        result = []
        for name, children in nodes.items():
            if name == '_lessons':
                continue
            path = parents + (name,)
            links = ''.join(f'<li>{link("/" + item.get("_base", "lessons/" + item["slug"]) + "/", item["title"])}</li>' for item in children.get('_lessons', []))
            result.append(f'<details open data-nav-group="{escape(" / ".join(path), quote=True)}"><summary>{escape(name)}</summary>' +
                          (f'<ul>{links}</ul>' if links else '') + render_groups(children, path) + '</details>')
        return ''.join(result)
    branches.append(render_groups(hierarchy))
    return '<nav aria-label="Examples" class="lesson-tree nav-tree">' + ''.join(branches) + '</nav>'


def document(title: str, body: str, lessons: list[dict], current: str = '/') -> str:
    gallery = current.startswith("/gallery/")
    home, brand = ("/gallery/", "Gallery") if gallery else ("/", "Examples")
    return f"""<!doctype html><html lang="en" data-app="{'gallery' if gallery else 'tutorial'}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} · Gramlot {brand}</title>
<link rel="manifest" href="{home}manifest.webmanifest">
<meta name="theme-color" content="#1643c5">
<link rel="stylesheet" href="{asset_url('preview.css')}"></head><body>
<a class="skip-link" href="#content">Skip to content</a>
<header><a class="brand" href="{home}">Gramlot <span>{brand}</span></a>
<button type="button" data-install-app hidden>Install app</button>
<label class="preference"><input type="checkbox" data-preference="show-null-values"> Show null values</label></header>
<script type="module" src="/assets/preferences.js"></script>
<div class="app-shell"><aside class="sidebar">{navigation(lessons, current)}</aside>
<main id="content" tabindex="-1">{body}</main></div>
<script type="module" src="{asset_url('navigation.js')}"></script>
<script type="module" src="{asset_url('pwa/install.js')}"></script></body></html>"""


def frame(title: str, language: str, runtime_base: str, inspector: bool = False,
          support: str | None = None, editor_collection: bool = False) -> str:
    runner_version = hashlib.sha256((HERE / "assets" / "runner.js").read_bytes()).hexdigest()[:12]
    mapping = {key: value.replace("/runtime/", runtime_base + "/") for key, value in IMPORTS.items()}
    if editor_collection:
        mapping["gramlot-builder"] = "/assets/gallery-editor-builder.js"
    imports = json.dumps({"imports": mapping}).replace("<", r"\u003c")
    support_attr = f' data-support="{escape(asset_url(support), quote=True)}"' if support else ""
    return f"""<!doctype html><html lang="en" data-language="{language}" data-inspector="{str(inspector).lower()}"{support_attr}><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} — {language}</title><link rel="stylesheet" href="{asset_url('frame.css')}">
<script type="importmap">{imports}</script></head><body>
<div id="root"></div><p id="error" role="alert" hidden></p>
<script type="module" src="/assets/preferences.js"></script>
<script type="module" src="/assets/runner.js?v={runner_version}"></script></body></html>"""


def load_python_recipe(folder: Path, slug: str):
    spec = util.spec_from_file_location(f"gramlot_teaching_{slug.replace('-', '_')}",
                                        folder / "recipe.py")
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {folder / 'recipe.py'}")
    module = util.module_from_spec(spec)
    spec.loader.exec_module(module)
    page = module.Page()
    builder = page.source_builder("example")
    page.main(builder.root)
    return builder


def recipe_body(source: str, extension: str) -> str:
    """Display the executed function body; keep the complete file available."""
    if extension == "py":
        page = next(node for node in ast.parse(source).body
                    if isinstance(node, ast.ClassDef) and node.name == "Page")
        main = next(node for node in page.body
                    if isinstance(node, ast.FunctionDef) and node.name == "main")
        lines = source.splitlines()[main.body[0].lineno - 1:main.end_lineno]
    else:
        lines = source.strip().splitlines()
        if lines[0] != "export function build(root) {" or lines[-1] != "}":
            raise ValueError("Compact JavaScript recipes must use the standard build wrapper")
        lines = lines[1:-1]
    return textwrap.dedent("\n".join(lines)).strip() + "\n"


def copy_runtime(output: Path) -> str:
    resources = Path(gramlot.__file__).resolve().parent / "resources"
    sources = {
        "dom": resources / "gramlot-dom" / "src",
        "pages": resources / "pages",
        "bag": resources / "genro-bag-js" / "src",
        "tytx": resources / "genro-tytx" / "js" / "src",
        "decimal": resources / "decimal.js",
        "msgpack": resources / "genro-tytx" / "js" / "node_modules" / "@msgpack" / "msgpack" / "dist.esm",
    }
    for name, source in sources.items():
        if not source.is_dir():
            raise RuntimeError(f"Missing prepared runtime asset: {source}")
        shutil.copytree(source, output / "runtime" / name)

    runtime = output / "runtime"
    digest = hashlib.sha256()
    for asset in sorted(runtime.rglob("*")):
        if asset.is_file():
            digest.update(str(asset.relative_to(runtime)).encode())
            digest.update(asset.read_bytes())
    revision = digest.hexdigest()[:12]
    temporary = output / "versioned-runtime"
    runtime.rename(temporary)
    runtime.mkdir()
    temporary.rename(runtime / revision)
    return f"/runtime/{revision}"


def build(output: Path) -> None:
    if output.is_symlink():
        raise RuntimeError("Refusing to replace a symlinked preview directory")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    shutil.copytree(HERE / "assets", output / "assets")
    runtime_base = copy_runtime(output)
    shutil.copytree(HERE / "builder", output / "builder")
    builder_page = output / "builder" / "index.html"
    builder_imports = {key: value.replace("/runtime/", runtime_base + "/") for key, value in IMPORTS.items()}
    builder_page.write_text(builder_page.read_text().replace("__IMPORTS__", json.dumps({"imports": builder_imports})))

    lessons = json.loads((HERE / "manifest.json").read_text())
    gallery_spec = util.spec_from_file_location("gramlot_gallery_cases", HERE.parent / "gallery" / "cases.py")
    gallery = util.module_from_spec(gallery_spec)
    gallery_spec.loader.exec_module(gallery)
    catalogue = json.loads((PROJECT_ROOT / "js/dom/src/components/builtin-components.json").read_text())
    gallery_lessons = gallery.prepare(output, catalogue)
    for index, lesson in enumerate(lessons + gallery_lessons, 1):
        slug = lesson["slug"]
        folder = Path(lesson.get("_folder", HERE / slug))
        base = lesson.get("_base", f"lessons/{slug}")
        languages = lesson.get("languages", ["python", "javascript"])
        examples = lesson.get("examples", [{"path": ".", "title": lesson["title"]}])
        sections = []
        for example in examples:
            example_folder = folder / example["path"]
            example_base = base if example["path"] == "." else f'{base}/{example["path"]}'
            if "python" in languages:
                builder = load_python_recipe(example_folder, slug)
                write(output, f"{example_base}/recipe.tytx", to_tytx(builder.source, "json"))
            panels = []
            for label, extension, language in (
                ("Python", "py", "python"), ("JavaScript", "js", "javascript")
            ):
                if language not in languages:
                    continue
                source = (example_folder / f"recipe.{extension}").read_text()
                write(output, f"{example_base}/recipe.{extension}", source)
                write(output, f"{example_base}/{language}.html", frame(example["title"], language, runtime_base, True, lesson.get("support"), lesson.get("editor_collection", False)))
                compact = "examples" in lesson and not (
                    language == "javascript" and source.lstrip().startswith("import ")
                )
                displayed = recipe_body(source, extension) if compact else source
                mode = "body" if compact else "module"
                if language == "javascript":
                    code = (f'<textarea class="recipe-editor" aria-label="JavaScript code" spellcheck="false">'
                            f'{escape(displayed)}</textarea>'
                            '<div class="lab-controls">'
                            '<button type="button" data-action="reset">Reset</button>'
                            '<span class="lab-status" role="status" aria-live="polite"></span></div>')
                else:
                    code = (f'<textarea class="recipe-editor" readonly aria-label="Python code (read only)" '
                            f'spellcheck="false">{escape(displayed)}</textarea>')
                divider = ('<div class="lab-divider" role="separator" tabindex="0" '
                           'aria-label="Example width" aria-orientation="vertical" '
                           'aria-valuemin="25" aria-valuemax="80" aria-valuenow="50" '
                           'title="Drag to resize; use arrow keys when focused"></div>')
                panels.append(
                    f'<section class="panel lab-row" data-lesson="{slug}" data-language="{language}" data-source-mode="{mode}">'
                    f'<h3>{escape(example["title"])}</h3><div class="example-code resizable">'
                    f'<div class="example-pane"><iframe title="{escape(example["title"])} — {label}" '
                    f'src="/{example_base}/{language}.html"></iframe>'
                    + ('<div class="example-tools"><button type="button" class="inspector-tool" '
                       'aria-label="Open inspector" title="Inspector"><span aria-hidden="true">🔍</span> Open inspector</button></div>'
                       ) + '</div>'
                    f'{divider}<div class="code-pane"><div class="code-language">{label}</div>{code}</div></div></section>'
                )
            intro = (f'<h2>{escape(example["title"])}</h2>'
                     f'<p>{escape(example.get("description", ""))}</p>') if "examples" in lesson else ""
            sections.append(f'<section>{intro}<div class="examples">{"".join(panels)}</div></section>')
        reference = lesson.get("reference")
        reference_link = (
            f'<p><a href="/reference/{reference}/">Read the shared reference →</a></p>'
            if reference else ""
        )
        kind = {"progression": "Step", "follow-on": "Follow-on",
                "supplemental": "Supplement", "gallery": "Case gallery"}[lesson["kind"]]
        body = (
            f'<p class="eyebrow">{escape(lesson["group"]) if lesson.get("_gallery") else f"{kind} {index}"}</p><h1>{escape(lesson["title"])}</h1>'
            f'<p class="lead">{escape(lesson["description"])}</p>{reference_link}' +
            ('<p>Example on the left, Python source on the right (read only). '
             'The displayed source is the executed Python recipe.</p>'
             + ('<p>The host injects <code>window.contactData</code> for sample data generation. '
                'The recipe calls this helper and shows how Source cards are added and removed. '
                f'<a href="{asset_url(lesson["support"])}">View the injected data helper</a>.</p>'
                if lesson.get("support") else '')
             if languages == ["python"] else
             f'<p>{"Python above, JavaScript below. " if "python" in languages else ""}Example on the left, code on the right. JavaScript runs when focus leaves the editor; Reset restores the original example and its Data.</p>') +
            f'{"".join(sections)}<script type="module" src="{asset_url("lab.js")}"></script>'
            f'<script type="module" src="{asset_url("preview-inspector.js")}"></script>'
        )
        write(output, f"{base}/index.html", document(lesson["title"], body, gallery_lessons if lesson.get("_gallery") else lessons, f"/{base}/"))

    for slug, (title, description) in REFERENCES.items():
        source_link = f"../../docs/source/reference/{slug}.rst"
        body = (f'<p class="eyebrow">Shared reference</p><h1>{escape(title)}</h1>'
                f'<p class="lead">{escape(description)}</p>'
                f'<p>The maintained source is <code>{escape(source_link)}</code>.</p>')
        write(output, f"reference/{slug}/index.html", document(title, body, lessons, f"/reference/{slug}/"))

    body = (
        '<p class="eyebrow">Executable examples</p><h1>Build the page one concept at a time.</h1>'
        '<p class="lead">Explore Gramlot through small, working examples. Choose a lesson '
        'from the tree to see its result alongside the code that builds it.</p>'
        '<section><h2>Start with the basics</h2><p>First steps introduces text, widgets, '
        'labels and formlet. Continue with inputs, validation, Data and messages as you need them.</p>'
        '<p><a href="/lessons/01-text/">Start with text →</a></p></section>'
        '<section><h2>Read and experiment</h2><p>Python source is read-only. '
        'JavaScript runs on editor focus-out; Reset restores the original example. '
        'Where available, Open inspector lets you explore Data and Source.</p></section>'
    )
    write(output, "index.html", document("Introduction", body, lessons))
    gallery_body = ('<p class="eyebrow">Component gallery</p><h1>Explore the collections.</h1>'
        '<p class="lead">Choose a component from the tree. Compare independent cases, '
        'exercise edge conditions and inspect their Data and Source alongside the executed Python and, where available, JavaScript code.</p>'
        f'<p>{len(gallery_lessons)} example pages · {sum(len(item["examples"]) for item in gallery_lessons)} manual checks.</p>'
        '<section><h2>How to use a case</h2><p>Read its Check description, interact with the component '
        'and compare the result. These are reproducible manual checks, not a claim of automated browser coverage.</p>'
        '<p>Each case runs in an isolated application. Reload to restore its starting values.</p></section>')
    write(output, "gallery/index.html", document("Component gallery", gallery_body, gallery_lessons, "/gallery/"))
    for app_name, home, name in [('tutorial', '/', 'Gramlot Tutorial'), ('gallery', '/gallery/', 'Gramlot Gallery')]:
        manifest = dict(id=home, name=name, short_name=name.removeprefix('Gramlot '),
            start_url=home, scope=home, display='standalone', lang='en',
            theme_color='#1643c5', background_color='#f5f7fb',
            icons=[dict(src=f'/assets/pwa/{app_name}-{size}.png', sizes=f'{size}x{size}',
                        type='image/png', purpose='any maskable') for size in (192, 512)])
        write(output, home.lstrip('/') + 'manifest.webmanifest', json.dumps(manifest, indent=2))
        write(output, home.lstrip('/') + 'service-worker.js', (HERE / 'assets/pwa/service-worker.js').read_text())
    write(output, "gallery/catalogue.json", json.dumps(catalogue, indent=2))
    write(output, "build-info.json", json.dumps({"examples": lessons}, indent=2))
    print(f"Built {len(lessons)} tutorial lessons and {len(gallery_lessons)} gallery pages: {output}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    options = parser.parse_args()
    build(options.output.expanduser().resolve())


if __name__ == "__main__":
    main()
