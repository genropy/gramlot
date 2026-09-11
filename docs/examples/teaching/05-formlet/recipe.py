from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        fields = root.formlet(columns=2, gap="12px", lbl_position="L",
                              lbl_color="#344563", box_padding="4px",
                              box_margin_bottom="8px")
        fields.textBox(value="Ada", lbl="Name")
        fields.numberTextBox(value=3, lbl="Seats")
        fields.dateTextBox(value="2026-09-10", lbl="Date")
        fields.filteringSelect(value="it", values="it:Italy,fr:France", lbl="Country")
        fields.checkbox(checked=True, lbl="Updates", lbl_position="R",
                        lbl_color="#8a3f68")
