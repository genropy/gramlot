import asyncio
from decimal import Decimal

from genro_toolbox import metadata
from gramlot.page import WebPage, endpoint, source


@metadata(title='Triangle area · local and Python')
class Page(WebPage):
    example_view = True

    @endpoint
    def triangle_area(self, base: Decimal, height: Decimal) -> Decimal:
        return base * height / Decimal('2')

    @source
    def server_note(self, root, base: Decimal) -> None:
        root.p(f'This fragment was built in Python for base {base}.', id='remote-note')

    async def main(self, root):
        await asyncio.sleep(0.15)
        root.data('base', Decimal('3'))
        root.data('height', Decimal('4'))
        root.data('rpc_state', 'calling')

        root.css('.triangle-results', 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px')
        root.css('.triangle-card', 'padding:12px;border:1px solid #d8dee9;border-radius:6px')
        root.css('@media (max-width: 560px)', '.triangle-results{grid-template-columns:1fr}')

        root.h1('Triangle area')
        root.p('The same typed inputs feed a browser formula and an exposed Python method.')
        inputs = root.formlet(columns=2, gap='12px')
        inputs.numberTextBox(value='^base', dtype='N', lbl='Base', live=True, min=0)
        inputs.numberTextBox(value='^height', dtype='N', lbl='Height', live=True, min=0)

        root.dataFormula(
            'local_area', 'base * height / 2',
            base='^base', height='^height', _on_start=True,
        )
        root.dataRpc(
            'python_area', self.triangle_area,
            base='^base', height='^height', _on_start=True,
            _delay=1,
            _onCalling='this.SET("rpc_state", "calling");',
            _onResult='this.SET("rpc_state", "ready");',
            _onError='this.SET("rpc_state", "error: " + error.message);',
        )

        results = root.div(class_='triangle-results', margin_top='18px')
        local = results.div(class_='triangle-card')
        local.h2('Local dataFormula')
        local.p('^local_area', id='local-result', mask='Area: %s')
        remote = results.div(class_='triangle-card')
        remote.h2('Python dataRpc')
        remote.p('^python_area', id='python-result', mask='Area: %s')
        remote.p('^rpc_state', id='rpc-state', mask='RPC state: %s')

        note = root.contentPane(datapath='remote_note')
        note.remote(self.server_note, base='^base')
