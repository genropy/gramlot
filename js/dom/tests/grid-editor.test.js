import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {createDecimal} from 'genro-tytx';
import {ValueSnapshot} from '../src/forms/value-snapshot.js';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/grid.js';
import '../src/collections/inputs.js';

function fixture(datamode='bag') {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['grid','inputs'];
        main(root) {
            const grid=root.quickGrid({value:'^rows',datamode});
            grid.column('name',{edit:true});
            grid.column('amount',{dtype:'L',edit:{validate_min:0}});
            root.p('^rows.r1.name');
        }
    }
    const builder=new Page('main');
    builder.setup=data=>{
        const rows=new Bag();
        if(datamode==='bag'){const row=new Bag();row.setItem('name','Original');row.setItem('amount',2);rows.setItem('r1',row);}
        else rows.setItem('r1',null,{name:'Original',amount:2});
        data.setItem('rows',rows);
    };
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,builder,{inspector:false});
    return {app,host,grid:host.querySelector('gnr-grid')};
}
for(const mode of ['bag','attr']) test(`Source cell editor preserves drafts across redraw and commits ${mode} rows`,async()=>{
    const {app,host,grid}=fixture(mode);
    grid.shadowRoot.querySelector('.cell').dispatchEvent(new window.MouseEvent('dblclick',{bubbles:true}));
    const editor=grid.gridEditor;
    assert.ok(editor.widget,'Source control mounted');
    const widget=editor.widget, input=widget.fieldControl||widget._input;
    input.value='Changed';input.dispatchEvent(new window.Event('input',{bubbles:true}));
    grid._renderRows();
    assert.equal(editor.widget,widget);
    assert.equal(input.value,'Changed');
    assert.equal(grid.collectionStore().getValue(grid.collectionStore().row('r1').node,'name'),'Original');
    assert.equal(await editor.confirm(),true);
    assert.equal(grid.collectionStore().getValue(grid.collectionStore().row('r1').node,'name'),'Changed');
    if(mode==='bag')assert.equal(host.querySelector('p').textContent,'Changed');
    await editor.open('r1',grid.columns[0].id);
    editor.widget.fieldControl.value='Discard';
    editor.close();
    assert.equal(grid.collectionStore().getValue(grid.collectionStore().row('r1').node,'name'),'Changed');
    app.dispose();host.remove();
});

test('invalid numbers stay open, external writes are not overwritten, and removal cancels safely',async()=>{
    const {app,host,grid}=fixture();
    grid.shadowRoot.querySelector('.cell').dispatchEvent(new window.MouseEvent('dblclick',{bubbles:true}));
    const editor=grid.gridEditor;editor.close();
    await editor.open('r1',grid.columns[1].id);
    const input=editor.widget.fieldControl;
    input.value='-2';input.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.equal(await editor.confirm(),false);
    assert.ok(editor.active);
    assert.ok(grid.shadowRoot.querySelector('.cell.invalidCell'));
    grid._renderRows();
    assert.ok(grid.shadowRoot.querySelector('.cell.invalidCell'), 'validation survives row recycling');
    assert.equal(grid.shadowRoot.querySelector('.cell.invalidCell').getAttribute('aria-invalid'),'true');
    input.value='4';input.dispatchEvent(new window.Event('input',{bubbles:true}));
    assert.equal(await editor.confirm(),true);
    assert.equal(grid.shadowRoot.querySelector('.cell.invalidCell'),null);
    await editor.open('r1',grid.columns[0].id);
    editor.widget.fieldControl.value='Stale draft';
    app.live(()=>grid.storeBag.setItem('r1.name','External'));
    assert.equal(await editor.confirm(),false);
    assert.equal(grid.storeBag.getItem('r1.name'),'External');
    app.live(()=>grid.storeBag.popNode('r1'));
    assert.equal(await editor.confirm(),false);
    assert.equal(editor.active,null);
    app.dispose();host.remove();
});


test('cell snapshots preserve Decimal identity and exact precision',()=>{
    const snapshot=new ValueSnapshot();
    const original=createDecimal('12345678901234567890.123456789');
    const copy=snapshot.copy(original);
    assert.equal(copy.toString(),original.toString());
    assert.ok(snapshot.equal(original,copy));
    assert.ok(!snapshot.equal(original,createDecimal('12345678901234567890.123456788')));
});
