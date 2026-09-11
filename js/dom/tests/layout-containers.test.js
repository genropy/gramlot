// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/**
 * layout containers — borderContainer + tabContainer/tab (web components,
 * ported from ws-web widgets/containers.py).
 *
 * borderContainer: a CSS-grid shell, children routed to named regions via
 * `slot` (center = default slot); a region child marked `splitter` gets a
 * drag bar. tabContainer: the SELECTION LIVES IN THE DATA (`value` pointer);
 * a click re-emits `change` composed and rides the SAME write-back as the
 * input widgets. The panes are slotted light-DOM (real, reactive) nodes.
 *
 * Assertions are on the observable outcome (region cells, slot routing,
 * pane visibility, the datum the click writes), never on internals.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import '../src/collections/layout.js';   // registers 'layout'
import '../src/collections/inputs.js';   // registers 'inputs' (textBox in panes)
import { setupDom } from './dom.js';
import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { Application } from '../src/application.js';

/** Mount on an in-document host so the custom elements upgrade/connect. */
function mountApp(PageClass) {
    setupDom();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const genro = new Application(host, new PageClass('main'));   // eslint-disable-line no-new
    return { genro, host };
}

class BorderPage extends HtmlBuilder {
    static wc_requires = ['layout'];

    main(root) {
        const bc = root.borderContainer({ design: 'sidebar' });
        bc.div({ slot: 'top' }).span('H');
        bc.div({ slot: 'left', splitter: true, style: 'width:120px' }).span('menu');
        bc.div().span('center content');            // no slot → default (center)
        bc.div({ slot: 'bottom' }).span('F');
    }
}

test('borderContainer builds the five region cells and applies the design', () => {
    const { host } = mountApp(BorderPage);
    const bc = host.querySelector('gnr-bordercontainer');
    assert.ok(bc, 'the border container rendered');
    const regions = bc.shadowRoot.querySelectorAll('.region');
    assert.equal(regions.length, 5);                 // top/left/center/right/bottom
    // the design placed the grid areas on the host
    assert.ok(bc.style.gridTemplateAreas, 'grid-template-areas set from design');
});

test('borderContainer routes children to named regions; center is the default slot', () => {
    const { host } = mountApp(BorderPage);
    const bc = host.querySelector('gnr-bordercontainer');
    const slotOf = (txt) => Array.from(bc.children)
        .find((c) => c.textContent.includes(txt))
        .getAttribute('slot');
    assert.equal(slotOf('H'), 'top');
    assert.equal(slotOf('menu'), 'left');
    assert.equal(slotOf('F'), 'bottom');
    assert.equal(slotOf('center content'), null);    // unslotted → center
});

test('a region child marked splitter gets a drag handle; others do not', () => {
    const { host } = mountApp(BorderPage);
    const bc = host.querySelector('gnr-bordercontainer');
    assert.ok(bc.shadowRoot.querySelector('.region.left .handle'), 'left has a splitter');
    assert.equal(bc.shadowRoot.querySelector('.region.top .handle'), null,
        'top (no splitter attr) has none');
});

class TabPage extends HtmlBuilder {
    static wc_requires = ['layout', 'inputs'];

    setup() {
        this.setData('ui.tab', 'one');
        this.setData('f.a', 'AAA');
        this.setData('f.b', 'BBB');
    }

    main(root) {
        const tc = root.tabContainer({ value: '^ui.tab' });
        tc.tab({ label: 'One', key: 'one' }).textBox({ value: '^f.a' });
        tc.tab({ label: 'Two', key: 'two' }).textBox({ value: '^f.b' });
        root.div({ class_: 'selbox' }).span('^ui.tab');   // independent reader of the selection
    }
}

const paneVis = (host) => Object.fromEntries(
    Array.from(host.querySelectorAll('gnr-tab'))
        .map((t) => [t.getAttribute('key'), t.style.display === 'none' ? 'hidden' : 'shown']),
);

test('tabContainer shows the selected pane; the strip has one button per tab', () => {
    const { host } = mountApp(TabPage);
    const tc = host.querySelector('gnr-tabcontainer');
    assert.equal(tc.shadowRoot.querySelectorAll('.tab').length, 2);
    assert.deepEqual(paneVis(host), { one: 'shown', two: 'hidden' });
});

