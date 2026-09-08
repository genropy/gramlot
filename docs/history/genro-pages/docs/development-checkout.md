# Pages checkout relocation — 2026-09-07

Owner-authorized relocation; no runtime feature change and no workflow phase closure.

## Canonical working directory

`/Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages`

Branch: `codex/hello-world`. This is the main checkout, alongside `genro-asgi`.
The old pages worktree remains detached at `72e77298ad5d0de96350005acbf004c2c676b206`.
No dependency repository was switched, cleaned, reset or moved.

## Preserved documents

The destination's original uncommitted documents were backed up, with SHA256
manifest, at `/Users/gporcari/Documents/ChatGPT/genro-pages/temp/relocation-20260907/`.
A second copy is Git stash `f27e0e446004d2bc5faeabca2daec82caf66635e`, retained
under `refs/backup/pages-relocation-original-documents`.
All seven original architecture documents are restored byte-for-byte. Their
2026-09-05 status is historical; the active phased plan records current progress.
CLAUDE/README/index additions are merged without replacing current runtime docs.

## Environment

A fresh `.venv` uses the previous environment's frozen package versions,
including genro-asgi 0.43.1. Python Bag now uses the published genro-bag 0.21.1
from the virtual environment. Experimental dependency worktrees remain necessary:
Builders contains uncommitted SourceBag/GUI changes, and DOM uses its alignment
snapshot. Bag JS 0.4.0 and TYTX JS 0.15.0 now use installed Git release artifacts
in the isolated client root documented below. The test loader and registered-worker fixtures honor the same
`GENRO_CLIENT_MODULES` setting as the other integration tests. Without that
setting, sibling repositories remain the default.

```sh
cd /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages
export GENRO_CLIENT_MODULES="$PWD/temp/client-releases-20260908"
export PYTHONPATH="$PWD/src:/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-builders/src"
.venv/bin/python -m pytest tests/ -q --tb=short
.venv/bin/python -m genro_pages --modules "$GENRO_CLIENT_MODULES" --port 8014 --state-dir /tmp/genro-pages-channel
```

Pages Python and JavaScript come from the canonical checkout. Only the explicit
experimental dependencies still come from the old worktrees. Do not delete that
worktrees directory until their changes have been integrated into their own repos.

## Remaining work

The registered-page workflow is completed and archived under
`.phased/done/registered-page-startup/`. Dependency consolidation continues separately.
The Codex saved project still points to the old outer workspace; select/add the
canonical folder in the app for future tasks. This conversation can operate on
the canonical checkout using an explicit working directory.

## Verification

All 92 tests passed from this canonical checkout using its new `.venv` (26.30 s);
Ruff passed. The server was restarted here on port 8014. A new real-browser
playground load rendered its live example and both typed Bag XML views. The
user's existing editor tab was not reloaded, preserving its unsaved experiment.

## Follow-up: dependency consolidation

The owner requested replacing experimental overrides with consolidated releases.
See [the dependency audit and issue drafts](dependency-consolidation.md). The
working configuration above remains temporary until the required releases pass
the integration checks; no dependency branches were changed during the audit.

## Published Python Bag adoption — 2026-09-07

genro-bag 0.21.1 replaces the Python Bag source override. With the downloaded
release and genro-tytx 0.14.0, all 24 typed-branch regression cases and all 92
Pages integration tests pass. The virtual environment is upgraded to that release
and pyproject.toml declares the minimum explicitly. The experimental Bag worktree
is preserved; its source path must no longer be included in PYTHONPATH. This does
not consolidate Bag JS, Builders or DOM JS.

The demo was started on port 8014 with the documented command. A fresh browser
page rendered the sidebar and Hello World with JSON and MessagePack; editing the
title updated the bound text on focus out. Import inspection confirms genro_bag
comes from `.venv/lib/python3.12/site-packages`, version 0.21.1.

## TYTX alignment and release blockers — 2026-09-08

Python TYTX now comes from the published 0.15.0 wheel in `.venv`; its Python
source override is removed from the command above. The browser/Node TYTX source
currently reached through the existing module links is clean at published tag
`v0.15.0`, commit `6b9bf3a486014d92812caa3b06674083e646c5cd`. It is still served
from that checkout, not bundled into the Pages wheel. Do not advance it implicitly
without rerunning the consumer checks.

The tested active combination is Bag 0.21.1, TYTX 0.15.0 and ASGI 0.43.1, with
experimental Builders, DOM JS and Bag JS as before. All 92 Pages tests pass
(26.35 s); 39 TYTX JS registry contracts pass.

Do not upgrade Python Bag to 0.22 yet: both ASGI 0.43.1 and published 0.44.0 import
`genro_bag.datachange.DataChangeCollector`, which Bag 0.22 removes. The isolated
0.44.0/0.22.0 import fails with ModuleNotFoundError. Pages temporarily declares
`genro-bag>=0.21.1,<0.22`. Adopt the compatible released ASGI line first, including
the documented `genro_asgi_multiworker_spa` import and worker entry-module changes.
ASGI 0.45 was not published at this verification.

Canonical Bag JS has 0.4.0 alignment changes but they are uncommitted, with no
published tag/release found. Keep the existing experimental Bag JS runtime until
a consolidated artifact is available; no sibling changes were overwritten.

