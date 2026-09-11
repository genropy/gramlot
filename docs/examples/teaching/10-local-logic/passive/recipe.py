from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.numberTextBox(value="^quantity", lbl="Quantity", updateOn="input")
        root.numberTextBox(value="^price", lbl="Price", updateOn="input")
        root.dataFormula("total", "quantity * price", quantity="^quantity", price="=price")
        root.p("^total")
