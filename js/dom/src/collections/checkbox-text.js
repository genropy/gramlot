// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Bag} from 'genro-bag-js';

let serial=0;
export function selectionCodes(value) {
    return [...new Set(String(value ?? '').split(',').map(code=>code.trim()).filter(Boolean))];
}
export function checkboxOptions(values, identifier, labelAttribute) {
    let rows;
    if (values instanceof Bag) {
        rows=values.getNodes().map(node=>{
            const row=node.getValue();
            const get=name=>row instanceof Bag ? row.getItem(name) : node.attr[name];
            return {code:identifier ? get(identifier) : node.label,
                label:labelAttribute ? get(labelAttribute) : node.label};
        });
    } else {
        rows=String(values ?? '').split(/[\n,]/).filter(s=>s.trim()).map(entry=>{
            const colon=entry.indexOf(':');
            return colon<0 ? {code:entry.trim(),label:entry.trim()}
                : {code:entry.slice(0,colon).trim(),label:entry.slice(colon+1).trim()};
        });
    }
    const seen=new Set();
    return rows.map(({code,label})=>{
        if (code==null || !String(code).trim() || String(code).includes(',') || label==null)
            throw new Error('checkBoxText options require a nonempty comma-free code and a label');
        code=String(code).trim();
        if(seen.has(code)) throw new Error(`Duplicate checkBoxText code: ${code}`);
        seen.add(code);
        return {code,label:String(label)};
    });
}
export function checkboxCaption(value, options) {
    const labels=new Map(options.map(o=>[o.code,o.label]));
    return selectionCodes(value).map(code=>labels.get(code) ?? code).join(',') || null;
}

