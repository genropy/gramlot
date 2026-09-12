# Experimental page services

The bounded page-service foundation is now included in the planned 0.1.2
release and integrated locally in the canonical checkout. It is not yet published. It is not a complete legacy RPC or remote implementation.

## Python roles and inheritance

`@endpoint` exposes a Data-producing method and `@source` exposes a method that
builds Source into its first `root` argument. `main(self, root)` is implicitly a
Source method and is the only method exposed by name alone.

```python
from decimal import Decimal
from gramlot.page import WebPage, endpoint, source

class Page(WebPage):
    @endpoint
    def triangle_area(self, base: Decimal, height: Decimal) -> Decimal:
        return base * height / Decimal('2')

    @source
    def note(self, root, base: Decimal) -> None:
        root.p(f'Base: {base}')

    def main(self, root):
        root.dataRpc('area', self.triangle_area,
                     base='^base', height='=height', _on_start=True)
        pane = root.contentPane(datapath='note')
        pane.remote(self.note, base='^base')
```

Discovery follows the effective Python MRO, including ordinary mixins. An
unchanged inherited method retains its role. A new overriding `def` must repeat
the decorator; otherwise it hides the inherited exposure. `super()` has normal
Python behavior. Applying both decorators to one function fails at definition
time.

Every invocation creates a Page and, for Source methods, a fresh builder. Pages
must remain stateless. A method can request framework context through an explicitly
annotated parameter such as `context: InvocationContext`; callers cannot supply
or replace it. The context currently carries page/method identity, the host
request and the application `ExclusiveBagStore`.

## Typed calls and lifecycle

`dataRpc` and `genro.serverCall` share `ServerCallService`. Named parameters are
resolved once per invocation, encoded as TYTX JSON, checked against the allowlisted
method signature and decoded automatically. Strings, integers, floats, booleans,
Decimal values, null and Bags retain their types. No `_result_dtype` is needed.
Plain dict/list values stay dict/list; automatic JSON-to-Bag conversion remains
unsettled.

On success `dataRpc` writes its optional destination before `_onResult(result,
kwargs, old)`. `_onCalling` may edit the snapshot or return exactly `false` to
cancel. Failure preserves the previous destination. A dataRpc SourceNode owns one pending
Promise, exposed through `rpcPending` and `_rpcPromise`. A second activation while
occupied is refused immediately, emits application-owned busy feedback, and is
never queued or replayed. Different nodes may call concurrently. `_concurrency`
is rejected. Removal and application disposal cancel transport and invalidate late responses. Client cancellation
does not roll back server work.

`serverCall(method, params, callback=null, mode=null, httpMethod=null, options={})`
returns a Promise. Only TYTX and POST are implemented. Its default timeout is
50,000 milliseconds. Legacy synchronous XHR, string callbacks, alternate result
modes, chained callback nodes and WebSockets are outside this experiment.

## Ready application and remote Source

The FastAPI page document creates `Application` and its services before requesting
`main` through the Source role. The root reports `data-gramlot-state` as
`loading-content`, `ready` or `error`, and framework events distinguish application
readiness from content readiness. A failed main leaves the initialized shell alive
and displays the error.

`contentPane.remote()` installs a transparent Source provider in the existing
container. Each response is validated in a detached branch before mutation. A
successful response disposes the provider's prior branch and mounts the new one in
the container's relative Data scope. Failure preserves the last working branch;
replacement always uses latest-response selection, and disposal rejects late work.
This bounded slice supports `contentPane` only. It does not claim `framePane`, tab
page, arbitrary layout-child, resource download, retry or cached-remote parity.

The client fails immediately when a selected Data or Source provider has no
configured Gramlot server. A standalone package may call configured services, but
Python endpoints must actually be installed on that server.

## Shared state

`ExclusiveBagStore` is one process-local dictionary of Bags owned by one worker
thread for the whole operation. Reads and writes use the same reentrant exclusive
lock. Store insertion copies caller Bags. Bag access is lease-guarded and becomes
invalid after release; `run()` detaches its returned value and `snapshot()` is detached.
Exceptions release ownership but do not roll back partial mutations. `run_async()`
runs acquisition, work and release in one worker and waits for that worker even
after cancellation, so cancellation cannot unlock active code. Cancellation wins
over a later worker exception after consuming it. Callbacks must still avoid leaking
implementation internals through side effects outside the supported lease API.
Multi-process or
distributed coordination, persistence, fairness, timeouts and memory eviction are
not promised.

## Trigger scheduling, busy feedback and interaction locks

`_delay` is measured in milliseconds and applies to dataFormula, dataController and
dataRpc. A new trigger before expiry replaces the timer on that SourceNode. Bound
parameters are read when execution actually starts, so related updates are coalesced.
Absent/zero delay executes immediately; legacy `auto` currently means no delay.
`SourceNode.delayedCall(callback, delay=1, code='delayedCall')` provides independent
named timers, with node-owned cleanup on removal/disposal.

A dataRpc trigger while `rpcPending` is true is refused before scheduling a timer.
Busy feedback emits `gramlot:busy` with the SourceNode and attempts a short tone.
Browsers may suppress audio until user activation; refusal does not depend on audio
permission. The application closes its audio context on disposal. A completion or
error (including hook errors) releases pending state; busy is not a server error.

`_lockScreen=True` adds a framework overlay and makes the application root inert.
Locks have separate owners: one RPC finishing cannot remove another RPC's lock.
Removal, cancellation and failure release the appropriate ownership. This first
slice implements the boolean option only, not every legacy lock styling/delay option.

Button `action` receives `event`, `_counter`, `modifiers` and current Source parameters.
With `_delay`, successive clicks reset one timer and increment `_counter`; one action
runs after the last click using the last event. Without delay it runs immediately
and rejects repeat clicks for 200ms; that short guard is unrelated to RPC lifetime.
`fire` and `fire_*` attach `_counter` to the fired Data event; `publish` sends true.
Provider/button timers are runtime state and are not serialized into the recipe.
This slice does not claim the entire legacy Button/LightButton/ask/child-provider API.
