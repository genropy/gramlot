"""A Python-authored OpenAPI explorer; browser behavior belongs to Gramlot."""
from genro_bag import Bag
from gramlot.grid import GridStruct
from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('schemaUrl', 'openapi.json')
        root.data('loadUrl', 'openapi.json')
        root.data('reload', 0)
        root.data('selection', '')
        root.data('send', 0)
        root.data('cancel', 0)
        root.data('authorization', '')
        root.data('sourceVisible', False)
        root.data('sourceFile', 'page.py')
        root.data('responseRows', Bag())
        struct = GridStruct()
        struct.view().rows()
        root.data('responseStruct', struct)

        root.openApiResolver('schema', url='=loadUrl', reload='^reload', status='schemaState')
        root.openApiClient()
        root.urlResolver('sourceCode', url='^sourceFile', responseType='text', status='sourceState')
        root.dataFormula('sourceWidth', "visible ? '44%' : '0px'", visible='^sourceVisible', _on_start=True)
        root.dataFormula('sourceDisplay', "visible ? 'block' : 'none'", visible='^sourceVisible', _on_start=True)
        root.dataFormula('resultDisplay',
                         "state === 'loading' || state === 'error' || status != null ? 'block' : 'none'",
                         state='^requestState.state', status='^response.status', _on_start=True)

        layout = root.borderContainer(height='100vh', class_='explorer')
        header = layout.contentPane(region='top', height='48px', class_='app-bar')
        header.strong('gramlot_api')
        header.span('Python OpenAPI explorer', class_='muted')
        header.button('Source', action="this.SET('sourceVisible', !this.GET('sourceVisible'));")

        navigation = layout.contentPane(region='left', width='245px', splitter=True,
                                        class_='navigation')
        navigation.h2('^apiTitle')
        navigation.textBox(value='^schemaUrl', lbl='OpenAPI JSON URL')
        navigation.button('Load schema', action="""
this.SET('loadUrl', this.GET('schemaUrl'));
this.SET('reload', this.GET('reload') + 1);
""")
        navigation.div('^schemaState.state', class_='muted')
        navigation.div('^schemaState.error', class_='error')
        navigation.passwordbox(value='^authorization', lbl='Authorization header')
        navigation.storeTree(store='^navigation', selectedPath='^selection', labelAttribute='caption')

        source = layout.contentPane(region='right', width='^sourceWidth', splitter=True,
                                    display='^sourceDisplay', min_width='0', overflow='auto')
        source.div('page.py · Python source', class_='muted')
        source.button('Close', action="this.SET('sourceVisible', false);")
        source.div('^sourceState.error', class_='error')
        source.codeMirror(value='^sourceCode', language='python', readonly=True,
                          lbl='Python source',
                          style='--code-editor-height:calc(100vh - 140px);--code-editor-font-size:13px;')

        content = layout.contentPane(region='center', class_='content', overflow='auto')
        content.openApiForm(class_='operation')
        content.div('^formError', class_='error')
        response = content.groupBox(title='Response', class_='response', display='^resultDisplay')
        response.div('^requestState.state', class_='muted')
        response.div('^requestState.error', class_='error')
        response.div('^responseSummary')
        response.button('Cancel', action="this.SET('cancel', this.GET('cancel') + 1);")
        tabs = response.tabContainer(height='250px')
        tabs.contentPane(title='Body', pageName='body').pre('^responseText')
        tabs.contentPane(title='Data Bag', pageName='bag').storeTree(store='^response.body')
        tabs.contentPane(title='Headers', pageName='headers').pre('^responseHeaders')
        tabs.contentPane(title='Table', pageName='table').grid(
            store='^responseRows', structpath='responseStruct', datamode='attr', height='210px')