/** The element projects its bound value; Data remains the selection authority. */
export function defineCheckBoxText(Base) {
    return class GnrCheckBoxText extends Base {
        static get observedAttributes() {
            return [...super.observedAttributes,'values','popup','cols','identifier','labelattribute'];
        }
        get commitOnChange() { return true; }
        mutationAttributes(value) {return {_displayedValue:checkboxCaption(value,this.options)};}
        get locked() { return this.hasAttribute('disabled') || this.hasAttribute('readonly'); }
        get popup() { return this.hasAttribute('popup') && !['false','False','0'].includes(this.getAttribute('popup')); }
        _configure(input) {
            input.readOnly=true;
            this._choices=this.ownerDocument.createElement('div');
            this._choices.className='checkbox-text-options';
            this._choices.setAttribute('role','group');
            this.installTools({isLocked:()=>this.locked});
            this._tool=this._controlTools.add({label:'Choose values',content:this._choices});
            this._tool.button.textContent='▾';
            input.addEventListener('click',()=>{if(this.popup)this._tool.open();});
            input.addEventListener('keydown',event=>{
                if(this.popup && ['ArrowDown','Enter',' '].includes(event.key)) {
                    event.preventDefault();event.stopPropagation();this._tool.open();
                }
            });
            this._choices.addEventListener('input',event=>event.stopPropagation());
            this._choices.addEventListener('pointerdown',event=>{
                // Some browsers do not focus checkboxes on mouse clicks. Keep
                // focus inside the tool boundary when clicking either label or box.
                if(this.locked)return;
                event.preventDefault();
                event.target.closest('label')?.querySelector('input')?.focus({preventScroll:true});
            });
            this._choices.addEventListener('change',event=>{
                event.stopPropagation();
                if(this.locked) {this._sync();return;}
                const code=event.target.dataset.code;
                if(code==null)return;
                const codes=selectionCodes(this.value);
                const next=event.target.checked ? [...codes,code] : codes.filter(c=>c!==code);
                this.value=selectionCodes(next.join(',')).join(',') || null;
                this.dispatchEvent(new this.ownerDocument.defaultView.Event('change',{bubbles:true,composed:true}));
            });
            this._choices.addEventListener('keydown',event=>{
                const boxes=[...this._choices.querySelectorAll('input')];
                const index=boxes.indexOf(event.target);
                if(index<0 || !['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
                event.preventDefault();event.stopPropagation();
                const next=event.key==='Home'?0:event.key==='End'?boxes.length-1:
                    Math.max(0,Math.min(boxes.length-1,index+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)));
                boxes[next]?.focus();
            });
            this._choices.addEventListener('click',event=>{if(this.locked)event.preventDefault();});
        }
        _buildContent(content) {
            super._buildContent(content);
            const style=this.ownerDocument.createElement('style');
            style.textContent='.checkbox-text-options{display:grid;gap:5px 16px;min-width:120px}.checkbox-text-options label{display:flex;align-items:center;gap:6px;white-space:nowrap}.checkbox-text-options input{width:auto;min-height:0;margin:0;accent-color:var(--accent-color,#356f9f)}';
            this.shadowRoot.append(style);
        }
        connectedCallback() {
            super.connectedCallback();
            this._input.readOnly=true;
            this._subscribe();this._sync();
        }
        disconnectedCallback() {this._unsubscribe();super.disconnectedCallback();}
        attributeChangedCallback(name,old,value) {
            if(name==='value')this.value=value;
            else if(name==='values')this.values=value;
            else {super.attributeChangedCallback(name,old,value);this._sync();}
        }
        get values() {return this._values ?? '';}
        set values(value) {this._values=value;this._subscribe();this._sync();}
        get options() {return checkboxOptions(this.values,this.getAttribute('identifier'),this.getAttribute('labelattribute'));}
        get value() {return this._value ?? null;}
        set value(value) {
            this._value=selectionCodes(value).join(',') || null;
            this._nullState?.setNull(this._value===null);
            this._sync();
        }
        _unsubscribe() {for(const [bag,id] of this._subscriptions || [])bag.unsubscribe(id,{any:true});this._subscriptions=[];}
        _subscribe() {
            this._unsubscribe();
            if(!this.isConnected || !(this.values instanceof Bag))return;
            const seen=new Set();
            const visit=bag=>{
                if(seen.has(bag))return;seen.add(bag);
                const id=`checkbox-text-${++serial}`;
                bag.subscribe(id,{any:()=>{
                    if(this._refreshQueued)return;this._refreshQueued=true;
                    queueMicrotask(()=>{this._refreshQueued=false;if(this.isConnected){this._subscribe();this._sync();}});
                }});
                this._subscriptions.push([bag,id]);
                for(const node of bag.getNodes())if(node.getValue() instanceof Bag)visit(node.getValue());
            };
            visit(this.values);
        }
        _sync() {
            if(!this._tool)return;
            const options=this.options, codes=new Set(selectionCodes(this.value));
            const signature=JSON.stringify(options);
            if(this._optionsSignature!==signature) {
                const focused=this.shadowRoot.activeElement?.dataset?.code;
                this._choices.replaceChildren(...options.map(option=>{
                    const label=this.ownerDocument.createElement('label'),box=this.ownerDocument.createElement('input');
                    box.type='checkbox';box.dataset.code=option.code;
                    label.append(box,this.ownerDocument.createTextNode(option.label));return label;
                }));
                this._optionsSignature=signature;
                if(focused!=null)([...this._choices.querySelectorAll('input')].find(box=>box.dataset.code===focused) || this._choices.querySelector('input') || this._input).focus();
            }
            for(const box of this._choices.querySelectorAll('input')) {box.checked=codes.has(box.dataset.code);box.disabled=this.locked;}
            this._choices.style.gridTemplateColumns=`repeat(${Math.max(1,parseInt(this.getAttribute('cols') || '1',10)||1)},max-content)`;
            this._choices.setAttribute('aria-label',this.getAttribute('lbl') || 'Choices');
            const parent=this.popup ? this._tool.popup : this._content;
            if(this._choices.parentNode!==parent){this._tool.close();parent.append(this._choices);}
            this._controlTools.element.hidden=!this.popup;
            this._controlTools.element.style.display=this.popup?'':'none';
            this._input.readOnly=true;
            this._input.value=checkboxCaption(this.value,options) || '';
            this._input.setAttribute('aria-haspopup','dialog');
            this._controlTools.sync();
            this._scheduleCaption();
        }
        _scheduleCaption() {
            if(this._captionQueued)return;this._captionQueued=true;
            queueMicrotask(()=>{
                this._captionQueued=false;
                if(!this.isConnected || !this.sourceNode)return;
                const source=this.sourceNode,app=source.handler.application;
                if(app._disposed)return;
                const binding=source.getAttr('value');
                if(!source.pointerType(binding))return;
                const path=source.absDatapath(binding);
                // Metadata is attached to a value node, not an attribute binding.
                if(path.includes('?'))return;
                const node=app.data.getNode(path);
                if(!node)return;
                const caption=checkboxCaption(node.getValue(),this.options);
                if(node.attr._displayedValue!==caption)app.live(()=>node.setAttr({_displayedValue:caption}));
            });
        }
    };
}
