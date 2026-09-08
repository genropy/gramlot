# Pages Hello World

frontends/pages/recipe.py contains only HelloWorldPage, using the existing WebPage
contract and HtmlBuilder. main() emits the title and div; it needs no helper methods
because it has only two statements. Documented composition remains mandatory when
future examples have meaningful complexity.

The common Rosetta HTML frame is outside the recipe. It embeds the example at
/examples/pages/hello-world/. app.js only retrieves the TYTX recipe and mounts the
existing DOM runtime; it has no order controller or business requests. The host and
browser module adapter remain separately visible in View source and in the metrics.

Run scripts/run.sh with the local dependency paths from scripts/environment.sh.
Pages/Builders sources and the captured DOM tree are still required; the isolated
Python environment deliberately has no genro-asgi. The intended reusable adapter
should ultimately ship with Pages, rather than remain app-specific glue here.

The old order recipe/controller/host are preserved under standby/orders.
