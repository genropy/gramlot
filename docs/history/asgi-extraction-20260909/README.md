# ASGI integration extraction — 2026-09-09

Preserved source and tests for a future application repository combining Gramlot
and Genro ASGI. This is an archive, not an importable Gramlot integration or an
optional extra. Files retain their original imports as provenance; the receiving
repository must select its namespace and update imports, entry points and assets.
The manifest records exact byte hashes before extraction. No integration behavior
is claimed verified at this archive path. Core widget and inspector checks were
retained in Gramlot without a server; ASGI lifecycle/WSX tests travel here.

Includes Python application/routes/worker/configuration, startup document, browser
RPC/WSX/bootstrap and related test coverage. The old CLI and mixed tests are also
copied before being split. Shared recipe/widget/runtime code stays in Gramlot.
These files are outside src and js runtime paths and excluded from distributions.
No new repository name, publication or operational application is selected here.
