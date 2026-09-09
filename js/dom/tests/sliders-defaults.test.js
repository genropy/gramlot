// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contracts: legacy slider authoring and one-time pointer default initialization.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/inputs.js';

function mount(build, setup = () => {}) {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs'];
        setup() { setup(this); }
        main(root) { build(root, this); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const builder = new Page('page');
    const app = new Application(host, builder);
    return {host, builder, app};
}
for (const tag of ['horizontalSlider', 'verticalSlider']) {
    test(`${tag} bounds/discrete values and continuous numeric write-back`, () => {
        const {host, builder, app} = mount(root => {
            root[tag]({value:'^size', default_value:20, minimum:10, maximum:48, discreteValues:39,
                intermediateChanges:true, lbl:'Size', lbl_position:'TL'});
            root.div('^size');
        });
        const widget = host.firstElementChild, input = widget.shadowRoot.querySelector('input');
        assert.equal(input.min, '10'); assert.equal(input.max, '48'); assert.equal(input.step, '1');
        assert.equal(input.valueAsNumber, 20);
        assert.equal(input.labels[0].textContent, 'Size');
        assert.equal(input.getAttribute('aria-orientation'), tag === 'verticalSlider' ? 'vertical' : 'horizontal');
        input.value = '37';
        input.dispatchEvent(new Event('input', {bubbles:true, composed:true}));
        assert.equal(builder.data.getItem('size'), 37);
        assert.equal(host.querySelector('div').textContent, '37');
        app.dispose();
    });
}
test('slider aliases, fractional steps, release commit and explicit updateOn precedence', () => {
    const {host, builder, app} = mount(root => root.horizontalSlider({value:'^n', default:0.5,
        min:0, max:1, step:0.1, intermediateChanges:true, updateOn:'blur'}));
    const input = host.firstElementChild.shadowRoot.querySelector('input');
    assert.equal(input.step, '0.1');
    input.value = '0.7'; input.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
    assert.equal(builder.data.getItem('n'), 0.5);
    input.dispatchEvent(new Event('change',{bubbles:true}));
    assert.equal(builder.data.getItem('n'), 0.7);
    app.dispose();
});
test('invalid slider configurations fail before mount', () => {
    for (const attrs of [{minimum:20,maximum:10},{discreteValues:1},{step:0},{minimum:0,maximum:10,discreteValues:3,step:1}]) {
        assert.throws(() => mount(root => root.horizontalSlider(attrs)), /Slider/);
        assert.equal(document.body.firstElementChild.childNodes.length, 0);
    }
});
test('defaults seed relative values and style paths; existing values and later empties survive', () => {
    const {host,builder,app} = mount((root, page) => {
        for (const name of ['one','two']) {
            const box = root.div({datapath:name});
            box.textBox({value:'^.text', default_value:name});
            box.div('Sample',{color:'^.color',default_color:'red'});
        }
        for (const [key,value] of Object.entries({zero:0,flag:false,blank:'',nil:null})) {
            root.textBox({value:`^${key}`,default_value:'replacement'});
        }
        root.textBox({value:'^newzero',default:0,default_value:100});
        root.checkbox({checked:'^newflag',default_checked:false});
        root.textBox({value:'^typed',default_value:'42',dtype:'L'});
    }, page => {
        for (const [key,value] of Object.entries({zero:0,flag:false,blank:'',nil:null})) page.setData(key,value);
    });
    assert.equal(builder.data.getItem('one.text'),'one'); assert.equal(builder.data.getItem('two.text'),'two');
    assert.equal(builder.data.getItem('one.color'),'red');
    for (const [key,value] of Object.entries({zero:0,flag:false,blank:'',nil:null,newzero:0,newflag:false,typed:42})) {
        assert.equal(builder.data.getItem(key),value);
    }
    app.live(() => builder.data.setItem('one.text',''));
    assert.equal(host.querySelector('gnr-textbox').value,'');
    assert.equal(builder.data.getItem('one.text'),'');
    app.live(() => app.root.textBox({value:'^later',default_value:'Inserted'}));
    assert.equal(builder.data.getItem('later'),'Inserted');
    app.dispose();
});

test('bounds are reactive and labelled readonly sliders reject user commits', () => {
    const {host, builder, app} = mount((root,page) => {
        page.slider = root.verticalSlider({value:'^n',default_value:20,minimum:'^low',maximum:'^high',
            step:1,lbl:'Size',readonly:true});
    }, page => { page.setData('low',10); page.setData('high',48); });
    let input = host.firstElementChild.shadowRoot.querySelector('input');
    input.value='30';input.dispatchEvent(new Event('change',{bubbles:true}));
    assert.equal(builder.data.getItem('n'),20);
    app.live(() => builder.data.setItem('high',60));
    input=host.firstElementChild.shadowRoot.querySelector('input');
    assert.equal(input.max,'60');
    assert.equal(input.getAttribute('aria-readonly'),'true');
    app.dispose();
});

test('defaults are not reapplied after deletion or source attribute edits', () => {
    const {builder,app} = mount((root,page) => {
        page.field=root.textBox({value:'^name',default_value:'Initial'});
    });
    app.live(() => builder.data.pop('name'));
    app.live(() => builder.field.setAttr({default_value:'Changed default',lbl:'Name'}));
    assert.equal(builder.data.getNode('name'),null);
    app.dispose();
});
