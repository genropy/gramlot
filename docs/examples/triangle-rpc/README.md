# Triangle dataRpc experiment

Run the example with the optional FastAPI adapter:

```console
gramlot fastapi serve docs/examples/triangle-rpc
```

Then open `/page/triangle/`. The Python page declares all UI, state, bindings,
local logic and the remote calls through Gramlot. There is no application DOM,
event or fetch code. `base` and `height` feed both the literal local expression
`base * height / 2` and the `@endpoint` `triangle_area()` Python method. Its
executed Python file is the source shown by the framework.

`main` deliberately waits briefly so the browser test can observe the initialized
Application and services before content readiness. The `contentPane` below the
results calls the `@source` `server_note()` method and mounts its Python-built
fragment in place. Changing `base` replaces that owned branch.

The call uses `_delay=1` to coalesce nearby parameter changes before transport.
Once this RPC is running, additional activations produce busy feedback without
sending or queuing another request. Its existing response still writes the captured
calculation; another input change after completion can request a new calculation.
This example intentionally leaves editing available to expose that behavior; authors
can choose `_lockScreen=True` when interaction should wait for completion.

The example requires the FastAPI page host. A standalone application may use a
configured service server, but mounting this Source without one fails immediately
because Python services cannot be installed by browser files.
