from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.numberTextBox(value="^quantity", lbl="Quantity", live=True)
        root.numberTextBox(value="^price", lbl="Price", live=True)
        root.dataFormula("total", "quantity * price", quantity="^quantity", price="=price")
        root.p("^total")
