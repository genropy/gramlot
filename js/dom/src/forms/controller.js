// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Portable form over one Bag subtree. Persistence sees detached snapshots;
 * restoreBaseline restores data, unlike legacy reset (tracking only). */
import {Bag} from 'genro-bag-js';
import {MemoryStore} from './value-snapshot.js';

export class FormController {
    constructor(service,node) {
        this.service=service;this.application=service.application;this.sourceNode=node;
        this.path=node.absDatapath('.');this.formId=node.getAttr('formId');
        this.baseline=null;this.store=null;this.operation=null;this._resetErrors();
        this.persistenceError=null;this.disposed=false;this.operationSerial=0;
    }
    _resetErrors() {
        this.formErrors?.unsubscribe('form_errors',{any:true});
        this.formErrors=new Bag();
        this.formErrors.subscribe('form_errors',{any:()=>this.service.publishState()});
    }
    get data() {
        const data=this.application.data.getItem(this.path);
        if (!(data instanceof Bag)) throw new Error('A form datapath must contain a Bag');
        return data;
    }
    get fields() { return [...this.service.fields.values()].filter(field=>field.form===this); }
    get attrs() { return this.service.getAttributes(this.sourceNode); }
    get locked() { const attrs=this.attrs;return Boolean(attrs.locked || attrs.readonly || attrs.disabled); }
    get loading() { return this.operation==='loading'; }
    get state() {
        const issues=this.fields.flatMap(field=>field.issues.map(issue=>({...issue,path:field.path,fieldId:this.application.builder.targetId(field.node)})));
        for(const node of this.formErrors.getNodes()) issues.push({rule:'form',code:node.label,severity:'error',message:String(node.value)});
        const errors=issues.filter(issue=>issue.severity==='error'),warnings=issues.filter(issue=>issue.severity==='warning');
        const pending=this.fields.filter(field=>field.pending).length;
        return {dirty:this.baseline!==null && !this.service.snapshot.equal(this.service.snapshot.copy(this.data),this.baseline),
            valid:errors.length===0 && pending===0,pending,errors,warnings,loading:this.loading,saving:this.operation==='saving',
            locked:this.locked,editorDirty:this.fields.some(field=>field.editorDirty || field.parseError),persistenceError:this.persistenceError};
    }
    initialize() {
        this.baseline=this.service.snapshot.copy(this.data);
        const store=this.attrs.store;
        this.store=store==null || store==='memory' ? new MemoryStore(this.baseline) : store;
        if (typeof this.store?.load!=='function' || typeof this.store?.save!=='function') throw new Error('A form store must provide load and save');
    }
    async restoreBaseline() {
        if (this.disposed) return {status:'disposed'};
        if (this.operation) return {status:'busy'};
        this._replace(this.baseline);
        return {status:'restored'};
    }
    _replace(data) {
        const snapshot=this.service.snapshot.copy(data);
        if (!(snapshot instanceof Bag)) throw new Error('A store must return a Bag');
        this.service.writing++;
        try {
            for(const field of this.fields) {field.invalidate();field.signature=null;field.editorDirty=false;field.parseError=false;field.hasCandidate=false;field.policyChanged=false;}
            this.application.live(()=>this.application.data.setItem(this.path,snapshot));
        } finally {this.service.writing--;}
        this._resetErrors();this.persistenceError=null;
        this.service.sync();
        this.baseline=this.service.snapshot.copy(this.data);
        this.service.publishState();
    }
    async load(options={}) {
        if (this.disposed) return {status:'disposed'};
        if (this.operation) return {status:'busy'};
        this.service.sync();
        if ((this.state.dirty || this.state.editorDirty) && !options.discardChanges) return {status:'needs-discard'};
        const before=this.service.snapshot.copy(this.data);
        this.operation='loading';this.persistenceError=null;
        for(const field of this.fields){field.invalidate();field.signature=null;}
        const serial=++this.operationSerial;this.abort=new AbortController();this.service.publishState();
        try {
            const result=await this.store.load({signal:this.abort.signal,operationId:serial});
            if (this.disposed || serial!==this.operationSerial) return {status:'obsolete'};
            if (!this.service.snapshot.equal(before,this.service.snapshot.copy(this.data))) return {status:'conflict'};
            this.operation=null;
            this._replace(result.data);
            return {status:'loaded'};
        } catch(error) {
            if (this.disposed) return {status:'obsolete'};
            this.persistenceError=error.message;return {status:'failed',error};
        } finally { if (!this.disposed) {this.operation=null;this.service.sync();this.service.publishState();} }
    }
    async save() {
        if (this.disposed) return {status:'disposed'};
        if (this.operation) return {status:'busy'};
        this.service.sync();
        for(const field of this.fields) field.flushEditor();
        this.service.sync();
        if (!this.state.valid || this.state.editorDirty || this.locked) {
            this.focusInvalid();return {status:'blocked'};
        }
        if (!this.state.dirty) return {status:'unchanged'};
        const saved=this.service.snapshot.copy(this.data);
        this.operation='saving';this.persistenceError=null;
        const serial=++this.operationSerial;this.abort=new AbortController();this.service.publishState();
        try {
            await this.store.save(this.service.snapshot.copy(saved),{signal:this.abort.signal,operationId:serial});
            if (this.disposed || serial!==this.operationSerial) return {status:'obsolete'};
            this.baseline=saved;
            return {status:'saved'};
        } catch(error) {
            if (this.disposed) return {status:'obsolete'};
            this.persistenceError=error.message;return {status:'failed',error};
        } finally { if (!this.disposed) {this.operation=null;this.service.publishState();} }
    }
    focusInvalid() {
        for(const field of this.fields) {
            const widget=field.widget;
            if (!field.issues.some(issue=>issue.severity==='error') || field.locked || !widget) continue;
            let hidden=false;
            for(let ancestor=widget;ancestor;ancestor=ancestor.parentElement) {
                const style=widget.ownerDocument.defaultView.getComputedStyle(ancestor);
                if(ancestor.hidden || style.display==='none' || style.visibility==='hidden'){hidden=true;break;}
            }
            if(hidden)continue;
            (widget._input || widget).focus();return;
        }
        this.application.target._byId(this.application.builder.targetId(this.sourceNode))?._summary?.focus();
    }
    dispose() { this.disposed=true;this.operationSerial++;this.abort?.abort();this.formErrors.unsubscribe("form_errors",{any:true}); }
}
