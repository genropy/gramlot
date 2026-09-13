// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {Bag} from 'genro-bag-js';

/** Document state lives in Data; this service owns only requests and lifetime. */
export class IdeDocuments {
    constructor(node, {root=null, readmethod='document_read', savemethod='document_save', previewmethod=null, writable=false}={}) {
        this.node=node;this.app=node.handler.application;
        Object.assign(this,{root,readmethod,savemethod,previewmethod,writable});
        this.path=node.absDatapath('.');this.pending=new Set();this.disposed=false;
        if (!(this.app.data.getItem(this.path) instanceof Bag)) this.app.data.setItem(this.path,new Bag());
        this.state=this.app.data.getItem(this.path);
        if (!(this.state.getItem('documents') instanceof Bag)) this.state.setItem('documents',new Bag());
        const workspace=this.state.getItem('workspace');
        if(workspace!==root && this.state.getItem('documents').getNodes().length)throw new Error('Use a separate IDE datapath for a different workspace');
        this.state.setItem('workspace',root);
    }
    get documents(){return this.state.getItem('documents');}
    get active(){return this.state.getItem('active');}
    set active(key){this.state.setItem('active',key);}
    document(key=this.active){return key ? this.documents.getItem(key) : null;}
    key(path){return 'd_'+Array.from(new TextEncoder().encode(path),b=>b.toString(16).padStart(2,'0')).join('');}
    dirty(key){const doc=this.document(key);return doc && doc.getItem('content')!==doc.getItem('saved');}
    add(path,content,language='text',extra={}){
        const key=this.key(path);
        if(!this.document(key)){
            const doc=new Bag();
            for(const [name,value] of Object.entries({path,content,saved:content,language,writable:false,editing:false,...extra})) doc.setItem(name,value);
            this.documents.setItem(key,doc);
        }
        this.active=key;return key;
    }
    async open(path){
        const key=this.key(path);
        if(this.document(key)){this.active=key;return key;}
        if(this.pending.has(key)){this.app.feedback.busy(this.node);return null;}
        this.pending.add(key);
        try{
            const record=await this.app.server.call(this.readmethod,{root:this.root,path},{owner:this});
            if(this.disposed)return null;
            if(typeof record.content!=='string'||typeof record.revision!=='string')throw new Error('Invalid document response');
            return this.add(path,record.content,record.language,{revision:record.revision,writable:record.writable===true});
        }finally{this.pending.delete(key);}
    }
    async save(key=this.active){
        const doc=this.document(key);
        if(!doc || !this.writable || !doc.getItem('writable'))throw new Error('Document is read-only');
        if(this.pending.has(key)){this.app.feedback.busy(this.node);return {status:'busy'};}
        if(!this.dirty(key))return {status:'unchanged'};
        const content=doc.getItem('content');this.pending.add(key);
        try{
            const result=await this.app.server.call(this.savemethod,{root:this.root,path:doc.getItem('path'),content,revision:doc.getItem('revision')},{owner:this});
            if(this.disposed)return {status:'obsolete'};
            if(typeof result.revision!=='string')throw new Error('Invalid save response');
            doc.setItem('revision',result.revision);doc.setItem('saved',content);
            return {status:'saved'};
        }finally{this.pending.delete(key);}
    }
    async preview(key=this.active){
        const doc=this.document(key);
        if(!doc)throw new Error('No document selected');
        const content=doc.getItem('content');
        if(!this.previewmethod)return {html:content};
        const result=await this.app.server.call(this.previewmethod,
            {root:this.root,path:doc.getItem('path'),content},{owner:this});
        if(this.disposed || this.document(key)!==doc || doc.getItem('content')!==content)return null;
        if(typeof result?.html!=='string')throw new Error('Invalid preview response');
        return result;
    }
    revert(key=this.active){
        if(this.pending.has(key))return {status:'busy'};
        const doc=this.document(key);
        if(doc)doc.setItem('content',doc.getItem('saved'));
        return {status:'reverted'};
    }
    close(key,{discard=false}={}){
        if(this.pending.has(key))return {status:'busy'};
        if(this.dirty(key)&&!discard)return {status:'needs-discard'};
        this.documents.popNode(key);
        if(this.active===key)this.active=this.documents.getNodes()[0]?.label??null;
        return {status:'closed'};
    }
    dispose(){this.disposed=true;this.app.server.cancel(this);}
}
