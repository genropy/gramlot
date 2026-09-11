// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Shared label/box decoration used by shorthand widgets and labledBox.
 * Keeps label, box and content stable; normal attributes stay on the host.
 * lbl_position decorates widgets; label_position configures explicit boxes.
 */
import {HtmlAttributes} from '../../contrib/html/html-attributes.js';

const POSITIONS = {
    L: ['left', 'row', 'left'], R: ['right', 'row-reverse', 'left'],
    TL: ['top', 'column', 'left'], TC: ['top', 'column', 'center'], TR: ['top', 'column', 'right'],
    BL: ['bottom', 'column-reverse', 'left'], BC: ['bottom', 'column-reverse', 'center'], BR: ['bottom', 'column-reverse', 'right'],
};

export const WIDGET_LABEL_CSS = `
.labledBox{display:flex;gap:4px}
.labledBox_labelRegion{display:flex;align-items:inherit}
.labledBox_label{color:var(--gnrfieldlabel-color,#555);font-size:var(--form-label-font-size,12px);font-weight:var(--formlet-label-font-weight,600);white-space:nowrap}
.labledBox_label:empty,.labledBox_label[hidden]{display:none}
.labledBox_content{flex:1;min-width:0;min-height:0}
.labledBox_group{min-width:0;min-height:0;box-sizing:border-box}
.labledBox_group>.labledBox_content{align-self:stretch}
.labledBox_fill{height:100%;flex:1;grid-area:1/1/-1/-1;grid-template-areas:inherit}
`;

export class WidgetLabel {
    constructor(host, control, content = control, existing = null, options = {}) {
        this.host = host;
        this.control = control;
        this.content = content;
        this.box = existing?.box || null;
        this.label = existing?.label || null;
        this.labelRegion = existing?.labelRegion || null;
        this.attributes = new HtmlAttributes();
        this.applied = new Map();
        this.observer = null;
        this.options = options;
    }

    get enabled() {
        return [...this.host.attributes].some(a => a.name === 'lbl'
            || (a.name.startsWith('lbl_') && a.name !== 'lbl_side')
            || a.name.startsWith('box_'));
    }

    connect() {
        this.apply();
        this.disconnect();
        this.observer = new this.host.ownerDocument.defaultView.MutationObserver(records => {
            if (records.some(r => this.isDecoration(r.attributeName))) this.apply();
        });
        this.observer.observe(this.host, {attributes: true});
    }

    disconnect() { this.observer?.disconnect(); this.observer = null; }

    isDecoration(name) {
        return (this.options.explicit && (name === 'label' || name.startsWith('label_')))
            || name === 'lbl' || (name.startsWith('lbl_') && name !== 'lbl_side')
            || name.startsWith('box_') || name.startsWith('data-lbl')
            || name.startsWith('data-box_');
    }

    get position() {
        const attribute = this.options.explicit ? 'label_position' : 'lbl_position';
        const position = this.host.getAttribute(attribute) || this.options.defaultPosition || 'TL';
        if (!POSITIONS[position]) throw new Error(`Unsupported ${attribute}: ${position}`);
        return position;
    }

    getRawAttributes(prefix) {
        const attrs = {};
        for (const {name, value} of this.host.attributes) {
            if (!name.startsWith(prefix)) continue;
            let key = name.slice(prefix.length);
            if (prefix === 'box_' && (key.startsWith('l_') || key.startsWith('c_'))) continue;
            if (['datapath','node_id','value','checked','store'].includes(key)) throw new Error(`Invalid decoration attribute: ${name}`);
            if (['lbl_', 'label_'].includes(prefix) && ['position', 'side', ...(this.options.reservedLabelAttributes || [])].includes(key)) continue;
            if (['class_', '_class'].includes(key)) key = 'class';
            if (key === 'for_') key = 'for';
            attrs[key] = value;
        }
        return attrs;
    }

    getAttributes(prefix) { return this.attributes.adaptAttrs(this.getRawAttributes(prefix)); }

