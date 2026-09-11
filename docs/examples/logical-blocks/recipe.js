import {HtmlBuilder} from 'gramlot-dom';

export class PriceRecipe extends HtmlBuilder {
    main(root) {
        const card = root.div({datapath: 'order'});
        card.dataSetter({destination: '.quantity', value: 2});
        card.dataSetter({destination: '.price', value: 5});
        card.dataFormula({
            destination: '.total', formula: 'quantity * price',
            quantity: '^.quantity', price: '=.price', _on_start: true,
        });
        card.dataController({
            func: 'sourceNode.SET(".summary", `Total: ${total}`)',
            total: '^.total', _on_start: true,
        });
        card.span('==quantity * price', {quantity: '^.quantity', price: '=.price'});
        card.p('^.summary');
    }
}
