# Collaborator preview

This is an experimental development snapshot, not a stable release. No merge to
main or package publication is implied. Use macOS or Linux, Python 3.12, Git,
and a recent Node.js with npm (Node 24 LTS is recommended).

## Install from public repositories

```sh
git clone --branch codex/hello-world https://github.com/genropy/genro-pages.git
cd genro-pages
bash scripts/setup-demo.sh
source temp/collaborator-demo/venv/bin/activate
export GENRO_CLIENT_MODULES="$PWD/temp/collaborator-demo/client"
genropages --modules "$GENRO_CLIENT_MODULES" --port 8014
```

Open http://127.0.0.1:8014/. The menu offers Hello World, widget examples and the
playground. Ctrl+Shift+D opens the inspector. Try reactive inputs, labels, sliders,
null values and inspector editing. Form APIs have executable tests; a complete
business form with backend persistence is not supplied by this preview.

Keep the terminal open; Ctrl+C stops the server. If the port is occupied, choose
another with `--port`. Use `PYTHON=/path/to/python3.12 bash scripts/setup-demo.sh`
when Python is not on PATH. Setup refuses to overwrite an existing preview folder.
All installation files live in the ignored `temp/collaborator-demo/` directory.
The initial installation needs internet access; optional syntax highlighting and
editor assets may also use external services in the existing demo.

## Technical manual

In another terminal, from the same checkout:

```sh
source temp/collaborator-demo/venv/bin/activate
genropages manual
```

Open http://127.0.0.1:8037/ in Chrome and select Translate to Italian. The manual
contains the current separate-repository maps and proposed unified genro-gui maps.
It is included under `docs/manual/` as a review draft. Its original tested snapshot
and subsequent addendum remain historical; the preview verification below covers
the newer code. Private local source-viewer copies are not distributed.

## Run the checks

```sh
export GENRO_CLIENT_MODULES="$PWD/temp/collaborator-demo/client"
python -m pytest tests/ -q
npm test --prefix "$GENRO_CLIENT_MODULES/genro-dom-js"
node --experimental-loader ./tests/lab_loader.mjs --test js/tests/rpc.test.mjs
```

## Pinned components

| Component | Revision / version |
| --- | --- |
| Pages | Branch `codex/hello-world`; record `git rev-parse HEAD` after cloning |
| DOM JS | `d888cefbb4dfb65868148afb2e00cabe84b4de08` |
| Builders Python | `25ae61950717afae10e1d43d8318f272122202ac` |
| Bag JS | `faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a` (v0.4.0) |
| TYTX JS | `6b9bf3a486014d92812caa3b06674083e646c5cd` (v0.15.0) |
| ASGI / Bag / TYTX Python | 0.43.1 / 0.21.1 / 0.15.0 |

`requirements-demo.txt` pins the Python environment; DOM's package-lock.json pins
its JavaScript installation. Builders remains a Git preview because the required
SourceBag and GUI recipe changes are not in a published release. Do not upgrade
Bag/ASGI independently: this snapshot depends on their existing integration paths.

## Verification of this preview

The DOM snapshot passes 212 tests after a clean `npm ci`. Builders passes 404
Python tests. Pages passes 106 integration tests against the current DOM snapshot;
the RPC suite passes 3 tests with the documented module loader. Ruff passes in
Pages and Builders. Mypy findings are advisory under repository policy.

The GUI Python grammar uses `dataFormula(destination=..., formula=...)`, matching
the DOM runtime. Generic Python Builders keeps its original static `func` API.
