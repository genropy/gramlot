// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Contract: label decoration belongs to a widget, preserving its identity and input state.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {setupDom} from './dom.js';
import {Application, HtmlBuilder} from '../src/index.js';
import '../src/collections/inputs.js';
import '../src/collections/colorpicker.js';
import '../src/collections/layout.js';
import '../src/collections/palette.js';
import '../src/collections/clipboard.js';
import '../src/collections/storetree.js';

function mounted(attrs = {}, tag = 'textBox') {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs', 'colorpicker'];
        setup() { this.setData('form', {caption: 'Name', color: 'green', padding: '8px', value: 'saved'}); }
        main(root) { this.field = root[tag]({node_id: 'field', ...attrs}); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const builder = new Page('labels');
    const app = new Application(host, builder);
    return {host, builder, app, field: host.firstElementChild};
}

for (const [position, direction, alignment] of [
    ['L', 'row', 'left'], ['R', 'row-reverse', 'left'],
    ['TL', 'column', 'left'], ['TC', 'column', 'center'], ['TR', 'column', 'right'],
    ['BL', 'column-reverse', 'left'], ['BC', 'column-reverse', 'center'], ['BR', 'column-reverse', 'right'],
]) {
    test(`widget label position ${position} keeps label and control distinct`, () => {
        const {field, app} = mounted({lbl: 'Name', lbl_position: position,
            lbl_color: 'gray', box_border: '1px solid silver', box_padding: '8px', color: 'red'});
        const label = field.shadowRoot.querySelector('label');
        const box = label.parentElement;
        assert.equal(box.style.flexDirection, direction);
        assert.equal(label.style.textAlign, alignment);
        assert.equal(label.style.color, 'gray');
        assert.equal(box.style.padding, '8px');
        assert.equal(box.style.border, '1px solid silver');
        assert.equal(field.style.color, 'red');
        assert.equal(label.hasAttribute('position'), false);
        assert.equal(label.control, field.shadowRoot.querySelector('input'));
        app.dispose();
    });
}

test('explicit labledBox uses label_position for all supported positions', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['layout'];
        main(root) {
            for (const position of ['L','R','TL','TC','TR','BL','BC','BR']) {
                root.labledBox({label: position, label_position: position,
                    node_id: `box-${position}`}).div(position);
            }
            root.labledBox({label: 'Old names', side: 'right', lbl_side: 'right',
                label_side: 'right', node_id: 'old'}).div('content');
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('explicit-positions'));
    const expected = {
        L: ['row', 'left'], R: ['row-reverse', 'left'],
        TL: ['column', 'left'], TC: ['column', 'center'], TR: ['column', 'right'],
        BL: ['column-reverse', 'left'], BC: ['column-reverse', 'center'], BR: ['column-reverse', 'right'],
    };
    for (const box of host.querySelectorAll('gnr-labledbox')) {
        const label = box.shadowRoot.querySelector('.labledBox_label');
        const wrapper = box.shadowRoot.querySelector('.labledBox');
        if (label.textContent === 'Old names') {
            assert.equal(wrapper.style.flexDirection, 'column');
            continue;
        }
        const [direction, alignment] = expected[label.textContent];
        assert.equal(wrapper.style.flexDirection, direction);
        assert.equal(label.style.textAlign, alignment);
        assert.equal(label.hasAttribute('position'), false);
    }
    app.dispose();
});

test('explicit and shorthand decoration route equivalent wrapper and label styles', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['layout', 'inputs'];
        main(root) {
            root.textBox({lbl: 'Short', lbl_color: 'green', box_padding: '6px',
                box_l_background: 'silver', box_c_margin: '2px'});
            root.labledBox({label: 'Explicit', label_color: 'green', padding: '6px',
                box_l_background: 'silver', box_c_margin: '2px'}).textBox({value: 'value'});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('routing'));
    const [short, explicit] = [host.querySelector('gnr-textbox'), host.querySelector('gnr-labledbox')];
    for (const widget of [short, explicit]) {
        const shadow = widget.shadowRoot;
        assert.equal(shadow.querySelector('.labledBox').style.padding, '6px');
        assert.equal(shadow.querySelector('.labledBox_label').style.color, 'green');
        assert.equal(shadow.querySelector('.labledBox_labelRegion').style.background, 'silver');
        assert.equal(shadow.querySelector('.labledBox_content').style.margin, '2px');
    }
    assert.equal(explicit.style.padding, '');
    app.dispose();
});

