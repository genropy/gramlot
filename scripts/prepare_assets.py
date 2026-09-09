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
            modules / "@msgpack/msgpack/dist.esm": "genro-tytx/js/node_modules/@msgpack/msgpack/dist.esm",
        }
        for source in copies:
            if not source.is_dir():
                raise SystemExit(f"Missing {source}; run npm ci --ignore-scripts in js/dom first")
        if target.exists():
            shutil.rmtree(target)
        for source, destination in copies.items():
            shutil.copytree(source, target / destination)
        for package in ("genro-bag-js", "genro-tytx", "@msgpack/msgpack"):
            source = modules / package
            destination = target / "licenses" / package
            destination.mkdir(parents=True)
            shutil.copy2(source / "package.json", destination / "package.json")
            for name in ("LICENSE", "NOTICE"):
                if (source / name).is_file():
                    shutil.copy2(source / name, destination / name)
            if not (destination / "LICENSE").exists():
                metadata = json.loads((source / "package.json").read_text())
                if metadata["license"] != "Apache-2.0":
                    raise SystemExit(f"Missing license text for {package}")
                shutil.copy2(root / "LICENSE", destination / "LICENSE")
        paths = [p for folder in (root / "js/dom/src", root / "js/pages/src")
                 for p in folder.rglob('*') if p.is_file()]
        paths += [root / "js/dom/package.json", root / "js/dom/package-lock.json"]
        manifest = {
            "sources": {str(p.relative_to(root)): sha256(p.read_bytes()).hexdigest() for p in sorted(paths)},
            "assets": {str(p.relative_to(target)): sha256(p.read_bytes()).hexdigest()
                       for p in sorted(target.rglob('*')) if p.is_file()},
        }
        (target / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"Prepared {len(manifest['assets'])} browser resource files")


if __name__ == "__main__":
    AssetPreparation().run()
