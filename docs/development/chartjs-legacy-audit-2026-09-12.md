# Legacy Chart.js wrapper audit

Date: 2026-09-12. Static source inspection; no browser execution or migration.
Legacy checkout: `/Users/gporcari/Sviluppo/Genropy/genropy`, HEAD `418b4454a6`.
References describe the working files inspected, not a clean-commit certification.

## Layers and authoring

- `gnrjs/gnr_d11/js/genro_extra.js:246–536`: `gnr.widgets.chartjs`, a
  `baseHtml` canvas wrapper which loads Chart.js on demand and exposes the instance
  as `sourceNode.externalWidget`.
- `resources/common/js_plugins/chartjs/chartjs.js:382–964`: `ChartPane`, a
  composite widget with workspace Bags, dataset discovery, configuration and
  optional saved user objects.
- The same file, lines 965–986: `PaletteChart`, a lazy floating/dockable container
  around ChartPane.
- `resources/common/js_plugins/chartjs/chartjs.py`: Python component resources
  and ChartManager grid toolbar/menu integration.
- `gnrpy/gnr/web/gnrwebstruct/base.py:326–332`: Python chartpane/palettechart
  helpers mix in the resource component and emit Source children.
- `projects/gnrcore/packages/test15/webpages/chart/chartjs.py`: executable example
  declarations. The widget catalog stubs are not the implementation contract.

Representative existing Python declaration (from `test_9_chartPane`, shortened):

```python
bc.chartPane(
    value='^.testData',
    region='center',
    captionField='nome',
    datasetFields='peso,altezza',
    chartType='bar',
    configurator=dict(palette='myconfigurator', userObject=False),
    datamode='bag',
)
```

The examples also use `chartPane(connectedTo=th.view.grid, configurator=True, ...)`
and `paletteChart(connectedTo=th.view.grid, dockButton=True, ...)`.
The low-level `pane.chartjs(chartType='line', data={...}, options={...})` accepts
Chart.js-shaped labels/datasets and options directly.

## Data contract

The low-level wrapper accepts either direct `data` or a `storepath` plus
`captionField` and a `datasets` Bag. Direct data takes precedence. In store mode,
`datamode='bag'` reads fields from row Bags; default `attr` reads node attributes.
Each dataset definition contains `field`, `enabled`, optional `chartType` and a
`parameters` Bag. ChartPane constructs these from comma-separated `datasetFields`.
Labels are collected from the first enabled dataset's accepted rows.

`filter` may be a comma-separated key list, an array or a function `(pkey, row)`.
An empty list means all rows. Key lookup uses `row._pkey || node.label` (including
its falsy-key limitation). Row `chart_*` fields provide per-point presentation
parameters; `'*'` colour settings request generated colours based on captions.

ChartPane's `connectedTo` discovers the source store and datamode. For grids it
subscribes to `onSelectedRow` and places `selectedPkeys` in its filter path. This
is grid-selection-to-chart filtering, not a verified bidirectional selection API.
The tree branch only logs selection. Available fields/captions are discovered
from grid structure when available, with fallback inspection of data.

## Reactivity and interactions

Store, datasets, filter and caption changes call `gnr_updateChart`, coalesced with
a keyed delayed call. It reconstructs chart data, then calls `update()` and
`resize()`. This is whole projection reconstruction, not a point-patch protocol.
Changing chartType rebuilds the Source node.

`optionsBag` and `scalesBag` apply nested option changes to the Chart.js instance;
user changes are marked `_userChanges`. `onClick` is compiled with arguments
`event,elements` and SourceNode context. `chartReady` is published at construction;
`refresh` rebuilds the chart and `addAxis` creates a missing axis requested by a
dataset. No explicit `gnr_data` update handler appears in this wrapper, so direct
data replacement reactivity should not be assumed from the initial-data example.

## Configuration and persistence

ChartPane keeps chartType, captionField, datasetFields, datasets, options and scales
under `#WORKSPACE`. The configurator may be a side panel or palette. It exposes
chart type, caption field, dataset selection and tabs for datasets, scales and
options; a Bag inspector gives access to full options.

Declared type choices are bar, line, bubble, pie, doughnut, polarArea, radar and
scatter. Presence in this list is not runtime verification for every data shape.

Save/load uses `adm.userobject`, object type `chartjs`, with page/widget flags.
Save copies workspace state, removes metadata/filter/options/loadMenu, and records
changed option paths separately. It does not establish a universal data-free chart
recipe: a literal-data workspace can contain a `store` branch. Persistence and
menus depend on legacy application services; `userObject=False` disables the
configurator's persistence controls.

## Migration findings

The inspected bundled `resources/js_libs/Chart.js` identifies itself as **3.7.0**,
while wrapper/configurator code uses older-shaped conventions including
`defaults.global`, `xAxes`/`yAxes` arrays and `scaleLabel`. Treat compatibility as an
unresolved audit finding; no claim that these examples currently run correctly.