Browser verification after this alignment: a new Hello World page on 8014 loaded
with MessagePack, rendered the menu, and updated its bound title on focus out.

## Released Bag JS adoption — 2026-09-08

This supersedes the earlier Bag JS release blocker. The active client module root
is now `temp/client-releases-20260908/` in the canonical Pages checkout:

- Bag JS v0.4.0: `faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a`.
- TYTX JS v0.15.0: `6b9bf3a486014d92812caa3b06674083e646c5cd`.
- Both installed from published Git tags; npm registry publication is unnecessary.
  The generated package-lock.json records those exact commits.
- DOM remains an experimental snapshot at
  `eaaa0ac0a582cc8f9abada1cdddf699cd0e66bbc`, copied from the clean alignment
  worktree. It is NOT a released DOM package. Its Node dependencies resolve to
  the same installed Bag/TYTX as the browser module map. jsdom is 27.0.1.
- Python Builders still uses its original experimental source path. Bag Python
  remains 0.21.1 until a compatible ASGI release is available.

All 92 Pages tests pass with this module root (24.64 s). Original dependency
worktrees and their module links are untouched. The isolated DOM snapshot will
need refreshing explicitly when DOM changes; it does not track the worktree.

To recreate the disposable client root from the canonical checkout (use an empty
root; do not overwrite an existing experiment):

```sh
export GENRO_CLIENT_MODULES="$PWD/temp/client-releases-20260908"
export GENRO_DOM_WORKTREE=/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees/genro-dom-js
mkdir -p "$GENRO_CLIENT_MODULES/genro-dom-js"
npm install --prefix "$GENRO_CLIENT_MODULES" --ignore-scripts --no-audit --no-fund \
  'genro-bag-js@git+https://github.com/genropy/genro-bag-js.git#faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a' \
  'genro-tytx@git+https://github.com/genropy/genro-tytx.git#6b9bf3a486014d92812caa3b06674083e646c5cd' \
  jsdom@27.0.1
# Verify this clean worktree is still the recorded DOM revision before copying.
git -C "$GENRO_DOM_WORKTREE" rev-parse HEAD
git -C "$GENRO_DOM_WORKTREE" status --short
cp -R "$GENRO_DOM_WORKTREE/src" "$GENRO_DOM_WORKTREE/tests" "$GENRO_DOM_WORKTREE/package.json" "$GENRO_CLIENT_MODULES/genro-dom-js/"
ln -s "$GENRO_CLIENT_MODULES/node_modules/genro-bag-js" "$GENRO_CLIENT_MODULES/genro-bag-js"
ln -s "$GENRO_CLIENT_MODULES/node_modules/genro-tytx" "$GENRO_CLIENT_MODULES/genro-tytx"
ln -s "$GENRO_CLIENT_MODULES/node_modules" "$GENRO_CLIENT_MODULES/genro-dom-js/node_modules"
ln -s "$GENRO_CLIENT_MODULES/node_modules" "$GENRO_CLIENT_MODULES/genro-tytx/js/node_modules"
```

The last link exposes MessagePack at the path expected by the current asset
server. This is a development assembly, not the pending production asset bundle.

The browser required one Pages adaptation: map `#uuid` to
`/_assets/bag/browser-uuid.js`, the browser implementation shipped by Bag JS.
Node resolves this conditional package import itself; a raw browser import map
must name it explicitly. After this fix, the demo loaded with JSON and MessagePack
and the title binding updated on focus out. All six bootstrap tests and Ruff pass.

## 2026-09-08 — widget labels and editable inspector integration

The DOM source in `temp/client-releases-20260908/genro-dom-js` has now been
explicitly refreshed from the verified `temp/client-labels-20260908` assembly.
The former DOM snapshot is preserved in `temp/client-dom-before-labels-20260908`.
Bag JS and TYTX releases are unchanged; DOM is still experimental, not released.
The new Pages CodeMirror integration requires `widget-label.js` from this refreshed
DOM snapshot. Existing server module-root configuration remains usable.

Verification: 154 standalone DOM tests and 97 combined Pages tests passed.
See `temp/widget-labels-20260908/contract.md` and
`temp/inspector-editing-20260908/verification.md` for contracts and browser evidence.
Source changes remain in the authoritative DOM worktree and canonical Pages;
the client folders are disposable copies, not development checkouts.

## 2026-09-08 — sliders and one-time recipe defaults

The DOM portion of both client-labels and client-releases has been refreshed
from authoritative DOM source for horizontal/vertical sliders and one-time
recipe defaults. The preceding active DOM snapshot is preserved in
`temp/client-dom-before-sliders-20260908`. Bag/TYTX releases are unchanged.
See `temp/sliders-defaults-20260908/contract.md` for legacy evidence, authoring
parameters, intentional differences and verification. VerticalSlider is now
declared in the Pages laboratory Python grammar. No upstream release occurred.

## Public collaborator preview — 2026-09-08

For a new machine, use [collaborator setup](collaborator-preview.md) instead of the
historical machine-specific commands above. It installs published dependencies
and exact preview Git revisions into an isolated ignored folder. The local
client-releases assembly above predates the form runtime; the new setup includes
forms and the `dataFormula.formula` API. No existing local demo was overwritten.
