// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Page-owned form/field registry. Source identity defines lifetime; signatures
 * cover value, configuration and declared dependencies. Data events schedule a
 * bounded reconciliation pass, while live batches reconcile synchronously. */
import {Bag} from 'genro-bag-js';
import {SourceBag} from '../source-bag.js';
import {RecipePolicies} from '../recipe-policies.js';
import {ValueSnapshot} from './value-snapshot.js';
import {FormController} from './controller.js';
import {FormField} from './field.js';

export class FormService {
    constructor(application) {
        this.application=application;this.fields=new Map();this.controllers=new Map();
        this.snapshot=new ValueSnapshot();this.policies=new RecipePolicies();this.writing=0;
        this.syncing=false;this.queued=false;this.disposed=false;this.nodes=new Set();
    }
    start() {
        this.application.data.subscribe('forms',{any:()=>this.schedule()});
        this.application.builder.source.subscribe('forms',{any:()=>this.schedule()});
        this.sync();
    }
    schedule() {
        if (this.disposed || this.queued || this.writing) return;
        this.queued=true;
        queueMicrotask(()=>{this.queued=false;if(!this.disposed)this.sync();});
    }
    getAttributes(node) {
        return Object.fromEntries(Object.entries(this.policies.getAttributes(node)).map(([key,value])=>
            [key, this.policies.getValue(node,value)]));
    }
    hasNode(node) {
        let found=false;
        const visit=bag=>{for(const child of bag.getNodes()) {if(child===node)found=true;if(child.value instanceof SourceBag)visit(child.value);}};
        visit(this.application.builder.source);return found;
    }
    getForm(node) {
        for(let current=node;current;current=current.parentNode) if(this.controllers.has(current))return this.controllers.get(current);
        return null;
    }
    sync() {
        if (this.disposed || this.syncing || this.writing || !this.application.builder) return;
        this.syncing=true;
        try {
            const nodes=[];
            const visit=bag=>{for(const node of bag.getNodes()) {nodes.push(node);if(node.value instanceof SourceBag)visit(node.value);}};
            visit(this.application.builder.source);this.nodes=new Set(nodes);
            for(const [node,controller] of this.controllers) if((!this.nodes.has(node) || node.nodeTag!=='form' || node._getMeta('render_tag')!=='gnr-form')) {controller.dispose();this.controllers.delete(node);}
            for(const [node,field] of this.fields) if(!this.nodes.has(node)) {field.dispose();this.fields.delete(node);}
            const ids=new Set();
            for(const node of nodes) {
                if(node.nodeTag!=='form' || node._getMeta('render_tag')!=='gnr-form')continue;
                const id=node.getAttr('formId');
                if(!id || ids.has(id))throw new Error('Each form requires a unique formId within its page');
                ids.add(id);
                if(!this.controllers.has(node)) {
                    if(this.getForm(node.parentNode))throw new Error('Nested form ownership is unsupported');
                    const controller=new FormController(this,node);
                    for(const other of this.controllers.values()) {
                        if(controller.path===other.path || controller.path.startsWith(other.path+'.') || other.path.startsWith(controller.path+'.')) {
                            throw new Error('Form data scopes must not overlap');
                        }
                    }
                    if (this.application.data.getItem(controller.path)==null) {
                        this.application.live(()=>this.application.data.setItem(controller.path,new Bag()));
                    }
                    this.controllers.set(node,controller);
                }
                const controller=this.controllers.get(node);
                if(node.absDatapath('.')!==controller.path)throw new Error('Recreate the form to change its datapath');
            }
            for(const node of nodes) {
                if(node._getMeta('data_element'))continue;
                const property=node.pointerType(node.getAttr('value')) ? 'value' : node.pointerType(node.getAttr('checked')) ? 'checked' : null;
                const attrs=this.getAttributes(node),form=this.getForm(node);
                const participating=property && (form || attrs.blankIsNull!==undefined || Object.keys(attrs).some(key=>key.startsWith('validate_')));
                if (!participating) {if(this.fields.has(node)){this.fields.get(node).dispose();this.fields.delete(node);}continue;}
                const path=node.absDatapath(node.getAttr(property));
                if (form && !path.startsWith(form.path+'.')) throw new Error(`Field binding ${path} is outside its form`);
                let field=this.fields.get(node);
                if(field && (field.form!==form || field.property!==property)) {field.dispose();this.fields.delete(node);field=null;}
                if(!field){field=new FormField(this,node,form,property);this.fields.set(node,field);}
                field.sync();
            }
            // Later fields can normalize dependencies read by earlier fields.
            for(let pass=0;pass<16;pass++) {
                const stale=[...this.fields.values()].filter(field=>!field.form?.loading && !field.editorDirty && !field.parseError && !field.policyChanged
                    && !this.snapshot.equal(field.signature,field.getSignature()));
                if(!stale.length)break;
                if(pass===15) {
                    for(const field of stale) {
                        field.invalidate();field.signature=field.getSignature();
                        field.issues=[{rule:'configuration',code:'cycle',severity:'error',message:'Validation dependencies did not converge.'}];
                        field.render();
                    }
                    break;
                }
                for(const field of stale)field.sync();
            }
            for(const controller of this.controllers.values()) if(controller.baseline===null)controller.initialize();
        } finally { this.syncing=false; }
        this.publishState();
    }
    commit(node,value,readEditor=false) {
        this.sync();const field=this.fields.get(node);
        if (!field) return false;
        field.commit(value,readEditor);this.sync();this.publishState();return true;
    }
    publishState() {
        if(this.disposed || this.syncing || this.writing)return;
        this.writing++;
        try {
            for(const controller of this.controllers.values()) {
                if(controller.baseline===null)continue;
                const state=controller.state;
                for(const field of controller.fields)field.render();
                const host=this.application.target._byId(this.application.builder.targetId(controller.sourceNode));
                if(host?._summary) {
                    const text=[...state.errors,...state.warnings].map(i=>i.message).join(' ');
                    if(host._summary.textContent!==text)host._summary.textContent=text;
                    host._summary.hidden=!text;
                }
                const pointer=controller.attrs.controllerPath;
                if(pointer) {
                    const path=controller.sourceNode.absDatapath(pointer);
                    if(path===controller.path || path.startsWith(controller.path+'.') || controller.path.startsWith(path+'.'))throw new Error('controllerPath must be outside form data');
                    const projection=new Bag(state);
                    if(!this.snapshot.equal(this.application.data.getItem(path),projection))this.application.live(()=>this.application.data.setItem(path,projection));
                }
            }
        } finally {this.writing--;}
    }
    dispose() {
        this.disposed=true;
        this.application.data.unsubscribe('forms',{any:true});
        this.application.builder?.source.unsubscribe('forms',{any:true});
        for(const field of this.fields.values())field.dispose();
        for(const controller of this.controllers.values())controller.dispose();
        this.fields.clear();this.controllers.clear();
    }
}
