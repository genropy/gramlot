// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromTytx} from 'genro-tytx';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import {formatDisplay} from '../src/display-format.js';

const day = fromTytx('2026-09-11::D');
test('date presets and bounded LDML patterns preserve civil fields', () => {
    for (const locale of ['it-IT','en-US']) for (const format of ['short','medium','long','full']) {
        assert.equal(formatDisplay(day,{locale,format}),new Intl.DateTimeFormat(locale,{dateStyle:format,timeZone:'UTC'}).format(day));
    }
    assert.equal(formatDisplay(day,{format:'dd/MM/yyyy',mask:'Due: %s'}),'Due: 11/09/2026');
    assert.equal(formatDisplay(day,{format:"d MMMM yyyy 'at home'",locale:'en-US'}),'11 September 2026 at home');
    assert.throws(()=>formatDisplay(day,{format:'YYYY-MM-dd'}),/Unsupported/);
    assert.throws(()=>formatDisplay('2026-09-11',{format:'short'}),/typed Date/);
    assert.equal(formatDisplay(null,{format:'short',mask:'[%s]'}),'[]');
    assert.equal(formatDisplay('',{format:'short'}),'');
    assert.equal(formatDisplay(0,{mask:'%s / %s'}),'0 / 0');
    assert.equal(formatDisplay(false,{mask:'%s'}),'false');
});
test('typed time and UTC datetime avoid browser-zone conversion',()=>{
    assert.equal(formatDisplay(fromTytx('14:35:08::H'),{format:'HH:mm:ss'}),'14:35:08');
    assert.equal(formatDisplay(fromTytx('2026-09-11T14:35:08.000Z::DHZ'),{format:'dd/MM/yyyy HH:mm:ss'}),'11/09/2026 14:35:08');
    assert.equal(formatDisplay(fromTytx('00:00:00::H'),{dtype:'H',format:'HH:mm'}),'00:00');
});
test('value and presentation pointers rerender safely; passive options read only on another trigger',()=>{
    setupDom(); document.documentElement.lang='it-IT';
    class Page extends HtmlBuilder {main(root) {
        root.dataSetter({destination:'day',value:day});
        root.dataSetter({destination:'style',value:'long'});
        root.dataSetter({destination:'locale',value:'en-US'});
        root.dataSetter({destination:'mask',value:'<b>%s</b>'});
        root.div('^day',{id:'date',format:'^style',locale:'^locale',mask:'^mask'});
        root.div('^day',{id:'passive',format:'=style',locale:'it-IT'});
        root.div('^day',{id:'inherited',format:'long'});
        root.input({id:'input',value:'^day',format:'^style'});
        root.dataFormula({destination:'raw',formula:'value',value:'^day',format:'^style',_on_start:true});
    }}
    const host=document.createElement('div'); const app=new Application(host,new Page('main'));
    assert.equal(host.querySelector('#date').textContent,'<b>September 11, 2026</b>');
    assert.equal(host.querySelector('#date b'),null);
    assert.equal(host.querySelector('#inherited').textContent,'11 settembre 2026');
    const passive=host.querySelector('#passive').textContent;
    app.live(()=>app.data.setItem('main.style','yyyy-MM-dd'));
    assert.equal(host.querySelector('#date').textContent,'<b>2026-09-11</b>');
    assert.equal(host.querySelector('#passive').textContent,passive);
    app.live(()=>app.data.setItem('main.style','long'));
    app.live(()=>app.data.setItem('main.locale','it-IT'));
    assert.equal(host.querySelector('#date').textContent,'<b>11 settembre 2026</b>');
    app.live(()=>app.data.setItem('main.mask','Date: %s'));
    assert.equal(host.querySelector('#date').textContent,'Date: 11 settembre 2026');
    assert.equal(app.data.getItem('main.day'),day); assert.equal(app.data.getItem('main.raw'),day);
    assert.equal(host.querySelector('#input').getAttribute('value'),String(day));
    app.live(()=>app.data.setItem('main.style','yyyy-MM-dd'));
    app.live(()=>app.data.setItem('main.day',fromTytx('2026-09-12::D')));
    assert.equal(host.querySelector('#passive').textContent,'2026-09-12');
    app.dispose();
});
test('ancestor locale pointer is resolved in its own datapath and overrides application locale',()=>{
    setupDom();
    class Page extends HtmlBuilder {main(root) {
        root.dataSetter({destination:'settings.language',value:'it-IT'});
        const pane=root.div({datapath:'settings',locale:'^.language'});
        root.dataSetter({destination:'settings.other.day',value:day});
        pane.div('^.day',{id:'date',format:'long',datapath:'.other'});
    }}
    const host=document.createElement('div'); const app=new Application(host,new Page('main'),{locale:'en-US'});
    assert.equal(host.querySelector('#date').textContent,'11 settembre 2026');
    app.live(()=>app.data.setItem('main.settings.language','en-US'));
    assert.equal(host.querySelector('#date').textContent,'September 11, 2026');
    app.dispose();
});
test('iterate cell updates render both raw and formatted consumers of the same field',()=>{
    setupDom();
    class Page extends HtmlBuilder {
        static components=['row'];
        setup(){this.setData('rows.a.day',day);this.setData('rows.a.style','yyyy-MM-dd');}
        row(root,{node_label}) {
            const row=root.div({datapath:`.${node_label}`});
            row.span('^.day',{class_:'raw'});row.span('^.day',{class_:'formatted',format:'^.style'});
        }
        main(root){root.div().row({iterate:'^rows'});}
    }
    const host=document.createElement('div');const app=new Application(host,new Page('main'));
    app.live(()=>app.data.setItem('main.rows.a.day',fromTytx('2026-09-12::D')));
    assert.equal(host.querySelector('.formatted').textContent,'2026-09-12');
    app.live(()=>app.data.setItem('main.rows.a.style','dd/MM/yyyy'));
    assert.equal(host.querySelector('.formatted').textContent,'12/09/2026');
    app.dispose();
});
