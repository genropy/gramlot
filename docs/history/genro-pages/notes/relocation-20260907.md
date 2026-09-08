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
including genro-asgi 0.43.1. Experimental dependency worktrees remain necessary:
Bag and Builders contain uncommitted typed-branch changes, and DOM uses its
alignment branch. The test loader and registered-worker fixtures honor the same
`GENRO_CLIENT_MODULES` setting as the other integration tests. Without that
setting, sibling repositories remain the default.

```sh
cd /Users/gporcari/Sviluppo/genro_ng/meta-genro-modules/sub-projects/genro-pages
export GENRO_CLIENT_MODULES=/Users/gporcari/Documents/ChatGPT/genro-pages/worktrees
export PYTHONPATH="$PWD/src:$GENRO_CLIENT_MODULES/genro-builders/src:$GENRO_CLIENT_MODULES/genro-bag/src:$GENRO_CLIENT_MODULES/genro-tytx/src"
.venv/bin/python -m pytest tests/ -q --tb=short
.venv/bin/python -m genro_pages --modules "$GENRO_CLIENT_MODULES" --port 8014 --state-dir /tmp/genro-pages-channel
```

Pages Python and JavaScript come from the canonical checkout. Only the explicit
experimental dependencies still come from the old worktrees. Do not delete that
worktrees directory until their changes have been integrated into their own repos.

## Remaining work

The registered-page workflow is unchanged: phase 2 usability is accepted;
its naming review and closure remain pending. Relocation does not approve names.
The Codex saved project still points to the old outer workspace; select/add the
canonical folder in the app for future tasks. This conversation can operate on
the canonical checkout using an explicit working directory.

## Verification

All 92 tests passed from this canonical checkout using its new `.venv` (26.30 s);
Ruff passed. The server was restarted here on port 8014. A new real-browser
playground load rendered its live example and both typed Bag XML views. The
user's existing editor tab was not reloaded, preserving its unsaved experiment.
