from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.data('rows.ada.name', 'Ada')
        root.data('rows.grace.name', 'Grace')
        grid = root.quickGrid(value='^rows', selectedKey='^selected', height='180px')
        grid.column('name', name='Name', width=180)
        root.p('^selected', mask='Selected key: %s')
