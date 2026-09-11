from gramlot.builder import GramlotBuilder


class PriceRecipe(GramlotBuilder):
    def main(self, root):
        card = root.div(datapath='order')
        card.dataSetter('.quantity', 2)
        card.dataSetter('.price', 5)
        card.dataFormula(
            '.total', 'quantity * price',
            quantity='^.quantity', price='=.price', _on_start=True,
        )
        card.dataController(
            'sourceNode.SET(".summary", `Total: ${total}`)',
            total='^.total', _on_start=True,
        )
        card.span('==quantity * price', quantity='^.quantity', price='=.price')
        card.p('^.summary')
