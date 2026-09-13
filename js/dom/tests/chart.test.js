// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/grid.js';
import '../src/collections/chart.js';

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('grid and chart share record identity, reactive Bags and disposal', async () => {
    setupDom();
    const rows = new Bag({a:new Bag({label:'A', amount:12, cost:4}), b:new Bag({label:'B', amount:-5, cost:2})});
    const struct = new Bag({title:'Amounts', captionField:'label', valueField:'amount', color:'#4285b4', showValues:true});
    class Page extends HtmlBuilder {
        static wc_requires = ['grid','chart'];
        setup(data) {data.setItem('rows', rows); data.setItem('structure', struct); data.setItem('selected','a');}
        main(root) {
            root.quickGrid({value:'^rows', selectedKey:'^selected'}).column('label').column('amount');
            root.chart({store:'^rows', structpath:'structure', selectedKey:'^selected'});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('main'), {inspector:false});
    const chart = host.querySelector('gnr-chart'), grid = host.querySelector('gnr-grid');
    const bar = key => chart.shadowRoot.querySelector(`rect[data-row-key="${key}"]`);
    await tick();
    assert.equal(bar('a').getAttribute('aria-pressed'),'true');
    grid.shadowRoot.querySelector('[data-row-key="b"]').click(); await tick();
    assert.equal(bar('b').getAttribute('aria-pressed'),'true');
    bar('a').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await tick();
    assert.equal(app.data.getItem('main.selected'),'a'); assert.equal(grid.selectedKey,'a');
    app.live(() => rows.setItem('a.amount',40)); await tick();
    assert.equal(bar('a').getAttribute('data-value'),'40');
    assert.ok(grid.shadowRoot.textContent.includes('40'));
    app.live(() => struct.setItem('valueField','cost')); await tick();
    assert.equal(bar('a').getAttribute('data-value'),'4');
    app.live(() => {struct.setItem('color','#ff0000');struct.setItem('showValues',false);}); await tick();
    assert.equal(bar('a').getAttribute('fill'),'#ff0000');
    assert.equal(chart.shadowRoot.querySelectorAll('.value').length,0);
    app.live(() => rows.setItem('c',new Bag({label:'C',amount:0,cost:0}))); await tick();
    assert.ok(bar('c'));
    app.live(() => rows.popNode('a')); await tick();
    assert.equal(bar('a'),null); assert.equal(app.data.getItem('main.selected'),null);
    app.live(() => rows.move(1,0)); await tick();
    assert.equal(chart.shadowRoot.querySelector('rect').getAttribute('data-row-key'),'c');
    const replacement = new Bag({d:new Bag({label:'D',amount:7})});
    app.live(() => {app.data.setItem('main.rows',replacement);app.data.setItem('main.structure',new Bag({captionField:'label',valueField:'amount'}));});
    await tick();
    assert.equal(host.querySelector('gnr-chart'),chart);
    assert.equal(bar('d').getAttribute('data-value'),'7');
    rows.setItem('b.cost',99);struct.setItem('valueField','invalid'); await tick();
    assert.equal(bar('d').getAttribute('data-value'),'7');
    app.live(() => replacement.setItem('d.amount','invalid')); await tick();
    assert.match(chart.shadowRoot.querySelector('.error').textContent,/finite numbers/);
    app.live(() => replacement.setItem('d.amount',0)); await tick();
    assert.equal(chart.shadowRoot.querySelector('.error').hidden,true);
    app.dispose();
    assert.equal(chart._rows,null); assert.equal(chart._structureBags.length,0);
    host.remove();
});

test('attribute records preserve numeric zero identity and missing values', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['chart'];
        setup(data) {
            const rows = new Bag();rows.setItem('r',null,{id:0,label:'Zero',amount:0});rows.setItem('n',null,{id:1,label:'Null',amount:null});
            data.setItem('rows',rows); data.setItem('struct',new Bag({captionField:'label',valueField:'amount'}));
        }
        main(root) {root.chart({store:'^rows',structpath:'struct',datamode:'attr',identifier:'id',selectedKey:'^selected'});}
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('main'),{inspector:false}); await tick();
    const chart=host.querySelector('gnr-chart');
    assert.equal(chart.shadowRoot.querySelectorAll('rect').length,1);
    chart.shadowRoot.querySelector('rect').dispatchEvent(new window.MouseEvent('click',{bubbles:true})); await tick();
    assert.equal(app.data.getItem('main.selected'),0);
    app.live(() => app.data.getItem('main.rows').getNode('r').setAttr({amount:-8})); await tick();
    assert.equal(chart.shadowRoot.querySelector('rect').getAttribute('data-value'),'-8');
    app.dispose();host.remove();
});

test('pie switches live, preserves selection and colour, rejects negatives and recovers', async () => {
    setupDom();
    const rows = new Bag({a:new Bag({label:'A',amount:10}),b:new Bag({label:'B',amount:30}),z:new Bag({label:'Zero',amount:0})});
    const struct = new Bag({captionField:'label',valueField:'amount',chartType:'pie'});
    class Page extends HtmlBuilder {
        static wc_requires=['chart','grid'];
        setup(data){data.setItem('rows',rows);data.setItem('struct',struct);data.setItem('selected','b');}
        main(root){root.quickGrid({value:'^rows',selectedKey:'^selected'}).column('label');root.chart({store:'^rows',structpath:'struct',selectedKey:'^selected'});}
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('main'),{inspector:false});await tick();
    const chart=host.querySelector('gnr-chart'), grid=host.querySelector('gnr-grid');
    const slice=key=>chart.shadowRoot.querySelector(`path.slice[data-row-key="${key}"]`);
    assert.equal(chart.shadowRoot.querySelectorAll('.slice').length,2);
    assert.equal(slice('b').getAttribute('aria-pressed'),'true');
    assert.match(slice('a').getAttribute('aria-label'),/25.0%/);
    const colour=slice('a').getAttribute('fill');
    slice('a').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await tick();
    assert.equal(grid.selectedKey,'a');
    app.live(()=>rows.setItem('a.amount',30));await tick();
    assert.match(slice('a').getAttribute('aria-label'),/50.0%/);
    app.live(()=>rows.move(0,1));await tick();assert.equal(slice('a').getAttribute('fill'),colour);
    grid.shadowRoot.querySelector('[data-row-key="a"]').click();await tick();
    app.live(()=>struct.setItem('chartType','bar'));await tick();
    assert.equal(chart.shadowRoot.querySelectorAll('.slice').length,0);
    assert.equal(chart.shadowRoot.querySelector('rect.bar[data-row-key="a"]').getAttribute('aria-pressed'),'true');
    app.live(()=>{rows.setItem('b.amount',-2);struct.setItem('chartType','pie');});await tick();
    assert.match(chart.shadowRoot.querySelector('.error').textContent,/nonnegative/);
    app.live(()=>{rows.setItem('a.amount',0);rows.setItem('b.amount',0);});await tick();
    assert.equal(chart.shadowRoot.querySelector('.error').hidden,true);
    assert.equal(chart.shadowRoot.querySelectorAll('.slice').length,0);
    assert.match(chart.shadowRoot.textContent,/No positive values/);
    app.live(()=>rows.setItem('a.amount',12));await tick();assert.ok(slice('a'));
    app.live(()=>rows.popNode('a'));await tick();assert.equal(app.data.getItem('main.selected'),null);
    app.dispose();host.remove();
});
