# Vue Hello World

App.vue contains only the Hello World heading and div. Rosetta navigation and source
links live in backend/templates/frame.html, outside Vue. Vite serves the built
example at /examples/vue/hello-world/ through the shared FastAPI server.

Run npm ci and npm run build in frontends/vue, then scripts/run.sh from the repo.
For local Vite development, /shared is proxied to port 8026. The original order
implementation is preserved under standby/orders/frontends/vue.
