# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Python-authored chart toolbar and live structure palette."""


class ChartAuthoring:
    def chartBox(self, *, store, structpath, selectedKey=None, fields=None, datasetOptions=None,
                 datamode='bag', identifier=None, height='300px', **attrs):
        """Compose a chart and a palette bound to its authoritative structure Bag.

        fields is an optional filteringSelect values declaration (code:caption).
        datasetOptions supplies the numeric choices for grouped bars; no binning.
        """
        if not isinstance(structpath, str) or not structpath:
            raise ValueError('chartBox requires a structure Data path')
        box = self.div(**attrs)
        serial = getattr(self.builder, '_chart_serial', 0) + 1
        self.builder._chart_serial = serial
        # Resolve against the container, before entering the palette's data scope.
        path = box.node.abs_datapath(structpath.lstrip('^='))
        opened = f'__chart_state.chart_{serial}.opened'
        box.data(opened, False)
        bar = box.div(style='display:flex;align-items:center;gap:8px;padding:6px 10px;background:#eef1f4;border:1px solid #c9d1d9')
        bar.span('^' + path + '.title', style='flex:1;font-weight:600')
        bar.button('⚙', title='Configure chart', **{'aria-label': 'Configure chart'},
                   action=f"this.setRelativeData('{opened}', true);", style='font-size:18px;cursor:pointer')
        box.chart(store=store, structpath=structpath, selectedKey=selectedKey,
                  datamode=datamode, identifier=identifier, style=f'height:{height}')
        palette = box.palette(title='Chart structure', value='^' + opened,
                              keyboard=True, style='width:340px;height:510px', datapath=path)
        form = palette.div(style='display:flex;flex-direction:column;gap:12px')
        form.textBox(value='^.title', lbl='Title')
        form.filteringSelect(value='^.chartType', values='bar:Bars,pie:Pie', lbl='Chart type')
        for field, label in (('captionField', 'Category field'), ('valueField', 'Pie value field')):
            if fields:
                form.filteringSelect(value='^.' + field, values=fields, lbl=label)
            else:
                form.textBox(value='^.' + field, lbl=label)
        form.checkBoxText(value='^.datasetFields', values=datasetOptions or fields or '',
                          popup=True, cols=1, lbl='Bar series')
        form.textBox(value='^.color', lbl='Bar colour')
        form.checkBox(value='^.showValues', lbl='Show values')
        form.div('Changes apply immediately.', style='font-size:12px;color:#64748b')
        return box
