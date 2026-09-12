Gramlot 0.1.3 is a **pre-alpha** developer release. The first usable release is
planned for late 2026; this is not the planned 0.2.0 beta.

- Python-authored pages with explicit `@endpoint` / `@source` services over TYTX.
- Optional FastAPI adapter and optional Genropy database integration.
- Shared collection stores, RPC-backed grids and an experimental dbSelect.
- Consistent Python examples with complete source in CodeMirror, bordered live
  panels, thin splitters and a discreet inspector control.
- Browser ZIP and Python wheel contain the same verified browser payload.

Install the attached wheel with its FastAPI extra for server-backed pages;
use the browser ZIP for JavaScript-only applications. Server-dependent widgets
cannot run in standalone pages. Genropy is optional, not a core dependency.

Known limits: dbSelect is an experiment, not full legacy parity; general RPC
result attributes, advanced collection operations and customer editing remain
unfinished. Each application must define its own endpoint access policy.

This release publishes GitHub assets only. It does not publish to PyPI, npm or a
CDN. Website and Rosetta deploy independently from their own version tags.
