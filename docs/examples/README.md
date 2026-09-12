# Gramlot examples: one FastAPI environment

From the repository checkout, with the optional FastAPI dependencies installed:

```sh
.venv/bin/python docs/examples/serve.py
```

This builds the browser assets, tutorial/gallery and Python OpenAPI recipe, then
starts one FastAPI application on localhost:8051. Use `--no-build` to reuse the
existing generated files, or `--port` to choose another port.

| Surface | URL path |
| --- | --- |
| Tutorial | / |
| Component gallery | /gallery/ |
| Visual builder | /builder/ |
| Triangle Data RPC and remote Source | /page/triangle/ |
| Hello page collection | /hello/ |
| Python OpenAPI Explorer | /openapi/ |
| Synthetic products and quotations API | /api/products, /api/quote |

All examples use FastAPI as their hosting environment. Static browser recipes
remain static: serving them with FastAPI does not introduce unnecessary RPC calls.
Python methods use the optional Gramlot FastAPI adapter; browser interactions use
the same Gramlot runtime. No GenroPy or Genro ASGI dependency is needed. Legacy
GenroPy supplies design and compatibility evidence, not an execution requirement.

The OpenAPI fixtures live only in this example host and use synthetic memory data.
They do not establish a database API in Gramlot core. FastAPI remains optional for
installations that only need the independent browser runtime. The manual CLI is
still available for documentation; it is no longer the example hosting instruction.
The IndexedDB file:// probe is a browser diagnostic, not a Gramlot application.

Verification of this host: the FastAPI TestClient checks route composition,
products filtering and quotation validation; six Chromium checks exercised the
triangle RPC/remote lifecycle, busy refusal, tutorial focus-out execution and the
OpenAPI live/source presentation on the same origin. No external database or
GenroPy service participated in these checks.