    setAttributes(element, attrs) {
        const previous = this.applied.get(element) || [];
        for (const name of previous) if (!(name in attrs)) element.removeAttribute(name);
        for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
        this.applied.set(element, Object.keys(attrs));
    }

    apply() {
        if (!this.box && !this.enabled && !this.options.explicit) return;
        const [side, direction, align] = POSITIONS[this.position];
        if (!this.box) {
            this.box = this.host.ownerDocument.createElement('div');
            this.label = this.host.ownerDocument.createElement(this.control ? 'label' : 'div');
            if (Array.isArray(this.content)) {
                const children = this.content;
                this.content = this.host.ownerDocument.createElement('div');
                children[0].replaceWith(this.box);
                this.content.append(...children);
                Object.assign(this.content.style, this.options.contentStyle);
            } else this.content.replaceWith(this.box);
            this.content.classList.add('labledBox_content');
            this.box.append(this.label, this.content);
            const style = this.host.ownerDocument.createElement('style');
            style.textContent = WIDGET_LABEL_CSS;
            this.host.shadowRoot.append(style);
        }
        if (this.options.explicit && this.host.hasAttribute('label') && this.host.hasAttribute('lbl')
            && this.host.getAttribute('label')!==this.host.getAttribute('lbl')) throw new Error('Conflicting label and lbl captions');
        const aliases=this.getRawAttributes('lbl_');
        const canonical=this.options.explicit ? this.getRawAttributes('label_') : {};
        const labelSource={...aliases,...canonical};
        if(aliases.style || canonical.style) labelSource.style=[aliases.style,canonical.style].filter(Boolean).join(';');
        const labelAttrs=this.attributes.adaptAttrs(labelSource);
        const regionAttrs = this.getAttributes('box_l_');
        if (Object.keys(regionAttrs).length && !this.labelRegion) {
            this.labelRegion = this.host.ownerDocument.createElement('div');
            this.label.replaceWith(this.labelRegion);
            this.labelRegion.appendChild(this.label);
        }
        if (this.labelRegion) {
            this.setAttributes(this.labelRegion,regionAttrs);
            this.labelRegion.classList.add('labledBox_labelRegion');
        }
        this.setAttributes(this.content,this.getAttributes('box_c_'));
        this.content.classList.add('labledBox_content');
        const boxAttrs = this.getAttributes('box_');
        this.setAttributes(this.label, labelAttrs);
        this.setAttributes(this.box, boxAttrs);
        if (this.options.explicit) {
            this.box.setAttribute('part', 'box');
            this.label.setAttribute('part', 'label');
            this.content.setAttribute('part', 'content');
        }
        this.box.className = `labledBox labledBox_${side} ${boxAttrs.class || ''}`.trim();
        this.box.classList.toggle('labledBox_group', !this.control);
        this.box.classList.toggle('labledBox_fill', Boolean(this.options.fill));
        this.label.className = `labledBox_label ${labelAttrs.class || ''}`.trim();
        this.box.style.flexDirection = direction;
        this.box.style.alignItems = ['L', 'R'].includes(this.position) ? 'center' : 'stretch';
        this.label.style.textAlign = align;
        this.label.textContent = (this.options.explicit ? this.host.getAttribute('label') : null) ?? this.host.getAttribute('lbl') ?? '';
        this.label.hidden = !this.label.textContent || Object.hasOwn(labelAttrs, 'hidden');
        if(this.labelRegion)this.labelRegion.hidden=this.label.hidden;
        if (this.control) {
            if (!this.control.id) this.control.id = 'gnr-label-control';
            this.label.htmlFor = this.control.id;
        } else {
            if (!this.label.id) this.label.id = 'gnr-widget-label';
            this.box.setAttribute('role', 'group');
            if (this.label.hidden) this.box.removeAttribute('aria-labelledby');
            else this.box.setAttribute('aria-labelledby', this.label.id);
        }
    }
}
