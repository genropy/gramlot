"""A bounded remote Source experiment; no database dependency."""

from gramlot.page import WebPage, source


class Page(WebPage):
    title = 'Remote Source'
    example_view = True

    def main(self, root):
        root.data('choice', 'contact')
        root.data('fragment.draft', 'Edit me, then change the fragment')
        root.h1('Remote Source')
        root.p('Python rebuilds the fragment; its bound Data survives replacement.')
        root.filteringSelect(value='^choice', lbl='Fragment', id='fragment-choice',
                             values='contact:Contact,notes:Notes,error:Server error')
        pane = root.contentPane(datapath='fragment')
        pane.p('Static sibling: I stay when the remote fragment changes.', id='remote-static')
        pane.p('^.status', mask='Request: %s', id='remote-status')
        pane.remote(self.fragment, choice='^choice', _delay=1,
                    _onCalling='this.SET(".status", "loading");',
                    _onResult='this.SET(".status", "ready");',
                    _onError='this.SET(".status", error.message);')

    @source
    def fragment(self, root, choice: str):
        if choice == 'error':
            raise ValueError('Intentional example error: the previous fragment stays.')
        if choice not in ('contact', 'notes'):
            raise ValueError('Unknown fragment')
        card = root.div(id='remote-fragment', padding='12px', margin_top='12px',
                        border='1px solid #d8dee9', border_radius='5px')
        card.h2('Contact' if choice == 'contact' else 'Notes', id='fragment-heading')
        card.p(f'Built on the server for choice={choice}.')
        card.textBox(value='^.draft', lbl='Shared draft', live=True, id='fragment-input')
        card.p('^.draft', mask='Data: %s', id='remote-draft')
