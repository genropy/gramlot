# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
from genro_bag import Bag
from genro_toolbox import metadata
from gramlot.page import WebPage


@metadata(title='Grid and chartBox')
class Page(WebPage):
    example_view = True

    def main(self, root):
        rows = Bag()
        for key, month, revenue, cost in (
            ('jan', 'January', 120, 75), ('feb', 'February', 160, 90),
            ('mar', 'March', 135, 80), ('apr', 'April', 210, 125),
            ('may', 'May', 185, 110), ('jun', 'June', 240, 140),
        ):
            rows.set_item(key, Bag(dict(month=month, revenue=revenue, cost=cost)))
        root.data('rows', rows)
        root.data('selection', 'jan')
        root.data('structure', Bag(dict(title='Monthly revenue', chartType='bar', captionField='month',
                                       valueField='revenue', datasetFields='revenue',
                                       seriesLabels=Bag(dict(revenue='Revenue',cost='Cost')), color='#4285b4', showValues=True)))
        root.h2('One Bag, two views')
        root.p('Select a row or bar. Double-click a cell to edit; Enter confirms and Escape cancels. Both views update on confirmation. The gear configures the chart structure.')
        views = root.div(style='display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px')
        grid = views.quickGrid(value='^rows', selectedKey='^selection', height='340px')
        grid.column('month', name='Month', width=120, edit=True)
        grid.column('revenue', name='Revenue', dtype='N', width=100, edit=True)
        grid.column('cost', name='Cost', dtype='N', width=100, edit=True)
        views.chartBox(store='^rows', structpath='structure', selectedKey='^selection',
                       fields='month:Month,revenue:Revenue,cost:Cost',
                       datasetOptions='cost:Cost,revenue:Revenue')
        actions = root.div(style='display:flex;gap:8px;margin-top:12px')
        actions.button('Add July', action="this.setRelativeData('rows.jul.month', 'July'); this.setRelativeData('rows.jul.revenue', 195); this.setRelativeData('rows.jul.cost', 100);")
        actions.button('Remove July', action="this.getRelativeData('rows').popNode('jul');")
