# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Serve documentation or pages through an optional server adapter."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path



class Cli:
    """Serve documentation with the Python standard library."""

    def run(self):
        parser = argparse.ArgumentParser(description=__doc__)
        commands = parser.add_subparsers(dest="command", required=True)
        manual = commands.add_parser("manual", help="Serve the local HTML manual")
        manual.add_argument("--directory", type=Path)
        manual.add_argument("--host", default="127.0.0.1")
        manual.add_argument("--port", type=int)
        fastapi = commands.add_parser("fastapi", help="Optional FastAPI adapter")
        actions = fastapi.add_subparsers(dest="action", required=True)
        serve = actions.add_parser("serve", help="Discover pages and start FastAPI")
        serve.add_argument("directory", nargs="?", type=Path, default=Path.cwd())
        serve.add_argument("--host", default="127.0.0.1")
        serve.add_argument("--port", type=int, default=8000)
        serve.add_argument("--prefix", default="/page")
        options = parser.parse_args()
        if options.command == "manual":
            self.serve_manual(parser, options)
        else:
            self.serve_fastapi(parser, options)

    def serve_fastapi(self, parser, options):
        try:
            import uvicorn
            from gramlot.contrib.fastapi import GramlotApplication
        except ModuleNotFoundError as error:
            if error.name not in {"fastapi", "uvicorn", "starlette"}:
                raise
            parser.error("FastAPI support is optional; install 'gramlot[fastapi]'.")
        try:
            app = GramlotApplication(directory=options.directory, prefix=options.prefix)
        except (ValueError, OSError) as error:
            parser.error(str(error))
        uvicorn.run(app, host=options.host, port=options.port)


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
    """Console entry point for the technical manual."""
    Cli().run()


if __name__ == "__main__":
    main()
