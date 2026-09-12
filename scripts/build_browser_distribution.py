# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Build one reusable browser payload, then archive those exact packaged bytes."""
from __future__ import annotations

from hashlib import sha256
import json
import mimetypes
from pathlib import Path
import shutil
import stat
import subprocess
import tomllib
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


SCHEMA_VERSION = 1
ENTRY_POINTS = {
    "gramlot-dom": "esm/gramlot-dom.js",
    "gramlot-dom/date-parser": "esm/gramlot-dom-date-parser.js",
    "gramlot-builder": "esm/gramlot-builder.js",
    "genro-bag-js": "esm/genro-bag-js.js",
    "genro-tytx": "esm/genro-tytx.js",
    "genro-tytx/msgpack.js": "esm/genro-tytx-msgpack.js",
    "decimal.js": "esm/decimal.js",
    "@msgpack/msgpack": "esm/msgpack.js",
    "@xmldom/xmldom": "esm/xmldom.js",
    "module": "esm/module.js",
    "gramlot-page-startup": "esm/gramlot-page-startup.js",
}


def digest(path: Path) -> str:
    return sha256(path.read_bytes()).hexdigest()


def media_type(path: Path) -> str:
    overrides = {".js": "text/javascript", ".tytx": "application/vnd.tytx+json"}
    return overrides.get(path.suffix, mimetypes.guess_type(path.name)[0] or "application/octet-stream")


def file_inventory(payload: Path) -> list[dict]:
    return [
        {"path": path.relative_to(payload).as_posix(), "sha256": digest(path),
         "size": path.stat().st_size, "mediaType": media_type(path)}
        for path in sorted(payload.rglob("*")) if path.is_file() and path.name != "manifest.json"
    ]


def write_archive(payload: Path, destination: Path, directory_name: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destination, "w", ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(payload.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(payload).as_posix()
            info = ZipInfo(f"{directory_name}/{relative}", date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            archive.writestr(info, path.read_bytes(), compresslevel=9)


def refresh_resource_manifest(resources: Path) -> None:
    manifest_path = resources / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["assets"] = {
        path.relative_to(resources).as_posix(): digest(path)
        for path in sorted(resources.rglob("*"))
        if path.is_file() and path != manifest_path
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    resources = root / "src/gramlot/resources"
    prepared_manifest = resources / "manifest.json"
    if not prepared_manifest.is_file():
        raise SystemExit("Run python scripts/prepare_assets.py before building the browser distribution")
    payload = resources / "browser"
    if payload.exists():
        shutil.rmtree(payload)
    (payload / "esm").mkdir(parents=True)
    subprocess.run([
        "node", root / "scripts/build_browser_bundle.mjs", resources, payload / "esm"
    ], cwd=root, check=True)

    shutil.copy2(root / "LICENSE", payload / "LICENSE")
    shutil.copy2(root / "NOTICE", payload / "NOTICE")
    shutil.copytree(resources / "licenses", payload / "licenses")
    notices = [
        "Third-party runtime components included in this browser distribution.",
        "Full license texts and package metadata are retained under licenses/.", "",
    ]
    for package_json in sorted((payload / "licenses").rglob("package.json")):
        metadata = json.loads(package_json.read_text())
        notices.append(f"- {metadata['name']} {metadata['version']}: {metadata['license']}")
    (payload / "THIRD-PARTY-NOTICES.txt").write_text("\n".join(notices) + "\n")

    version = tomllib.loads((root / "pyproject.toml").read_text())["project"]["version"]
    files = file_inventory(payload)
    identity = {"schemaVersion": SCHEMA_VERSION, "frameworkVersion": version,
                "entryPoints": ENTRY_POINTS, "files": files}
    build_id = sha256(json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:16]
    manifest = {**identity, "buildId": build_id}
    (payload / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    for path in payload.rglob("*"):
        path.chmod(0o755 if path.is_dir() else 0o644)

    name = f"gramlot-browser-{version}-{build_id}"
    output = root / "build/browser-distributions"
    output.mkdir(parents=True, exist_ok=True)
    for old in output.glob("gramlot-browser-*"):
        if old.is_file():
            old.unlink()
    archive = output / f"{name}.zip"
    write_archive(payload, archive, name)
    (output / f"{name}.zip.sha256").write_text(f"{digest(archive)}  {archive.name}\n")
    refresh_resource_manifest(resources)
    print(f"Built {archive.name}: {len(files)} payload files, build {build_id}")


if __name__ == "__main__":
    main()
