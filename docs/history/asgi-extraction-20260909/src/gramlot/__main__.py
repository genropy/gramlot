# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Run the Gramlot page laboratory or serve the HTML manual (manual)."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from genro_asgi import AsgiServer

from .server_configuration import PageConfiguration


class Cli:
    """Launch the minimal page server with explicit client source locations."""

    def run(self):
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument("command", nargs="?", choices=("manual",),
                            help="Serve the local HTML technical manual")
        parser.add_argument("--directory", type=Path, help="HTML manual directory")
        parser.add_argument("--modules")
        parser.add_argument("--host", default="127.0.0.1")
        parser.add_argument("--port", type=int, help="Port (manual: 8037; pages: 8000)")
        parser.add_argument("--state-dir", help="Worker state directory (default: /tmp/gramlot-PORT)")
        parser.add_argument("--rpc-http-method", choices=("WSK", "POST", "GET"), default="WSK",
                            help="Default RPC transport; individual calls may override it")
        options = parser.parse_args()
        if options.command == "manual":
            self.serve_manual(parser, options)
            return
        if not options.modules:
            options.modules = str(Path(__file__).parent / "resources")
        if options.directory:
            parser.error("--directory requires the manual command")
        options.port = 8000 if options.port is None else options.port
        configuration = PageConfiguration(options.modules, options.state_dir or f"/tmp/gramlot-{options.port}",
                                          rpc_http_method=options.rpc_http_method)
        server = AsgiServer(config=configuration)
        server.serve(host=options.host, port=options.port)


    def serve_manual(self, parser, options):
        """Serve the generated draft from this checkout, or an explicit directory."""
        directory = options.directory
        if directory is None:
            root = Path(__file__).resolve().parents[2]
            directory = root / "docs" / "manual" / "html"
            if not (directory / "index.html").is_file():
                editions = sorted(root.glob("temp/technical-manual-*/html/index.html"))
                if not editions:
                    parser.error("No local HTML manual found; use manual --directory PATH")
                directory = editions[-1].parent
        directory = directory.expanduser().resolve()
        if not (directory / "index.html").is_file():
            parser.error(f"HTML manual index.html not found in {directory}")
        port = 8037 if options.port is None else options.port
        handler = partial(SimpleHTTPRequestHandler, directory=str(directory))
        try:
            with ThreadingHTTPServer((options.host, port), handler) as server:
                address, port = server.server_address
                print(f"Manual: http://{address}:{port}/ — Ctrl+C to stop", flush=True)
                server.serve_forever()
        except KeyboardInterrupt:
            pass
        except OSError as error:
            parser.error(f"Cannot serve manual: {error}. Try --port with another port.")


def main():
    """Console entry point for the page server and technical manual."""
    Cli().run()


if __name__ == "__main__":
    main()