test('label and box data updates preserve host, focused input, selection and uncommitted draft', () => {
    const {host, field, app} = mounted({lbl: '^form.caption', lbl_color: '^form.color',
        box_padding: '^form.padding', value: '^form.value'});
    const input = field.shadowRoot.querySelector('input');
    input.focus(); input.value = 'draft'; input.setSelectionRange(1, 4);
    app.live(() => {
        app.data.setItem('labels.form.caption', 'Changed');
        app.data.setItem('labels.form.color', 'blue');
        app.data.setItem('labels.form.padding', '12px');
    });
    assert.equal(document.body.firstElementChild.firstElementChild, field);
    assert.equal(field.shadowRoot.activeElement, input);
    assert.equal(input.value, 'draft');
    assert.equal(input.selectionStart, 1);
    assert.equal(input.selectionEnd, 4);
    assert.equal(field.shadowRoot.querySelector('label').textContent, 'Changed');
    assert.equal(field.shadowRoot.querySelector('label').style.color, 'blue');
    assert.equal(field.shadowRoot.querySelector('label').parentElement.style.padding, '12px');
    input.dispatchEvent(new Event('change', {bubbles: true}));
    assert.equal(app.data.getItem('labels.form.value'), 'draft');
    input.value = 'Next draft'; input.setSelectionRange(2, 5);
    app.live(() => app.data.setItem('labels.form.caption', 'After write-back'));
    assert.equal(field.shadowRoot.activeElement, input);
    assert.equal(input.value, 'Next draft');
    assert.equal(input.selectionStart, 2);
    assert.equal(input.selectionEnd, 5);
    assert.equal(host.firstElementChild, field);
    app.dispose();
});

test('colorpicker receives a real associated label without changing its native control', () => {
    const {field, app} = mounted({lbl: 'Color', lbl_position: 'TC', value: '#112233'}, 'colorpicker');
    const label = field.shadowRoot.querySelector('label');
    assert.ok(label);
    assert.equal(label.control, field.shadowRoot.querySelector('input'));
    assert.equal(label.control.value, '#112233');
    app.dispose();
});

test('box without lbl, empty reactive labels, and label-specific attributes have explicit targets', () => {
    const {field, app} = mounted({lbl: '^form.caption', lbl_class_: 'caption', lbl_title: 'Help',
        lbl_style: 'font-style: italic', box_padding: '4px', box_class_: 'frame'});
    app.live(() => app.data.setItem('labels.form.caption', ''));
    const label = field.shadowRoot.querySelector('label');
    assert.equal(label.textContent, '');
    assert.equal(label.hidden, true);
    assert.ok(label.classList.contains('caption'));
    assert.equal(label.title, 'Help');
    assert.equal(label.style.fontStyle, 'italic');
    assert.ok(label.parentElement.classList.contains('frame'));
    app.live(() => app.data.setItem('labels.form.caption', 'Back'));
    assert.equal(field.shadowRoot.querySelector('label'), label);
    assert.equal(label.hidden, false);
    app.dispose();
    const boxed = mounted({box_padding: '5px'}, 'colorpicker');
    assert.equal(boxed.field.shadowRoot.querySelector('.labledBox').style.padding, '5px');
    assert.equal(boxed.field.shadowRoot.querySelector('label').hidden, true);
    boxed.app.dispose();
});

test('readonly textBox retains its value and an associated visible label', () => {
    const {field, app} = mounted({value: 'Hello World', readonly: true, lbl: 'MyText', lbl_position: 'TL'});
    const control = field.shadowRoot.querySelector('input');
    assert.equal(control.readOnly, true);
    assert.equal(control.value, 'Hello World');
    assert.equal(control.labels.length, 1);
    assert.equal(control.labels[0].textContent, 'MyText');
    app.dispose();
});

test('default TL and the position-only widget syntax are consistent', () => {
    const {field, app} = mounted({lbl: 'Name', side: 'bottom', lbl_side: 'left', lbl_position: 'R'});
    assert.equal(field.shadowRoot.querySelector('.labledBox').style.flexDirection, 'row-reverse');
    app.dispose();
    const plain = mounted({lbl: 'Name'});
    assert.equal(plain.field.shadowRoot.querySelector('.labledBox').style.alignItems, 'stretch');
    assert.equal(plain.field.shadowRoot.querySelector('.labledBox').style.flexDirection, 'column');
    plain.app.dispose();
    const removed = mounted({lbl: 'Name', side: 'right', lbl_side: 'right'});
    assert.equal(removed.field.getAttribute('side'), 'right');
    assert.equal(removed.field.shadowRoot.querySelector('.labledBox').style.flexDirection, 'column');
    removed.app.dispose();
});

