# RPC SourceNode ownership and legacy action alignment

Local implementation checkpoint · 2026-09-12

Later update: the owner includes this foundation in 0.1.2, and it is now
integrated locally in canonical develop, uncommitted. The worktree-only status
and artifact identifiers below describe the earlier checkpoint. See
[release status](../release.md) for the current candidate.

The owner authorized revising the existing page-services experiment. Changes live
in sibling gramlot-datarpc-poc on codex/datarpc-poc, uncommitted. Canonical develop
contains the decision records, not the runtime implementation. No consumer edits,
merge, commit, push, tag or publication occurred.

## Contract and implementation

- dataRpc rejects _concurrency in Python authoring and browser installation.
- SourceNode.rpcPending reports ownership of an invocation; _rpcPromise retains its
  Promise handle. Ownership is reserved before _onCalling to prevent reentrant sends
  and retained through result/error hooks. Finally releases ownership even if hooks fail.
- A second trigger while occupied emits gramlot:busy and attempts a short browser
  audio tone. It neither sends nor queues work. The original response may therefore
  reflect inputs older than currently edited Data; a later explicit activation is
  needed to calculate again. There is no automatic result replacement policy.
- Different SourceNodes may call concurrently. The shared service still tracks and
  cancels transports; removal/disposal invalidates late writes without claiming
  rollback of server-side effects.
- _delay schedules formula/controller/RPC execution in milliseconds. Repeated
  triggers replace a timer; inputs are read at execution. A trigger while RPC is
  busy is rejected before entering the scheduler. Zero/absent/auto means immediate.
- SourceNode.delayedCall uses independently named timers and preserves callback
  ownership. Removed subtrees and disposed builders cancel timers.
- _lockScreen=True owns a framework overlay and makes the application root inert.
  Independent lock tokens prevent one completing request from unlocking another.
  This implements the boolean option, not all legacy lock presentation options.
- Button action receives current parameters, event, _counter and modifiers. Delayed
  clicks count and coalesce; immediate actions filter repeats for 200ms. fire and
  fire_* carry count/modifier attributes, publish retains true payload. The guard
  is runtime state rather than a mutation of the declared disabled Data binding.
- Remote Source retains its separate latest-replacement lifecycle. This alignment
  does not conflate Source replacement with Data RPC invocation.

The triangle example now uses _delay=1 without _concurrency. Its formlet uses
columns=2, correcting the previously ignored cols spelling. Browser tests wait for
one result before the next independent edit and separately exercise busy refusal.

## Legacy source evidence

- gnrdomsource.js:214–227: provider pendingFire timer replacement.
- gnrdomsource.js:335–359: parameter values read at actual execution.
- gnrdomsource.js:1146–1154: delayedCall and named per-node timers.
- gnrdomsource.js:387–469: _onCalling, _lockScreen and per-node Deferred registry.
- genro_rpc.js:153–173,361–376: request registry; registration is not serial execution.
- genro_widgets.js:3500–3587: shared Button/LightButton delayed click count, action,
  fire/publish priorities and immediate-click guard.

Paths refer to /Users/gporcari/Sviluppo/Genropy/genropy/gnrjs/gnr_d11/js. These are
source-reading evidence, not a newly executed legacy browser comparison. The new
busy default is an owner decision, not a claim that legacy blocked all overlaps.

## Verification

Verification of the alignment, separate from the earlier agent checkpoint:

- Full DOM suite: 365 passed. Existing jsdom requestAnimationFrame diagnostics
  still appear in palette/other preexisting tests despite passing assertions;
  these were previously documented by the independent DnD audit.
- Focused RPC/action/remote/form/OpenAPI suite: 39 passed without those diagnostics.
- Focused Python RPC/page/store: 13 passed, including rejection of _concurrency.
- Full Python run: 141 passed, one tutorial test failed because it clicked Generate
  three times within the newly restored 200ms guard. The fixture was corrected to
  model separate user actions; the entire affected teaching suite then passed 5/5.
  The full 142-test coverage is accounted for across these runs, not claimed as one
  uninterrupted green invocation. Existing dependency deprecation warnings remain.
- Real Chromium via Playwright: 2 passed against the rebuilt browser bundle on
  localhost:8066. Verified ready-before-main, local/Python calculation, remote Source,
  busy refusal with exactly one network request, preservation of the original result,
  and a new successful call after completion. The test verifies the busy event;
  it does not assert audible playback under every browser autoplay policy.
- Browser build: c9f99c11b69615f8; wheel build succeeded; ZIP/wheel parity: 45 identical
  files. No clean-environment installation was repeated for this alignment.
- git diff --check passed in both checkouts. No consumer files changed.

Full Python tests use GRAMLOT_CLIENT_MODULES=/tmp/gramlot-page-services-modules.nQsKWv
and the canonical .venv; this keeps imported JS dependency identities coherent with
the worktree's intentional node_modules symlink. The JS OpenAPI test likewise needs
that Python environment on PATH with PYTHONPATH=src.

Existing dirty work and previously generated browser candidates were preserved;
old candidate archives were copied to /private/tmp/gramlot-before-busy-browser
before regeneration. The preview is available at http://127.0.0.1:8066/page/triangle/.
The wheel is a local candidate in /private/tmp/gramlot-rpc-busy-wheel, not a release.

## Limits

Browser audio can be suppressed until user activation; refusal still works and the
busy event remains observable. No queued tone is promised. The boolean screen lock
is app-owned; cross-application modal coordination and all legacy styling options
are outside this slice. Button child-provider/ask/LightButton APIs are not introduced.
The preexisting full-suite jsdom requestAnimationFrame diagnostics are separate
from the new regression checks. No distributed store, canvas or DnD work is included.