test('selection is data-driven: changing the pointer switches the pane', () => {
    const { genro, host } = mountApp(TabPage);
    genro.live(() => genro.data.setItem('main.ui.tab', 'two'));
    assert.deepEqual(paneVis(host), { one: 'hidden', two: 'shown' });
    // the independent reader of ^ui.tab reflects it too
    assert.equal(host.querySelector('.selbox').textContent, 'two');
});

test('data-driven tab selection preserves uncommitted input and pane identity', () => {
    const {genro, host} = mountApp(TabPage);
    const tab = host.querySelector('gnr-tab');
    const input = tab.querySelector('gnr-textbox').shadowRoot.querySelector('input');
    input.value = 'Not committed yet';
    input.focus();
    genro.live(() => genro.data.setItem('main.ui.tab', 'two'));
    genro.live(() => genro.data.setItem('main.ui.tab', 'one'));
    assert.equal(host.querySelector('gnr-tab'), tab);
    assert.equal(tab.querySelector('gnr-textbox').shadowRoot.querySelector('input'), input);
    assert.equal(input.value, 'Not committed yet');
    genro.live(() => genro.data.setItem('main.f.a', 'Updated by data'));
    assert.equal(tab.querySelector('gnr-textbox').value, 'Updated by data');
});

test('a parent selection update still applies a simultaneous child data update', () => {
    const {genro, host} = mountApp(TabPage);
    const container = host.querySelector('gnr-tabcontainer');
    genro.live(() => {
        genro.data.setItem('main.ui.tab', 'two');
        genro.data.setItem('main.f.b', 'Fresh child');
    });
    assert.equal(host.querySelector('gnr-tabcontainer'), container);
    assert.equal(host.querySelectorAll('gnr-textbox')[1].value, 'Fresh child');
});

class ResizablePage extends HtmlBuilder {
    static wc_requires = ['layout', 'inputs'];
    setup() { this.setData('design', 'headline'); }
    main(root) {
        const border = root.borderContainer({design: '^design'});
        border.div({slot:'left', width:'100px', splitter:true}).span('Menu');
        border.div().textBox({value:''});
    }
}

test('border design preserves resized region and local input; detach cancels drag', () => {
    const {genro, host} = mountApp(ResizablePage);
    const border = host.querySelector('gnr-bordercontainer');
    const left = border.shadowRoot.querySelector('.region.left');
    const input = border.querySelector('gnr-textbox').shadowRoot.querySelector('input');
    input.value = 'Local';
    left.querySelector('.handle').dispatchEvent(new (window.PointerEvent || window.MouseEvent)(window.PointerEvent ? 'pointerdown' : 'mousedown'));
    window.dispatchEvent(new (window.PointerEvent || window.MouseEvent)(window.PointerEvent ? 'pointermove' : 'mousemove', {clientX:180}));
    assert.equal(left.style.width, '180px');
    genro.live(() => genro.data.setItem('main.design', 'sidebar'));
    assert.equal(host.querySelector('gnr-bordercontainer'), border);
    assert.equal(left.style.width, '180px');
    assert.equal(input.value, 'Local');
    border.remove();
    window.dispatchEvent(new (window.PointerEvent || window.MouseEvent)(window.PointerEvent ? 'pointermove' : 'mousemove', {clientX:230}));
    assert.equal(left.style.width, '180px', 'detached container no longer handles window events');
});

test('a tab click writes the bound pointer (write-back, no data-set-pointer)', () => {
    const { genro, host } = mountApp(TabPage);
    const tc = host.querySelector('gnr-tabcontainer');
    tc.shadowRoot.querySelector('.tab[data-key="two"]').click();
    assert.equal(genro.data.getItem('main.ui.tab'), 'two');   // the click mutated the datum
    assert.deepEqual(paneVis(host), { one: 'hidden', two: 'shown' });
});

class DrawerPage extends HtmlBuilder {
    static wc_requires = ['layout'];

    main(root) {
        const bc = root.borderContainer();
        bc.div({ slot: 'left', drawer: true, width: '160px' }).span('menu');
        bc.div({ slot: 'right', drawer: 'close', width: '160px' }).span('side');
        bc.div().span('center');
    }
}

const region = (host, name) => host.querySelector('gnr-bordercontainer')
    .shadowRoot.querySelector(`.region.${name}`);

class FourSides extends HtmlBuilder {
    static wc_requires = ['layout'];
    main(root) {
        const border = root.borderContainer();
        for (const slot of ['left', 'right', 'top', 'bottom']) {
            border.div({slot, splitter:true}).span(slot);
        }
        border.div().span('Center');
    }
}

