// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {parseDateExpression} from '../date-parser/index.js';
import {formatCivil} from './date-calendar.js';
import {fromTytx} from 'genro-tytx';

function typedDate(iso) {
    if(!iso) return null;
    const value=fromTytx(`${iso}::D`);
    // TYTX's Date.UTC carrier constructor treats years 00–99 as 1900–1999.
    value.setUTCFullYear(Number(iso.slice(0,4)));
    return value;
}

/** A free text draft, separate from the committed typed date. */
export class SymbolicDateEditor {
    constructor(host, input) {
        this.host=host; this.input=input; this.editing=false; this.committed=null;
        const doc=host.ownerDocument;
        this.message=doc.createElement('small'); this.message.id='date-message';
        this.message.setAttribute('aria-live','polite'); this.message.hidden=true;
        this.tools=host.installTools({onLeave:()=>this.confirm(), onCancel:()=>this.cancel()});
        this.calendar=doc.createElement('gnr-datecalendar');
        const icon=doc.createElementNS('http://www.w3.org/2000/svg','svg');
        icon.setAttribute('width','16'); icon.setAttribute('height','16'); icon.setAttribute('viewBox','0 0 24 24');
        icon.setAttribute('fill','none'); icon.setAttribute('stroke','currentColor'); icon.setAttribute('stroke-width','2');
        icon.setAttribute('aria-hidden','true');
        icon.innerHTML='<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18"/>';
        this.tool=this.tools.add({label:'Open calendar',icon,content:this.calendar,
            onOpen:()=>{
                const policy=this.policy || this.context();
                const result=parseDateExpression(this.input.value,policy);
                const value=result.ok ? (result.kind==='date'?result.date:result.start) : this.committed?.toISOString().slice(0,10);
                this.calendar.configure({...policy,value});
            }, focus:()=>this.calendar.focusDay()});
        this.button=this.tool.button; this.popup=this.tool.popup;
        // Alt+Down opens the calendar; Tab leaves the text editor directly.
        this.button.tabIndex=-1;
        this.calendar.addEventListener('date-select',event=>{
            if(this.locked) return;
            const policy=this.policy || this.context();
            this.input.value=event.detail.value ? formatCivil(event.detail.value,policy.locale) : '';
            this.input.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true,composed:true}));
        });
        input.addEventListener('input',()=> { if(!this.editing) this.policy=this.context(); this.editing=true; this.error(); });
        input.addEventListener('keydown',event=> {
            if(this.locked || event.isComposing) return;
            // Empty text is still a draft until confirmation; bypass scalar null clearing.
            if(event.key==='Backspace' && !input.value) event.stopImmediatePropagation();
            if(event.key==='Enter') { event.preventDefault(); this.confirm(); this.close(); }
            if(event.key==='ArrowDown' && event.altKey) { event.preventDefault(); this.open(); }
        });
        // Prevent a native change from escaping before parsing (including invalid drafts).
        input.addEventListener('change',event=>event.stopImmediatePropagation());
    }
    get enabled() { return this.host.hasAttribute('symbolic') && !['false','False','0'].includes(this.host.getAttribute('symbolic')); }
    get locked() { return this.input.disabled || this.input.readOnly || this.host.hasAttribute('disabled') || this.host.hasAttribute('readonly'); }
    context() {
        const now=new Date();
        const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        return {locale:this.host.getAttribute('locale') || this.host.ownerDocument.documentElement.lang || 'en', workdate:this.host.getAttribute('workdate') || today};
    }
    sync() {
        this.tools.sync();
        const it=this.context().locale.toLowerCase().startsWith('it');
        const label=it?'Apri calendario':'Open calendar';
        this.tool.setLabel(label);
        if(this.locked) this.close();
        if(!this.editing) this.display();
    }
    error(message='') {
        this.input.setCustomValidity(message); this.input.setAttribute('aria-invalid',String(Boolean(message)));
        this.message.textContent=message; this.message.hidden=!message;
        const ids=new Set((this.input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        if(message) ids.add(this.message.id); else ids.delete(this.message.id);
        if(ids.size) this.input.setAttribute('aria-describedby',[...ids].join(' ')); else this.input.removeAttribute('aria-describedby');
    }
    accept() {
        if(this.locked) return {ok:true,value:this.committed};
        const text=this.input.value.trim(), policy=this.policy || this.context();
        const result=text ? parseDateExpression(text,policy):null;
        const it=policy.locale.toLowerCase().startsWith('it');
        let message=result && !result.ok ? (it
            ? 'Data o espressione non valida. Esempi: 01/03/2026, oggi, oggi+15.'
            : result.error.message) : '';
        if(text && !this.enabled && (!/^[\d/ .-]+$/.test(text) || result?.kind!=='date')) message=it ? 'Inserisci una data completa.' : 'Enter a complete date.';
        const iso=result?.ok ? (result.kind==='date'?result.date:result.start) : null;
        if(result?.ok && !iso) message=it ? 'Il periodo deve avere una data iniziale.' : 'This date field requires a starting date.';
        if(message) { this.error(message); this.editing=true; return {ok:false,message}; }
        this.committed=typedDate(iso);
        this.editing=false; this.policy=null; this.error(); this.display();
        return {ok:true,value:this.committed};
    }
    display() {
        this.input.value=this.committed ? formatCivil(this.committed.toISOString().slice(0,10),this.context().locale):'';
        this.host._nullState?.setNull(this.committed==null);
    }
    cancel() {
        this.editing=false; this.policy=null; this.error(); this.display(); this.close();
        const field=this.host._formField;
        if(field) { field.editorDirty=false; field.parseError=false; field.hasCandidate=false; field.signature=null; field.sync(); }
    }
    confirm() { if(this.editing && !this.locked && this.accept().ok) this.emitChange(); }
    emitChange() { this.host.dispatchEvent(new this.host.ownerDocument.defaultView.Event('change',{bubbles:true,composed:true})); }
    setValue(value) {
        if(value instanceof Date || value==null || value==='') this.committed=value || null;
        else {
            const result=parseDateExpression(String(value),this.context());
            if(!result.ok || result.kind!=='date') return;
            this.committed=typedDate(result.date);
        }
        if(!this.editing) this.display();
    }
    open() { this.tool.open(); }
    close() { this.tools.close(); }
}
