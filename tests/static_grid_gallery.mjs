// Compare the generated Python and JavaScript grid recipes at their Data boundary.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {setupDom} from '../../gramlot-dom/tests/dom.js';
import {Application} from 'gramlot-dom';
import {fromTytx, isDecimal} from 'genro-tytx';

setupDom();
const {GramlotBuilder} = await import('../js/pages/src/builder.js');

const [pythonRecipe, javascriptRecipe] = process.argv.slice(2);
assert.ok(pythonRecipe && javascriptRecipe, 'Python TYTX and JavaScript recipe paths are required');

const pythonBuilder = new GramlotBuilder('example');
pythonBuilder.loadSource(fromTytx(readFileSync(pythonRecipe, 'utf8'), 'json'));
const {build} = await import(pathToFileURL(javascriptRecipe));
class JavaScriptGridBuilder extends GramlotBuilder {
    main(root) { build(root); }
}

const hosts = [document.createElement('div'), document.createElement('div')];
hosts.forEach(host => document.body.append(host));
const applications = [
    new Application(hosts[0], pythonBuilder, {inspector:false}),
    new Application(hosts[1], new JavaScriptGridBuilder('example'), {inspector:false}),
];

const [pythonData, javascriptData] = applications.map(application => application.data);
const dateText = value => value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value);

assert.equal(pythonData.getItem('example.rows').getNodes().length, 50);
assert.equal(javascriptData.getItem('example.rows').getNodes().length, 50);
assert.equal(dateText(pythonData.getItem('example.rows.r001.joined')), '2025-02-02');
assert.equal(dateText(javascriptData.getItem('example.rows.r001.joined')), '2025-02-02');
assert.ok(isDecimal(pythonData.getItem('example.rows.r001.amount')));
assert.equal(pythonData.getItem('example.rows.r001.amount').toString(), '1.25');
assert.equal(javascriptData.getItem('example.rows.r001.amount'), 1.25);
assert.equal(pythonData.getItem('example.rows.r011.name'), '');
assert.equal(javascriptData.getItem('example.rows.r011.name'), '');
assert.equal(pythonData.getItem('example.rows.r013.joined'), null);
assert.equal(javascriptData.getItem('example.rows.r013.joined'), null);
assert.equal(pythonData.getItem('example.rows.r017.amount'), null);
assert.equal(javascriptData.getItem('example.rows.r017.amount'), null);
assert.equal(pythonData.getItem('example.selected'), 'r007');
assert.equal(javascriptData.getItem('example.selected'), 'r007');
for (const [index, app] of applications.entries()) {
    const grid = hosts[index].querySelector('gnr-grid');
    assert.equal(grid.structbag(), app.data.getItem('example.struct'));
    hosts[index].querySelectorAll('button')[2].click();
    assert.equal(grid.columns[2].field, 'joined');
    assert.equal(app.data.getItem('example.struct.view_0.rows_0').getNodes()[2].attr.field, 'joined');
}

applications.forEach(application => application.dispose());
hosts.forEach(host => host.remove());
console.log('Python and JavaScript static-grid gallery data agree');

const [attrPython, attrJavascript] = process.argv.slice(4);
if (attrPython && attrJavascript) {
    const python = new GramlotBuilder('example');
    python.loadSource(fromTytx(readFileSync(attrPython, 'utf8'), 'json'));
    const {build:buildAttributes} = await import(pathToFileURL(attrJavascript));
    class AttributePage extends GramlotBuilder {main(root) {buildAttributes(root);}}
    for (const builder of [python, new AttributePage('example')]) {
        const host = document.body.appendChild(document.createElement('div'));
        const app = new Application(host, builder, {inspector:false});
        const grid = host.querySelector('gnr-grid');
        assert.equal(grid.datamode, 'attr');
        assert.equal(grid.collectionStore().len(), 5000);
        assert.ok(grid.shadowRoot.querySelectorAll('.row').length < 30, 'large dataset keeps a bounded viewport');
        assert.equal(app.data.getItem('example.rows').getNode('r5000').getAttr('row_number'), 5000);
        const node = app.data.getItem('example.rows').getNode('r012');
        assert.equal(node.getValue(), null);
        assert.equal(node.getAttr('row_number'), 12);
        assert.equal(dateText(node.getAttr('joined')), '2024-01-13');
        assert.equal(String(node.getAttr('adjusted')), '18');
        host.querySelectorAll('button')[1].click();
        assert.equal(node.getAttr('amount'), 9999.99);
        assert.equal(String(node.getAttr('adjusted')), '11999.988');
        assert.ok(grid.shadowRoot.textContent.includes('9,999.99'));
        host.querySelectorAll('button')[2].click();
        assert.equal(grid.columns[2].field, 'joined');
        app.dispose(); host.remove();
    }
    console.log('Attribute-backed Python and JavaScript grids agree');
}

const [formulaPython, formulaJavascript] = process.argv.slice(6);
if (formulaPython && formulaJavascript) {
    const python = new GramlotBuilder('example');
    python.loadSource(fromTytx(readFileSync(formulaPython, 'utf8'), 'json'));
    const {build:buildFormula} = await import(pathToFileURL(formulaJavascript));
    class FormulaPage extends GramlotBuilder {main(root) {buildFormula(root);}}
    for (const [index, builder] of [python, new FormulaPage('example')].entries()) {
        const host = document.body.appendChild(document.createElement('div'));
        const app = new Application(host, builder, {inspector:false});
        const data = app.data;
        const total = data.getItem('example.rows.r001.total');
        if (index === 0) assert.ok(isDecimal(total));
        assert.equal(String(total), '3051.83');
        assert.equal(String(data.getItem('example.rows.r002.running')), '4590.86');
        assert.equal(data.getItem('example.rows.r001.position'), 0);
        host.querySelector('button').click();
        assert.equal(String(data.getItem('example.rows.r002.total')), '2052.04');
        app.live(() => data.setItem('example.vat_rate', 10));
        assert.equal(String(data.getItem('example.rows.r003.total')), '98.89');
        assert.equal(host.querySelector('gnr-grid').collectionStore().getValue(
            data.getItem('example.rows').getNode('r003'), 'total').toString(), '98.89');
        app.dispose(); host.remove();
    }
    console.log('Calculated Python and JavaScript grid structures agree');
}
