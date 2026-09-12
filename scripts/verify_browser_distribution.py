# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Verify that a browser ZIP and wheel contain byte-identical runtime payloads."""
from pathlib import Path
import sys
from zipfile import ZipFile


def selected(files: dict[str, bytes], marker: str) -> dict[str, bytes]:
    return {name.split(marker, 1)[1]: data for name, data in files.items() if marker in name}


def contents(path: Path) -> dict[str, bytes]:
    with ZipFile(path) as archive:
        return {name: archive.read(name) for name in archive.namelist() if not name.endswith("/")}


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: verify_browser_distribution.py WHEEL BROWSER_ZIP")
    wheel, browser_zip = map(Path, sys.argv[1:])
    wheel_payload = selected(contents(wheel), "gramlot/resources/browser/")
    zip_files = contents(browser_zip)
    roots = {name.split("/", 1)[0] for name in zip_files}
    assert len(roots) == 1, "Browser archive must contain one versioned directory"
    root = roots.pop() + "/"
    zip_payload = {name.removeprefix(root): data for name, data in zip_files.items()}
    assert wheel_payload == zip_payload, "Wheel and browser ZIP payloads differ"
    print(f"Browser payload parity: {len(zip_payload)} identical files")


if __name__ == "__main__":
    main()
