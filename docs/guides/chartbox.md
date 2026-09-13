# chartBox

chartBox provides categorical bars and pie charts over a resident Data Bag.
It is available for ordinary application use within the limits below.
Application authoring is Python; rendering uses locally packaged D3 modules.

```python
from genro_bag import Bag

root.data('rows', Bag(dict(
    north=Bag(dict(area='North', sales=120)),
    south=Bag(dict(area='South', sales=90)),
)))
root.data('chart_structure', Bag(dict(
    title='Sales', chartType='bar', captionField='area', valueField='sales',
    color='#4285b4', showValues=True,
)))
root.data('selected', None)
grid = root.quickGrid(value='^rows', selectedKey='^selected')
grid.column('area', name='Area', edit=True)
grid.column('sales', name='Sales', dtype='N', edit=True)
root.chartBox(store='^rows', structpath='chart_structure', selectedKey='^selected',
              fields='area:Area,sales:Sales')
```

The data Bag owns record values. The structure Bag owns presentation; changing
`chartType` to `pie` switches the existing chart. The gear opens a palette bound
to the structure, with no Apply step. `fields` supplies optional field choices;
without it, the palette accepts field names as text.

Grid and chart share selection by stable record key (node label by default).
Cell confirmation writes to the data Bag, updating either chart; a draft or
Escape leaves the chart unchanged. Grid row clicks and chart clicks/keyboard
activation update the same selected-key path.

Supported structure fields: `title`, `chartType` (`bar` or `pie`), `captionField`,
`valueField`, `color` (bars only), `showValues`. Each record contributes one
numeric value. Pie colours are stable by record key. Pie values must be
nonnegative; zero/null values have no slice but remain selectable in the legend.
Bars support negative numbers. Nulls have no bar. Numeric projection does not
mutate the original typed data.

This initial version has grouped bar series, resident Bag/attribute records, live structure
and data replacement, and selection highlighting. It does not yet provide
aggregation/binning, named remote stores, multiple axes, zoom or saved
configurations. Dense charts and long legends have limited layout support.

See the [editable-grid example and verification](../examples/chartbox/README.md).
The common FastAPI example host includes it at `/charts/chart/`.


## Multiple bar series

Set `datasetFields` in the structure Bag to comma-separated numeric field names,
for example `revenue,cost`. The Bar series popup uses checkBoxText and writes this
selection directly. Pass `datasetOptions='cost:Cost,revenue:Revenue'` to chartBox
to offer only numeric fields. Optional `seriesLabels` is a Bag mapping field names
to legend captions. Bars share a value axis and are grouped by record; selecting
any bar highlights every series for that record and the corresponding grid row.
An empty explicit selection shows a message. Older structures without
`datasetFields` continue to use `valueField` for a single bar series.

The pie continues to use `valueField` (Pie value field in the palette), independently
of the bar selection. Switching chart type preserves both settings. Single bars
use `color`; multiple series use field-based colours and a legend. Stacking and
multiple axes remain unsupported.
