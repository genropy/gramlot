# Gramlot Site alignment check

Read-only verification of the sibling `gramlot-site` working tree after the
example-navigation and customer dbSelect consolidation. Its existing local
changes were preserved; no site commit, build, publication or migration was made.

- `requirements.txt` pins `gramlot==0.1.0a1`; Docker installs a local wheel with
  the same version. `dist/build-info.json` identifies that local-wheel version,
  hash `90a1558181efb9bb0f2555659263fe8a97696462afa26f3b046bc09b3ef85e7d`.
- `server.py` creates a Genro ASGI BaseServer, not a FastAPI application.
  Uvicorn is the ASGI runner; its presence does not mean FastAPI is used.
- `deploy/requirements.in` requires `genro-asgi==0.46.0` and Starlette.
- The host serves static files and rejects POST. It does not mount the new
  Gramlot Page/RPC services or the customer database example.
- The public workflow still publishes/deploys from main. The local release-policy
  document proposes tags; it has not replaced the workflow's actual behavior.
- Two existing server tests passed using the available Python 3.12 environment,
  with bytecode/cache writes disabled in the consumer repository. This validates
  the current host only, not a FastAPI migration or updated browser runtime.
- Public homepage/health verification was unavailable through the web tool;
  no conclusion about the currently deployed public revision is asserted.

Required follow-up: migrate the site's host to FastAPI, install an identifiable
updated framework artifact for local preview, port examples to the common
presentation and Page services, and run browser/container checks. Preserve the
published dependency pin until an explicit release decision. The database demo
requires an explicitly configured server DB; it cannot be copied as a standalone
page. Site changes must preserve its existing dirty work. No deployment is implied.