test('all input collections share the legacy top placement default', () => {
    setupDom();
    const tags = ['textBox','textBoxArea','passwordbox','numberTextBox','dateTextBox','timeTextBox',
        'filteringSelect','comboBox','checkbox','horizontalSlider','verticalSlider','colorpicker'];
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs','colorpicker'];
        main(root) { for (const tag of tags) root[tag]({lbl: tag}); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const app = new Application(host, new Page('all-input-labels'));
    assert.equal(host.children.length, tags.length);
    for (const widget of host.children) {
        assert.equal(widget.shadowRoot.querySelector('.labledBox').style.flexDirection, 'column');
    }
    app.dispose();
});

test('invalid position fails before mounting any output', () => {
    assert.throws(() => mounted({lbl: 'Name', lbl_position: 'diagonal'}), /Unsupported lbl_position/);
    assert.equal(document.body.firstElementChild.childNodes.length, 0);
});

test('dynamic position and removal of decoration attributes update existing nodes', () => {
    const {field, app, builder} = mounted({lbl: 'Name', lbl_color: 'green', box_padding: '4px'});
    const label = field.shadowRoot.querySelector('label');
    app.live(() => builder.field.setAttr({lbl_position: 'BR', lbl_color: null, box_padding: null}));
    assert.equal(field.shadowRoot.querySelector('label'), label);
    assert.equal(label.style.color, '');
    assert.equal(label.style.textAlign, 'right');
    assert.equal(label.parentElement.style.padding, '');
    assert.equal(label.parentElement.style.flexDirection, 'column-reverse');
    app.dispose();
});

test('source insert-before and remove preserve sibling widgets and leave no orphan decoration', () => {
    const {host, field, app, builder} = mounted({lbl: 'Second'});
    app.live(() => app.root.textBox({lbl: 'First', node_position: '<'}));
    assert.equal(host.children.length, 2);
    assert.equal(host.lastElementChild, field);
    assert.equal(host.firstElementChild.shadowRoot.querySelector('label').textContent, 'First');
    app.live(() => builder.source.pop(builder.field.label));
    assert.equal(host.children.length, 1);
    assert.equal(field.isConnected, false);
    assert.equal(field._widgetLabel.observer, null);
    app.dispose();
    assert.equal(host.children.length, 0);
});

test('checkbox keeps its own caption separate from its field label', () => {
    const {field, app} = mounted({lbl: 'Options', label: 'Enabled', lbl_position: 'TR', checked: true}, 'checkbox');
    const labels = field.shadowRoot.querySelector('input').labels;
    assert.deepEqual([...labels].map(label => label.textContent), ['Options', 'Enabled']);
    assert.equal(field.checked, true);
    app.dispose();
});

test('without decoration colorpicker retains its existing shadow structure', () => {
    const {field, app} = mounted({value: '#112233'}, 'colorpicker');
    assert.equal(field.shadowRoot.querySelector('.labledBox'), null);
    assert.equal(field.shadowRoot.querySelector('input').parentNode, field.shadowRoot);
    app.dispose();
});

test('plain HTML does not acquire widget label behavior', () => {
    const {field, app} = mounted({lbl: 'Uninterpreted', box_padding: '4px'}, 'div');
    assert.equal(field.localName, 'div');
    assert.equal(field.shadowRoot, null);
    assert.equal(field.getAttribute('lbl'), 'Uninterpreted');
    app.dispose();
});

// Group widgets retain their own captions, slots, interaction state and ownership.
test('labelled containers keep child identities, native captions, selection and source updates', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs', 'layout', 'palette', 'clipboard', 'storeTree'];
        setup() { this.setData('caption', 'Group'); this.setData('selected', 'one'); }
        main(root) {
            this.panel = root.panel({lbl: '^caption', caption: 'Panel title'});
            this.panel.textBox({value: 'Draft'});
            root.box({lbl: 'Box'}).div('Box content');
            const border = root.borderContainer({lbl: 'Regions', lbl_position:'TL', height:'240px'});
            border.contentPane({slot:'left', splitter:true, width:'80px', lbl:'Left'}).div('Left content');
            border.contentPane({lbl:'Center'}).div('Center content');
            const tabs = root.tabContainer({lbl:'Tabs', value:'^selected'});
            tabs.tab({key:'one', title:'First', lbl:'Pane one'}).div('First content');
            tabs.tab({key:'two', title:'Second', lbl:'Pane two'}).div('Second content');
            const stack = root.stackContainer({nodeId:'stack', lbl:'Stack'});
            stack.contentPane({title:'Stack first'}).div('Stack content');
            root.stackButtons({stackNodeId:'stack', lbl:'Navigation'});
            root.palette({value:true, title:'Dialog title', lbl:'Palette caption'}).div('Palette content');
            root.copyButton({lbl:'Copy value', value:'Hello'});
        }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const builder = new Page('groups');
    const app = new Application(host, builder);
    await Promise.resolve();
    for (const widget of host.querySelectorAll('gnr-panel,gnr-box,gnr-bordercontainer,gnr-contentpane,gnr-tabcontainer,gnr-tab,gnr-stackcontainer,gnr-stackbuttons,gnr-palette')) {
        const label = widget._widgetLabel.label;
        if (!widget.hasAttribute('lbl')) continue;
        assert.equal(label.textContent, widget.getAttribute('lbl'));
        assert.equal(label.parentElement.getAttribute('role'), 'group');
        assert.equal(label.parentElement.getAttribute('aria-labelledby'), label.id);
        for (const slot of widget.shadowRoot.querySelectorAll('slot')) {
            assert.ok(slot.assignedElements().every(child => child.parentElement === widget));
        }
    }
    const panel = host.querySelector('gnr-panel');
    const input = panel.querySelector('gnr-textbox').shadowRoot.querySelector('input');
    input.focus(); input.value = 'Uncommitted';
    app.live(() => builder.data.setItem('caption', 'Updated group'));
    assert.equal(host.querySelector('gnr-panel'), panel);
    assert.equal(panel.shadowRoot.querySelector('.hdr').textContent, 'Panel title');
    assert.equal(input.value, 'Uncommitted');
    assert.equal(input.getRootNode().activeElement, input);
    const tabShell = host.querySelector('gnr-tabcontainer');
    tabShell.shadowRoot.querySelectorAll('button.tab')[1].click();
    assert.equal(builder.data.getItem('selected'), 'two');
    const palette = host.querySelector('gnr-palette');
    assert.equal(palette.shadowRoot.querySelector('[role=dialog]').getAttribute('aria-labelledby'), 'title');
    assert.equal(palette.shadowRoot.querySelector('#title').textContent, 'Dialog title');
    const copy = host.querySelector('gnr-copybutton');
    assert.equal(copy._widgetLabel.label.control, copy.shadowRoot.querySelector('button'));
    assert.equal(copy.shadowRoot.querySelector('button').getAttribute('aria-label'), 'Copy to clipboard');
    const observers = [...host.querySelectorAll('*')].filter(node => node._widgetLabel);
    app.dispose();
    assert.ok(observers.every(node => node._widgetLabel.observer === null));
});

