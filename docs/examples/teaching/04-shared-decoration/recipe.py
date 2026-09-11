from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.textBox(value="Ada", lbl="Name", lbl_color="#344563",
                     box_padding="4px")
        root.numberTextBox(value=3, lbl="Seats", lbl_color="#344563",
                           box_padding="4px")
        root.checkbox(checked=True, lbl="Newsletter", lbl_color="#344563",
                      box_padding="4px")
