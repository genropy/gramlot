# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Reject distributions with missing or stale browser resources."""
from hashlib import sha256
import json
from pathlib import Path

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class CustomBuildHook(BuildHookInterface):
    def initialize(self, version, build_data):
        root = Path(self.root)
        resources = root / "src/gramlot/resources"
        manifest_path = resources / "manifest.json"
        if not manifest_path.is_file():
            raise RuntimeError("Run npm ci --ignore-scripts in js/dom, then python scripts/prepare_assets.py")
        manifest = json.loads(manifest_path.read_text())
        for base, entries in ((root, manifest['sources']), (resources, manifest['assets'])):
            for name, digest in entries.items():
                path = base / name
                if not path.is_file() or sha256(path.read_bytes()).hexdigest() != digest:
                    raise RuntimeError(f"Missing or stale asset input: {name}; rerun scripts/prepare_assets.py")
        inputs = {str(p.relative_to(root)) for folder in (root / 'js/dom/src', root / 'js/pages/src')
                  for p in folder.rglob('*') if p.is_file()}
        inputs.update(str(p.relative_to(root))
                      for p in (root / 'src/gramlot/grammar').rglob('*.py') if p.is_file())
        inputs.update(str(p.relative_to(root))
                      for p in (root / 'src/gramlot/contrib/fastapi/frontend').rglob('*')
                      if p.is_file())
        inputs.update({'js/dom/package.json', 'js/dom/package-lock.json',
                       'src/gramlot/inspector.py', 'src/gramlot/builder.py',
                       'src/gramlot/transport.py', 'scripts/build_browser_bundle.mjs',
                       'scripts/build_browser_distribution.py'})
        if inputs != set(manifest['sources']):
            raise RuntimeError('JavaScript source inventory changed; rerun scripts/prepare_assets.py')
        actual = {str(p.relative_to(resources)) for p in resources.rglob('*') if p.is_file()}
        if actual != set(manifest['assets']) | {'manifest.json'}:
            raise RuntimeError("Unexpected resource files; rerun scripts/prepare_assets.py")
