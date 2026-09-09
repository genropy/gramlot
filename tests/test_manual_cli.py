# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Contract tests for local manual serving and existing page CLI compatibility."""
import signal
import subprocess
import sys
from unittest.mock import Mock
from urllib.request import urlopen

from gramlot import __main__ as cli


def test_manual_serves_html_from_another_directory(tmp_path):
    manual = tmp_path / "manual"
    manual.mkdir()
    (manual / "index.html").write_text('<html lang="en">Technical manual</html>')
    process = subprocess.Popen(
        [sys.executable, "-m", "gramlot", "manual", "--directory", str(manual),
         "--port", "0"], cwd=tmp_path, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True)
    try:
        line = process.stdout.readline()
        assert line.startswith("Manual: http://127.0.0.1:"), line
        url = line.split()[1]
        with urlopen(url, timeout=5) as response:
            assert response.status == 200
            assert b'Technical manual' in response.read()
        occupied = subprocess.run(
            [sys.executable, "-m", "gramlot", "manual", "--directory", str(manual),
             "--port", url.split(":")[-1].strip("/")],
            capture_output=True, text=True, timeout=10)
        assert occupied.returncode == 2
        assert "Try --port" in occupied.stderr
    finally:
        process.send_signal(signal.SIGINT)
        process.communicate(timeout=10)
    assert process.returncode == 0


def test_manual_missing_directory(tmp_path):
    result = subprocess.run(
        [sys.executable, "-m", "gramlot", "manual", "--directory", str(tmp_path)],
        capture_output=True, text=True, timeout=10)
    assert result.returncode == 2
    assert "index.html not found" in result.stderr


def test_existing_page_launch(monkeypatch):
    configuration = Mock()
    server = Mock()
    monkeypatch.setattr(cli, "PageConfiguration", configuration)
    monkeypatch.setattr(cli, "AsgiServer", server)
    monkeypatch.setattr(sys, "argv", ["gramlot", "--modules", "/client"])
    cli.main()
    configuration.assert_called_once_with(
        "/client", "/tmp/gramlot-8000", rpc_http_method="WSK")
    server.return_value.serve.assert_called_once_with(host="127.0.0.1", port=8000)
