// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDecimal,isDecimal} from 'genro-tytx';
import {setupDom} from './dom.js';
import {Application,HtmlBuilder} from '../src/index.js';
import '../src/collections/inputs.js';
import {formatDisplay} from '../src/display-format.js';
import {parseNumberText} from '../src/number-format.js';

function mount(value=1234.56789,attrs={}){
    setupDom();
    class Page extends HtmlBuilder {static wc_requires=['inputs'];main(root){
        root.dataSetter({destination:'amount',value});root.dataSetter({destination:'places',value:2});root.dataSetter({destination:'format',value:'decimal'});
        root.numberTextBox({value:'^amount',places:'^places',format:'^format',locale:'it-IT',...attrs});
        root.div('^amount',{id:'output',places:'^places',format:'^format',locale:'it-IT',mask:'Amount: %s'});
    }}
    const host=document.body.appendChild(document.createElement('div')),app=new Application(host,new Page('main'));
    const widget=host.querySelector('gnr-numbertextbox');return {app,host,widget,input:widget._input};
}
function edit(input,text){input.value=text;input.dispatchEvent(new window.Event('input',{bubbles:true,composed:true}));}
function key(input,key){input.dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true}));}
test('numeric display styles, patterns, places and masks retain typed precision',()=>{
    assert.equal(formatDisplay(1234.56789,{format:'#,##0.00',locale:'en-US'}),'1,234.57');
    assert.equal(formatDisplay(1234.56789,{format:'0.0',places:3,locale:'it-IT',mask:'%s kg'}),'1234,568 kg');
    assert.equal(formatDisplay(.125,{format:'percent',places:1,locale:'en-US'}),'12.5%');
    assert.equal(formatDisplay(1234,{format:'scientific',places:2,locale:'en-US'}),'1.23E3');
    assert.equal(formatDisplay(0,{format:'decimal',places:2,locale:'en-US'}),'0.00');
    assert.equal(formatDisplay(null,{format:'decimal',places:2}), '');
    assert.throws(()=>formatDisplay(1,{format:'nonsense'}),/Unsupported/);
    assert.throws(()=>formatDisplay(1,{places:2.5}),/places/);
    assert.equal(parseNumberText('1234,567','it-IT'),'1234.567');
    assert.throws(()=>parseNumberText('1.234,567','it-IT'),/grouping/);
    const precise=createDecimal('12345678901234567890.123456789');
    assert.equal(formatDisplay(precise,{format:'0.000000000',locale:'en-US'}),'12345678901234567890.123456789');
});
test('focus/blur and reactive display options never quantize Data',()=>{
    const {app,host,widget,input}=mount();
    assert.equal(input.type,'text');assert.equal(input.value,'1234,57');
    input.focus();assert.equal(input.value,'1234,56789');input.blur();
    assert.equal(app.data.getItem('main.amount'),1234.56789);
    app.live(()=>app.data.setItem('main.places',1));
    assert.equal(host.querySelector('gnr-numbertextbox')._input.value,'1234,6');
    assert.equal(host.querySelector('#output').textContent,'Amount: 1234,6');
    app.live(()=>app.data.setItem('main.format','0.000'));
    assert.equal(app.data.getItem('main.amount'),1234.56789);
    assert.equal(widget.value,1234.56789);app.dispose();
});
test('localized drafts commit only on confirmation; invalid drafts and Escape preserve model',()=>{
    const {app,widget,input}=mount(1,{updateOn:'input'});
    input.focus();edit(input,'12,3456');assert.equal(app.data.getItem('main.amount'),1);
    key(input,'Enter');assert.equal(app.data.getItem('main.amount'),12.3456);
    edit(input,'12,3,4');key(input,'Enter');assert.equal(app.data.getItem('main.amount'),12.3456);
    assert.equal(input.validity.customError,true);key(input,'Escape');assert.equal(input.validity.customError,false);
    edit(input,'');key(input,'Enter');assert.equal(app.data.getItem('main.amount'),'');
    widget.value=null;assert.equal(widget.value,null);app.dispose();
});
test('Decimal edit and exact bounds keep arbitrary precision',()=>{
    const original=createDecimal('9007199254740993.123456789');
    const {app,input}=mount(original,{dtype:'N',min:'9007199254740993.1',max:'9007199254740993.2'});
    input.focus();input.blur();assert.equal(app.data.getItem('main.amount'),original);
    input.focus();edit(input,'9007199254740993,123456790');key(input,'Enter');
    const value=app.data.getItem('main.amount');assert.ok(isDecimal(value));assert.equal(String(value),'9007199254740993.12345679');
    edit(input,'9007199254740993,200000001');key(input,'Enter');assert.equal(app.data.getItem('main.amount'),value);assert.equal(input.validity.customError,true);
    app.dispose();
});
test('step is optional and invalid formatting leaves prior editor text available',()=>{
    const {app,widget,input}=mount(1,{step:'.25'});
    input.focus();edit(input,'1,1');key(input,'Enter');assert.equal(app.data.getItem('main.amount'),1);
    edit(input,'1,25');key(input,'Enter');assert.equal(app.data.getItem('main.amount'),1.25);
    input.blur();const text=input.value;widget.setAttribute('format','unsupported');
    assert.equal(input.value,text);assert.equal(input.validity.customError,true);app.dispose();
});
test('invalid draft survives blur/refocus and presentation errors do not abort reactive rendering',()=>{
    const {app,host,input}=mount();input.focus();edit(input,'invalid');input.blur();
    assert.equal(input.value,'invalid');input.focus();assert.equal(input.value,'invalid');
    key(input,'Escape');input.blur();
    app.live(()=>app.data.setItem('main.format','unsupported'));
    assert.match(host.querySelector('#output').textContent,/Amount:.*Unsupported number format/);
    assert.equal(app.data.getItem('main.amount'),1234.56789);
    app.live(()=>app.data.setItem('main.format','decimal'));
    assert.equal(host.querySelector('#output').hasAttribute('data-format-error'),false);
    app.dispose();
});
test('passive precision updates on next value render; page locale reaches numeric editor',()=>{
    setupDom();class Page extends HtmlBuilder {static wc_requires=['inputs'];main(root){
        root.dataSetter({destination:'value',value:1.2345});root.dataSetter({destination:'places',value:2});
        root.numberTextBox({value:'^value',places:'=places'});
    }}
    const host=document.body.appendChild(document.createElement('div'));const app=new Application(host,new Page('main'),{locale:'it-IT'});
    const current=()=>host.querySelector('gnr-numbertextbox')._input.value;
    assert.equal(current(),'1,23');app.live(()=>app.data.setItem('main.places',3));assert.equal(current(),'1,23');
    app.live(()=>app.data.setItem('main.value',2.3456));assert.equal(current(),'2,346');app.dispose();
});
test('reactive display options preserve the focused draft and its captured locale',()=>{
    const {app,host,input,widget}=mount();input.focus();edit(input,'12,34567');
    app.live(()=>app.data.setItem('main.places',4));
    assert.equal(host.querySelector('gnr-numbertextbox'),widget);
    assert.equal(widget._input,input);assert.equal(input.value,'12,34567');
    key(input,'Enter');assert.equal(app.data.getItem('main.amount'),12.34567);app.dispose();
});
