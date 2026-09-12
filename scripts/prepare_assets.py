# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Assemble browser resources after npm ci in js/dom; never fetch at build time."""
from hashlib import sha256
import json
from pathlib import Path
import shutil


class AssetPreparation:
    def run(self):
        root = Path(__file__).resolve().parents[1]
        modules = root / "js/dom/node_modules"
        target = root / "src/gramlot/resources"
        copies = {
            root / "js/dom/src": "gramlot-dom/src",
            root / "js/pages/src": "pages",
            modules / "genro-bag-js/src": "genro-bag-js/src",
            modules / "genro-tytx/js/src": "genro-tytx/js/src",
            modules / "decimal.js": "decimal.js",
            modules / "@msgpack/msgpack/dist.esm": "genro-tytx/js/node_modules/@msgpack/msgpack/dist.esm",
        }
        for source in copies:
            if not source.is_dir():
                raise SystemExit(f"Missing {source}; run npm ci --ignore-scripts in js/dom first")
        if target.exists():
            shutil.rmtree(target)
        for source, destination in copies.items():
            shutil.copytree(source, target / destination)
        # Build the inspector from its authoritative Python recipe, not a second JS UI.
        import sys
        sys.path.insert(0, str(root / "src"))
        from gramlot.builder import GramlotBuilder
        from gramlot.inspector import build_inspector
        from gramlot.transport import to_tytx
        from genro_builders.builder import SourceBag
        from genro_tytx import from_tytx

        def verify_source_types(original, decoded, path="root"):
            """Fail before publishing if the encoder erases a structural branch type."""
            if isinstance(original, SourceBag) and not isinstance(decoded, SourceBag):
                raise SystemExit(
                    f"Recipe compiler lost SourceBag typing at {path}; "
                    "install the project dependencies from pyproject.toml"
                )
            if not isinstance(original, SourceBag):
                return
            for node in original:
                value = node.value
                if isinstance(value, SourceBag):
                    verify_source_types(value, decoded.get_item(node.label), f"{path}.{node.label}")

        def source_branch_count(source):
            return 1 + sum(
                source_branch_count(node.value)
                for node in source
                if isinstance(node.value, SourceBag)
            )

        for presentation, filename in (("floating", "inspector.tytx"),
                                       ("embedded", "inspector-embedded.tytx")):
            inspector = GramlotBuilder()
            build_inspector(inspector.root, presentation=presentation)
            encoded = to_tytx(inspector.source, "json")
            if encoded.count("::XS") != source_branch_count(inspector.source):
                raise SystemExit(
                    f"Recipe compiler lost SourceBag markers in {filename}; "
                    "install the project dependencies from pyproject.toml"
                )
            verify_source_types(inspector.source, from_tytx(encoded, transport="json"))
            (target / "pages" / filename).write_text(encoded)
        for package in ("genro-bag-js", "genro-tytx", "@msgpack/msgpack", "decimal.js"):
            source = modules / package
            destination = target / "licenses" / package
            destination.mkdir(parents=True)
            shutil.copy2(source / "package.json", destination / "package.json")
            for name in ("LICENSE", "LICENCE.md", "NOTICE"):
                if (source / name).is_file():
                    shutil.copy2(source / name, destination / name)
            if not (destination / "LICENSE").exists() and not (destination / "LICENCE.md").exists():
                metadata = json.loads((source / "package.json").read_text())
                if metadata["license"] != "Apache-2.0":
                    raise SystemExit(f"Missing license text for {package}")
                shutil.copy2(root / "LICENSE", destination / "LICENSE")
        paths = [p for folder in (root / "js/dom/src", root / "js/pages/src")
                 for p in folder.rglob('*') if p.is_file()]
        paths += [p for p in (root / "src/gramlot/grammar").rglob("*.py") if p.is_file()]
        paths += [p for p in (root / "src/gramlot/contrib/fastapi/frontend").rglob('*')
                  if p.is_file()]
        paths += [root / "js/dom/package.json", root / "js/dom/package-lock.json",
                  root / "src/gramlot/inspector.py", root / "src/gramlot/builder.py",
                  root / "src/gramlot/transport.py",
                  root / "scripts/build_browser_bundle.mjs",
                  root / "scripts/build_browser_distribution.py"]
        manifest = {
            "sources": {str(p.relative_to(root)): sha256(p.read_bytes()).hexdigest() for p in sorted(paths)},
            "assets": {str(p.relative_to(target)): sha256(p.read_bytes()).hexdigest()
                       for p in sorted(target.rglob('*')) if p.is_file()},
        }
        (target / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"Prepared {len(manifest['assets'])} browser resource files")


if __name__ == "__main__":
    AssetPreparation().run()
