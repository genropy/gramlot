from hashlib import sha256
import json
from pathlib import Path
import re
import stat
import subprocess
import tomllib
from zipfile import ZipFile

import pytest


ROOT = Path(__file__).resolve().parents[1]
BROWSER = ROOT / "src/gramlot/resources/browser"
BROWSER_MANIFEST = BROWSER / "manifest.json"

pytestmark = pytest.mark.skipif(
    not BROWSER_MANIFEST.is_file(),
    reason="browser distribution is built only by the package job",
)


def test_browser_manifest_is_complete_and_content_addressed():
    manifest = json.loads((BROWSER / "manifest.json").read_text())
    assert manifest["schemaVersion"] == 1
    project = tomllib.loads((ROOT / "pyproject.toml").read_text())
    assert manifest["frameworkVersion"] == project["project"]["version"]
    assert "gramlot-dom/date-parser" in manifest["entryPoints"]
    assert "gramlot-page-startup" in manifest["entryPoints"]
    inventory = {item["path"]: item for item in manifest["files"]}
    actual = {path.relative_to(BROWSER).as_posix() for path in BROWSER.rglob("*")
              if path.is_file() and path.name != "manifest.json"}
    assert set(inventory) == actual
    for name, item in inventory.items():
        path = BROWSER / name
        assert item["sha256"] == sha256(path.read_bytes()).hexdigest()
        assert item["size"] == path.stat().st_size
        assert stat.S_IMODE(path.stat().st_mode) == 0o644
    identity = {key: manifest[key] for key in
                ("schemaVersion", "frameworkVersion", "entryPoints", "files")}
    expected = sha256(json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:16]
    assert manifest["buildId"] == expected
    assert all((BROWSER / entry).is_file() for entry in manifest["entryPoints"].values())


def test_bundled_relative_and_lazy_resources_resolve():
    manifest = json.loads((BROWSER / "manifest.json").read_text())
    allowed_bare = set(manifest["entryPoints"])
    imports = re.compile(r"(?:^|;)import(?:[^;\"']*?from)?[\"']([^\"']+)[\"']")
    lazy_assets = re.compile(r"new URL\([\"'](\./[^\"']+)[\"']")
    for script in (BROWSER / "esm").rglob("*.js"):
        text = script.read_text()
        assert {name for name in imports.findall(text) if not name.startswith(".")} <= allowed_bare
        for reference in imports.findall(text) + lazy_assets.findall(text):
            if not reference.endswith((".js", ".css", ".tytx")):
                continue
            assert (script.parent / reference).resolve().is_file(), (script, reference)
    assert (BROWSER / "esm/inspector-component.js").is_file()
    assert (BROWSER / "esm/inspector-editor.js").is_file()
    for base in (BROWSER / "esm", BROWSER / "esm/chunks"):
        for name in ("inspector.css", "inspector-theme.css", "inspector.tytx",
                     "inspector-embedded.tytx"):
            assert (base / name).is_file()


def test_archive_contains_exact_payload_with_portable_permissions():
    manifest = json.loads((BROWSER / "manifest.json").read_text())
    name = f"gramlot-browser-{manifest['frameworkVersion']}-{manifest['buildId']}"
    archive_path = ROOT / f"build/browser-distributions/{name}.zip"
    checksum_path = archive_path.with_suffix(".zip.sha256")
    assert checksum_path.read_text() == f"{sha256(archive_path.read_bytes()).hexdigest()}  {archive_path.name}\n"
    with ZipFile(archive_path) as archive:
        archived = {info.filename.removeprefix(name + "/"): archive.read(info)
                    for info in archive.infolist() if not info.is_dir()}
        assert all((info.external_attr >> 16) & 0o777 == 0o644
                   for info in archive.infolist() if not info.is_dir())
    packaged = {path.relative_to(BROWSER).as_posix(): path.read_bytes()
                for path in BROWSER.rglob("*") if path.is_file()}
    assert archived == packaged


def test_minified_public_entries_share_identity_and_remain_reactive():
    result = subprocess.run(
        ["node", ROOT / "tests/browser_distribution.mjs", BROWSER / "manifest.json"],
        cwd=ROOT, text=True, capture_output=True, timeout=30,
    )
    assert result.returncode == 0, result.stderr
