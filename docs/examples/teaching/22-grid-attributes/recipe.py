from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('rows.ada', None, name='Ada', amount=1234.567)
        root.data('rows.grace', None, name='Grace', amount=98.765)
        grid = root.quickGrid(value='^rows', datamode='attr', height='180px')
        grid.column('name', name='Name', width=140)
        grid.column('amount', name='Amount', dtype='N', places=2, width=140)
