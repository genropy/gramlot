from gramlot.page import WebPage


class Page(WebPage):
    def main(self, root):
        root.script(self.panel_script())
        controls = root.div(class_="contact-controls")
        controls.horizontalSlider(value="^visibleContacts", default=0,
                                  minimum=0, maximum=10, discreteValues=11,
                                  updateOn="input", lbl="Visible contacts")
        controls.button("Generate contacts",
                        action="window.contactData.populate(this, genro.data.constructor)")
        cards = root.formlet(col_min_width="280px", gap="12px", class_="contact-cards")
        cards.dataController("""
const length = contacts ? contacts.length : 0;
if (_reason === 'child') return;
const sliderChanged = _triggerpars.kw.node.label === 'visibleContacts';
const count = sliderChanged ? Math.min(visible, length) : length;
const cards = wrapSource(this.parentNode);
const existing = this.parentBag.getNodes().filter(node => node !== this);
existing.slice(count).forEach(node => cards.value.pop(node.label));
if (contacts) contacts.getNodes().slice(0, count).forEach((contact, index) => {
    if (index >= existing.length) window.contactPanel(cards, contact.label, index);
});
""", contacts="^contacts", visible="^visibleContacts")

    def panel_script(self):
        return r"""
window.contactPanel = function(cards, key, index) {
    const card = cards.labledBox({datapath: `contacts.${key}`,
        label: `Contact ${index + 1}`, label_position: 'TC', class: 'contact-card',
        box_border: '1px solid #3564a4', box_border_radius: '8px',
        box_background: 'white', box_gap: '0',
        label_background: '#3564a4', label_color: 'white',
        label_padding: '8px', label_border_radius: '7px 7px 0 0'});
    const pane = card.formlet({columns: 2, gap: '8px', padding: '10px'});
    pane.textBox({value: '^.surname', lbl: 'Surname'});
    pane.textBox({value: '^.name', lbl: 'Name'});
    pane.textBox({value: '^.address', lbl: 'Address', grid_column: 'span 2'});
    pane.textBox({value: '^.phone', lbl: 'Phone'});
    pane.textBox({value: '^.email', lbl: 'Email'});
};
"""