test('storeTree label bindings preserve expansion, selected row and store subscriptions', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['storeTree'];
        setup() {
            this.setData('caption', 'Tree');
            this.data.setItem('folders.branch', new Bag());
            this.data.setItem('folders.branch.leaf', 'Value');
        }
        main(root) { root.storeTree({store:'^folders', lbl:'^caption', lbl_position:'TL'}); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const builder = new Page('tree');
    const app = new Application(host, builder);
    const tree = host.firstElementChild;
    const details = tree.shadowRoot.querySelector('details');
    details.open = true;
    tree.shadowRoot.querySelector('.leaf').click();
    const selected = tree.shadowRoot.querySelector('.selected');
    app.live(() => builder.data.setItem('caption', 'Renamed tree'));
    assert.equal(host.firstElementChild, tree);
    assert.equal(tree._widgetLabel.label.textContent, 'Renamed tree');
    assert.equal(tree.shadowRoot.querySelector('details'), details);
    assert.equal(details.open, true);
    assert.equal(tree.shadowRoot.querySelector('.selected'), selected);
    app.live(() => builder.data.setItem('folders.branch.second', 'Another'));
    assert.equal(tree.shadowRoot.querySelectorAll('.leaf').length, 2);
    app.dispose();
    assert.equal(tree._widgetLabel.observer, null);
});

test('labelled palette closes and reopens through its binding without replacing its child', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['inputs', 'palette'];
        setup() { this.setData('open', true); }
        main(root) { root.palette({id:'palette', value:'^open', lbl:'Caption', title:'Title'}).textBox({value:'Draft'}); }
    }
    const host = document.body.appendChild(document.createElement('div'));
    const builder = new Page('palette');
    const app = new Application(host, builder);
    const palette = host.querySelector('gnr-palette');
    const input = palette.querySelector('gnr-textbox').shadowRoot.querySelector('input');
    input.value = 'Keep this draft';
    palette.shadowRoot.querySelector('.close').click();
    assert.equal(builder.data.getItem('open'), false);
    assert.equal(palette.hidden, true);
    app.live(() => builder.data.setItem('open', true));
    assert.equal(host.querySelector('gnr-palette'), palette);
    assert.equal(palette.hidden, false);
    assert.equal(input.value, 'Keep this draft');
    app.dispose();
});
