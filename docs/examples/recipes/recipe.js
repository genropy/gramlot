// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {wrapSource} from 'gramlot-dom';

/** Expand ordinary Source nodes; the returned box is an HTML div. */
export function messageBoxRecipe(parent, {datapath, title = 'Message', showDetail = false}) {
    const box = parent.div({datapath, class: 'message-box'});
    box.div(title, {class: 'box-title'});
    box.textBox({value: '^.message', default: 'Hello', placeholder: 'Write a message'});
    box.button('Reset', {action: "this.SET('.message', 'Hello');"});
    box.dataController({
        func: (node, {visible}) => {
            const children = node.parentBag;
            const detail = children.getNodes().find(child => child.getAttr().class === 'detail');
            if (visible && !detail) wrapSource(node.parentNode).p('^.message', {class: 'detail'});
            else if (!visible && detail) children.pop(detail.label);
        },
        visible: showDetail,
        _on_start: true,
    });
    return box;
}
