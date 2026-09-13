# Remote Source: first bounded experiment

Local, unpublished PoC using the existing remoteSource provider and `@source`
dispatch. Run the common FastAPI example host (`python docs/examples/serve.py`)
and open `/page/remote-source/`. No database or GenroPy installation is required.
The common example panel shows the complete executed Python module beside the
live bordered pane, with the shared CodeMirror, splitter and inspector UI.

Choose Contact or Notes to replace the provider-owned fragment. Edit Shared
draft first: its Data binding persists through replacement because initialization
belongs to `main`, not to the returned fragment. The static sibling lives in the
same contentPane and remains present. Choose Server error to demonstrate that a
failed response preserves the previous fragment, then select a valid choice to
retry. This exercises the current ownership policy, not legacy blanket removal.

The browser uses the existing Promise cancellation and generation checks: latest
Source wins; cancelling the browser request does not promise server cancellation.
No new overlap policy or remote API is introduced.

## Deliberately parked

This PoC does not implement visibility-lazy loading, `cachedRemote`, `_if/_else`,
legacy inherited attributes and `_path` conversion, eager `lazy=False`, `tbody`
merging, `_onRemote` compatibility, nested remote/resource readiness, dirty-form
confirmation, or transactional rollback after partial installation. It does not
establish focus preservation or cleanup under every nested/disposal scenario.
Those remain separate experiments in the
[legacy audit and acceptance matrix](../../development/remote-source-legacy-audit-2026-09-13.md).

The callback reports provider insertion completion, not completion of every
possible asynchronous child widget. This example uses no database, dynamic
resource imports, nested remote, custom JavaScript request or DOM manipulation.

Browser verification on the common FastAPI host (port 8053): Contact → Notes,
edited draft preserved, one static sibling retained, intentional server error
preserves Notes, retry to Contact succeeds, and CodeMirror includes @source.