test('four splitter directions, minimum sizes and release', () => {
    const {host} = mountApp(FourSides);
    const pointer = Boolean(window.PointerEvent);
    const EventClass = window.PointerEvent || window.MouseEvent;
    for (const side of ['left', 'right', 'top', 'bottom']) {
        const cell = region(host, side);
        const horizontal = side === 'left' || side === 'right';
        const sign = side === 'left' || side === 'top' ? 1 : -1;
        const coordinate = horizontal ? 'clientX' : 'clientY';
        const dimension = horizontal ? 'width' : 'height';
        cell.querySelector('.handle').dispatchEvent(new EventClass(pointer ? 'pointerdown' : 'mousedown'));
        window.dispatchEvent(new EventClass(pointer ? 'pointermove' : 'mousemove', {[coordinate]:sign * 120}));
        assert.equal(cell.style[dimension], '120px', side);
        window.dispatchEvent(new EventClass(pointer ? 'pointermove' : 'mousemove', {[coordinate]:-sign * 300}));
        assert.equal(cell.style[dimension], horizontal ? '40px' : '30px', side);
        window.dispatchEvent(new EventClass(pointer ? 'pointerup' : 'mouseup'));
        const released = cell.style[dimension];
        window.dispatchEvent(new EventClass(pointer ? 'pointermove' : 'mousemove', {[coordinate]:sign * 300}));
        assert.equal(cell.style[dimension], released);
        assert.equal(cell.querySelector('.handle').parentElement, cell);
        assert.ok(cell.querySelector('.region-content > slot'));
    }
});

test('a drawer region gets a toggle and implies a splitter handle', () => {
    const { host } = mountApp(DrawerPage);
    const left = region(host, 'left');
    assert.ok(left.querySelector('.drawer-toggle'), 'drawer has a toggle');
    assert.ok(left.querySelector('.handle'), 'drawer implies a splitter handle');
});

test('drawer starts open by default, drawer="close" starts collapsed', () => {
    const { host } = mountApp(DrawerPage);
    assert.equal(region(host, 'left').classList.contains('drawer-closed'), false);
    assert.equal(region(host, 'right').classList.contains('drawer-closed'), true);
});

test('the toggle collapses and expands the drawer', () => {
    const { host } = mountApp(DrawerPage);
    const left = region(host, 'left');
    left.querySelector('.drawer-toggle').click();
    assert.equal(left.classList.contains('drawer-closed'), true);
    left.querySelector('.drawer-toggle').click();
    assert.equal(left.classList.contains('drawer-closed'), false);
});

test('legacy contentPane region routes panes and enables its splitter', () => {
    class RegionPage extends HtmlBuilder {
        static wc_requires = ['layout'];
        main(root) {
            const layout = root.borderContainer({height:'460px'});
            layout.contentPane({region:'top',height:'38px'}).div('Header');
            layout.contentPane({region:'left',width:'150px',splitter:true,drawer:true}).div('Navigation');
            layout.contentPane({region:'center'}).div('Center');
            layout.contentPane({region:'bottom',height:'30px'}).div('Footer');
        }
    }
    const {genro,host} = mountApp(RegionPage);
    const border = host.querySelector('gnr-bordercontainer');
    assert.deepEqual([...border.children].map(pane=>pane.getAttribute('slot')), ['top','left','','bottom']);
    assert.ok(border.shadowRoot.querySelector('.region.left .handle'));
    assert.ok(border.shadowRoot.querySelector('.region.left .drawer-toggle'));
    genro.dispose(); host.remove();
});

test('reactive splitter pane width opens its owned region from zero', () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires = ['layout'];
        main(root) {
            root.dataSetter({destination:'width',value:'0px'});
            const layout=root.borderContainer({height:'300px'});
            layout.contentPane({region:'center'}).div('Application');
            layout.contentPane({region:'right',width:'^width',splitter:true}).pre('Source');
        }
    }
    const host=document.body.appendChild(document.createElement('div'));
    const app=new Application(host,new Page('main'));
    const layout=host.querySelector('gnr-bordercontainer');
    const region=layout.shadowRoot.querySelector('.region.right');
    assert.equal(region.style.width,'0px');
    app.live(()=>app.data.setItem('main.width','420px'));
    assert.equal(region.style.width,'420px');
    assert.equal(layout.querySelector('[slot=right]').style.width,'100%');
    app.live(()=>app.data.setItem('main.width','0px'));
    assert.equal(region.style.width,'0px');
    app.dispose();host.remove();
});
