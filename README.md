# Gramlot

<img src="https://raw.githubusercontent.com/genropy/gramlot/main/assets/gramlot-logo.png" alt="Gramlot logo" width="240">

**GRAMmar for Live Object Trees**

Gramlot is a declarative web UI framework where interfaces are described in Python as Live Object Trees.

An independent project built on the experience and technology developed in Genro.

https://gramlot.com

[Project context and decisions](https://github.com/genropy/gramlot/blob/main/docs/context/README.md)

Alpha candidate `0.1.0a1` is being prepared; it is not yet published.
[Build and release status](https://github.com/genropy/gramlot/blob/main/docs/release.md).

[GramlotBuilder API and verified public dependency baseline](docs/context/gramlot-builder.md). Python recipes use `builder.root`; serialize `builder.source` with `gramlot.transport.to_tytx`.

Gramlot has no ASGI dependency or extra. Application hosting belongs to separate consumers; `gramlot manual --directory PATH` only serves HTML documentation. See [the server boundary](docs/context/decisions.md#server-independence--owner-decision-2026-09-09).
