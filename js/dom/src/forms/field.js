// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** One source-owned field lifecycle. Parsed invalid drafts can enter a form Bag;
 * parse failures cannot. Generation/signature checks protect every async effect. */
import {fromTytx} from 'genro-tytx';
import {setFieldState, clearFieldState} from '../components/field-state.js';

export class FormField {
    constructor(service,node,form,property) {
        this.service=service; this.application=service.application;
        this.node=node; this.form=form; this.property=property;
        this.pending=false; this.issues=[]; this.generation=0; this.editorDirty=false;
        this.signature=null; this.disposed=false; this.parseError=false;
    }
    get widget() { return this.application.target._byId(this.application.builder.targetId(this.node)); }
    get attrs() { return this.service.getAttributes(this.node); }
    get path() { return this.node.absDatapath(this.node.getAttr(this.property)); }
    get storedValue() { return this.application.data.getItem(this.path); }
    get locked() { return Boolean(this.attrs.disabled || this.attrs.readonly || this.form?.locked || this.form?.loading); }
    getSignature() {
        const attrs=this.attrs;
        const config=Object.fromEntries(Object.entries(attrs).filter(([key])=>key.startsWith('validate_') || key==='blankIsNull' || key==='dtype'));
        const paths=typeof attrs.validate_depends==='string' ? attrs.validate_depends.split(',').map(p=>p.trim()).filter(Boolean) : attrs.validate_depends || [];
        if (!Array.isArray(paths)) throw new Error('validate_depends must be a path list');
        return this.service.snapshot.copy({path:this.path,value:this.storedValue,config,
            dependencies:paths.map(path=>this.application.data.getItem(this.node.absDatapath(path)))});
    }
    sync() {
        if(this.form?.loading){this.render();return;}
        const next=this.getSignature();
        if (this.form?.baseline && this.signature && next.config.blankIsNull!==this.signature.config.blankIsNull) {
            this.invalidate();this.policyChanged=true;
            this.issues=[{rule:'configuration',code:'normalization_changed',severity:'error',message:'Reload or restore the form after changing blankIsNull.'}];
            this.render();return;
        }
        if (this.editorDirty) { this.render();return; }

        if (!this.service.snapshot.equal(next,this.signature)) {
            const retainDraft=this.signature && this.service.snapshot.equal(next.value,this.signature.value)
                && next.path===this.signature.path && this.hasCandidate;
            if (this.parseError && retainDraft) { this.signature=next;this.render();return; }
            this.validate(retainDraft ? this.candidate : this.storedValue,false);
        } else this.render();
    }
    readCandidate() {
        const widget=this.widget;
        const control=widget?.fieldControl || widget?._input || widget;
        if (!control) return {ok:false,message:'The editor is unavailable.'};
        const editorCandidate = widget.readEditorCandidate?.();
        if (editorCandidate) return editorCandidate;
        if (control.validity?.badInput) return {ok:false,message:'Complete the value before saving.'};
        let value=widget[this.property];
        if (widget.constrained) {
            const matches=widget.options.filter(option=>option.caption===control.value);
            if (control.value && matches.length!==1) return {ok:false,message:'Select one of the available values.'};
            value=widget.isNullValue ? null : (matches[0]?.id ?? '');
        } else if (control.validity?.customError) return {ok:false,message:control.validationMessage};
        if (typeof value==='number' && !Number.isFinite(value)) return {ok:false,message:'Enter a finite number.'};
        const dtype=this.attrs.dtype;
        if (value!=='' && value!=null && dtype && !['T','A'].includes(dtype) && typeof value==='string') {
            const encoded=`${value}::${dtype}`;
            const typed=fromTytx(encoded);
            if (typed===encoded || (typed instanceof Date && !Number.isFinite(typed.getTime())) || (typeof typed==='number' && !Number.isFinite(typed))) {
                return {ok:false,message:`Invalid ${dtype} value.`};
            }
            value=typed;
        }
        return {ok:true,value};
    }
    commit(value,readEditor=false) {
        if (this.locked || this.policyChanged) return;
        const parsed=readEditor ? this.readCandidate() : {ok:!(typeof value==='number' && !Number.isFinite(value)),value};
        this.editorDirty=false;
        if (!parsed.ok) {
            this.invalidate();this.parseError=true;this.hasCandidate=true;
            this.issues=[{rule:'parse',code:'parse',severity:'error',message:parsed.message || 'Invalid typed value.'}];
            this.signature=this.getSignature();this.render();return;
        }
        this.parseError=false;this.hasCandidate=true;
        this.validate(parsed.value,true);
    }
    flushEditor() {
        const widget=this.widget, control=widget?.fieldControl || widget?._input || widget;
        const focused=widget?.shadowRoot?.activeElement===control || this.application.target.root.ownerDocument.activeElement===control;
        if (this.editorDirty || focused) {
            const parsed=this.readCandidate();
            if (this.editorDirty || !parsed.ok || !this.service.snapshot.equal(parsed.value,this.storedValue)) this.commit(null,true);
        }
    }
    invalidate() {
        this.generation++;this.abort?.abort();clearTimeout(this.timer);this.pending=false;
    }
    validate(value,userChange) {
        this.invalidate();this.parseError=false;
        const attrs=this.attrs;
        if (this.widget?.constrained && attrs.validate_select===undefined) attrs.validate_select=true;
        if (attrs.blankIsNull===true && value==='') value=null;
        this.candidate=value;
        this.abort=new AbortController();
        const token=this.generation;
        const result=this.application.vld.validate(this.node,value,{attrs,widget:this.widget,signal:this.abort.signal});
        const initial=result.initial || result;
        if (this.form) this.write(initial.value,userChange);
        this.signature=this.getSignature();
        if (result && typeof result.then==='function') {
            this.pending=true;this.issues=initial.issues;this.render();
            const timeout=attrs.validate_timeout ?? 10000;
            const timed=new Promise(resolve=>{
                this.timer=setTimeout(()=>resolve({value,issues:[{rule:'remote',code:'timeout',severity:'error',message:'Validation timed out.'}]}),timeout);
                Promise.resolve(result).then(resolve);
            });
            timed.then(final=>{
                if (!this.isCurrent(token)) return;
                clearTimeout(this.timer);this.finish(final,userChange,token);
            });
        } else this.finish(result,userChange,token);
    }
    isCurrent(token) {
        return !this.disposed && !this.application._disposed && token===this.generation
            && this.service.hasNode(this.node) && this.service.snapshot.equal(this.signature,this.getSignature());
    }
    finish(result,userChange,token) {
        if (!this.isCurrent(token)) return;
        this.pending=false;
        if (result.modified && !result.issues.some(i=>i.severity==='error')) {
            const attrs={...this.attrs};delete attrs.validate_call;delete attrs.validate_remote;
            const checked=this.application.vld.validate(this.node,result.value,{attrs,widget:this.widget});
            result={...checked,issues:[...result.issues,...checked.issues]};
        }
        this.issues=result.issues;this.candidate=result.value;
        const invalid=this.issues.some(issue=>issue.severity==='error');
        if (this.form || !invalid) {
            this.write(result.value,userChange);
            this.hasCandidate=false;
            this.setEditorValue(result.value);
        }
        this.signature=this.getSignature();this.render();
        if (userChange) {
            const attrs=this.attrs, callback=attrs[invalid?'validate_onReject':'validate_onAccept'];
            if (callback) queueMicrotask(()=>{
                if (!this.isCurrent(token)) return;
                const output={...result,error:this.issues.find(i=>i.severity==='error')?.message,
                    warnings:this.issues.filter(i=>i.severity==='warning').map(i=>i.message)};
                this.application.live(()=>{
                    if (typeof callback==='function') callback.call(this.node,result.value,output,attrs,undefined,true);
                    else this.application._recipeRuntime.evaluate(this.node,callback,{value:result.value,result:output,validations:attrs,rowIndex:undefined,userChange:true});
                });
            });
        }
        this.service.publishState();
    }
    write(value,explicit=false) {
        const [path,attribute]=this.path.split('?');
        const node=this.application.data.getNode(path);
        const present=node && (!attribute || Object.hasOwn(node.getAttr(),attribute));
        if ((!explicit || present) && this.service.snapshot.equal(value,this.storedValue)) return;
        this.service.writing++;
        try { this.application._writeMutation(this.node,value); }
        finally { this.service.writing--; }
    }
    setEditorValue(value) {
        const widget=this.widget;
        if (widget && !this.editorDirty) {
            let display=value;
            const control = widget.fieldControl || widget._input;
            if (value instanceof Date && control) {
                if (control.type==='date') display=value.toISOString().slice(0,10);
                if (control.type==='time') display=value.toISOString().slice(11,23);
            }
            widget[this.property]=display;
        }
    }
    markEdited(event) {
        if (this.locked || (event && this.lastEditEvent === event)) return;
        this.lastEditEvent = event;
        this.invalidate(); this.editorDirty = true; this.service.publishState();
    }
    render() {
        const widget=this.widget, input=widget?.fieldControl || widget?._input || widget;
        if (!input) return;
        widget._formField=this;
        if (this.input!==input) {
            this.input?.removeEventListener('input',this.onEdit,true);
            this.input=input;
            this.onEdit=event=>this.markEdited(event);
            input.addEventListener('input',this.onEdit,true);
        }
        if (widget.fieldControl || widget._input) input.disabled=Boolean(this.attrs.disabled || this.form?.locked || this.form?.loading);
        const invalid=this.issues.some(issue=>issue.severity==='error');
        if (widget.setFieldState) widget.setFieldState({invalid, pending:this.pending, issues:this.issues});
        else setFieldState(widget, {invalid, pending:this.pending, issues:this.issues});
    }
    dispose() {
        this.disposed=true;this.invalidate();
        this.input?.removeEventListener('input',this.onEdit,true);
        const widget=this.widget;
        if (!widget) return;
        widget._formField=null;
        clearFieldState(widget);
    }
}