The wrapper connects `_onDeleting`, but its resize cleanup and `destroy()` calls
are commented out. This is a visible cleanup gap in this wrapper; broader runtime
cleanup has not been audited. Library loading and colour-helper readiness also
need an explicit shared resource lifecycle in any replacement.

For Gramlot, preserve the useful separation between renderer, Bag-to-series
projection and optional configurator; Python declarations; declarative datasets;
and shared grid data. Define explicit selection identity, disposal and update
semantics before porting. Do not mechanically copy legacy Chart.js option grammar,
Dojo/global infrastructure or application-specific persistence.

Python authoring is already present in the legacy, but rendering in this wrapper
is browser Chart.js. No Python image/SVG rendering backend was found in these
inspected chart components; a broader legacy graphics inventory is separate.
No new `pane.chart` API, renderer choice or implementation is approved here.

## Owner clarification and renderer assessment

The owner subsequently clarified the invariant: **both data and chart structure
live in Bags; changing either automatically updates the presentation**, analogous
to the grid's data/structure contract. Chart.js is a candidate renderer, not the
architectural requirement. Assess alternatives and licences before choosing.

Official sources consulted on 2026-09-12:

| Candidate | Project licence | Update mechanism | Assessment for this contract |
| --- | --- | --- | --- |
| Chart.js | [MIT](https://github.com/chartjs/Chart.js/blob/master/LICENSE.md) | Mutate/replace data/options and call [update](https://www.chartjs.org/docs/latest/developers/updates.html) | Direct continuation of the legacy; good initial candidate for conventional charts. |
| Apache ECharts | [Apache-2.0, with listed third-party notices](https://github.com/apache/echarts/blob/master/LICENSE) | [setOption](https://echarts.apache.org/handbook/en/how-to/data/dynamic-data/) | Strong candidate: separate dataset and series/axis mappings align with the owner's data/structure distinction. |
| Plotly.js | [MIT](https://github.com/plotly/plotly.js/blob/main/LICENSE) | [react, restyle, relayout](https://plotly.com/javascript/plotlyjs-function-reference/) | Particularly relevant when accepting figures authored with the Python Plotly library. |
| Vega | [BSD-3-Clause](https://github.com/vega/vega/blob/main/LICENSE) | [View changesets, signals and runAsync](https://vega.github.io/vega/docs/api/view/) | Expressive declarative grammar, but integration must reconcile its own dataflow with Bag ownership. |

These permissive licences allow integration into an Apache-2.0 project with their
required notices retained; this is not a dependency-by-dependency distribution
audit. The [ASF policy](https://www.apache.org/legal/resolved.html#category-a)
lists MIT and BSD-3-Clause as acceptable. Plugins, extensions and packaged assets
need review for the actual selected build. No measured bundle-size, performance
or current maintenance ranking was established by this comparison.

ECharts explicitly separates [dataset and visual mappings](https://echarts.apache.org/handbook/en/concepts/dataset/)
and supports [Canvas or SVG](https://echarts.apache.org/handbook/en/best-practices/canvas-vs-svg/).
Its [event/action API](https://echarts.apache.org/handbook/en/concepts/event/)
provides integration points for interactions. These are reasons to test it against
Chart.js, not evidence that a Gramlot adapter already exists or is faster.

Python-generated content need not be a static image: Plotly Python figures
[serialize to a figure specification consumed by Plotly.js](https://plotly.com/python/creating-and-updating-figures/).
A future adapter could ingest that specification into the Bag-owned contract.
Transport of Python-specific/array values and subsequent Bag updates still need
explicit handling. Static Python image/SVG output remains a separate capability.

### Proposed shared adapter responsibilities

- Observe both Bags, including nested value/attribute changes, insertion, deletion,
  ordering and replacement of their roots; coalesce related changes for rendering.
- Translate data and structure to renderer inputs without giving the renderer
  mutable ownership of the canonical Bags.
- Preserve stable series/axis/record identities; distinguish a removed series
  from a partial configuration update. Test renderer merge/replacement semantics.
- Write declared interactions back to Bag state, avoiding feedback loops. Define
  preservation of zoom, legend visibility and selection when data changes.
- Own resource loading, resize observation, disposal and callback cleanup.

An indicative shape is `pane.chart(store='^rows', structpath='chart_struct')`,
but names and structure schema are proposals. Sharing the Bag lifecycle does not
require pretending every renderer has identical chart features.

Recommendation: compare Chart.js and ECharts on the same bounded Bag-driven
example before choosing a default. Exercise cell edits, added/deleted series,
axis changes, type changes, selection, resizing and disposal; measure the actual
production bundle and update latency. Keep Plotly as a candidate if importing
Python-authored figures becomes a concrete requirement. This is assessment only;
no experiment or multi-renderer implementation has been started.
