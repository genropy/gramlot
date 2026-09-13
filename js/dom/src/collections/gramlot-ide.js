// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {defineHtmlEditor} from './html-editor.js';
import {IdeDocuments} from '../services/ide-documents.js';

export function defineGramlotIde(){
    defineHtmlEditor();
    if(customElements.get('gnr-gramlotide'))return;
    customElements.define('gnr-gramlotide',class GramlotIde extends HTMLElement{
        constructor(){super();this.attachShadow({mode:'open'});}
        connectedCallback(){
            if(this.model)return;
            const root=this.getAttribute('root');
            this.model=new IdeDocuments(this.sourceNode,{root,writable:this.hasAttribute('writable') && this.getAttribute('writable')!=='false',
                previewmethod:this.getAttribute('previewmethod'),readmethod:this.getAttribute('readmethod')||'document_read',savemethod:this.getAttribute('savemethod')||'document_save'});
            this.shadowRoot.innerHTML=`<style>
            :host{display:block;min-height:350px;height:var(--ide-height,550px);color:#394350;font:13px system-ui}
            .layout{display:flex;height:100%;border:1px solid #d9dfe6;border-radius:5px;overflow:hidden}
            aside{width:var(--ide-tree-width,210px);min-width:100px;max-width:65%;overflow:auto;background:#f7f8fa;padding:5px}
            .split{width:4px;flex:none;cursor:col-resize;position:relative;background:#edf0f4;touch-action:none}.split:after{content:'';position:absolute;top:45%;height:28px;left:1px;width:1px;background:#9eacbd;border-radius:2px}
            main{min-width:0;flex:1;display:flex;flex-direction:column;background:#282c34}.bar{display:flex;gap:6px;align-items:center;padding:5px;background:#f7f8fa}
            .tabs{flex:1;min-height:0;--tab-pane-padding:0}gnr-tab{height:100%}.bar{justify-content:flex-end}
            button{font:inherit;color:inherit;border:1px solid #d5dce5;background:#fff;border-radius:3px;padding:3px 7px;cursor:pointer}button:disabled{opacity:.45;cursor:default}
            .editor{flex:1;min-height:0;overflow:auto}.status{margin:0;background:#f7f8fa;padding:5px;min-height:16px}.confirm{padding:7px;background:#fff4dd}.confirm[hidden]{display:none}
            gnr-codemirror{--code-editor-height:100%;height:100%;--code-editor-font-size:12px;border:0}
            </style><div class="layout"><aside aria-label="Files"></aside><div class="split" role="separator" aria-label="Resize file tree" aria-orientation="vertical" tabindex="0"></div><main><div class="confirm" hidden>Unsaved changes. <button class="discard">Discard and close</button> <button class="keep">Keep editing</button></div><gnr-tabcontainer class="tabs"></gnr-tabcontainer><p class="status" role="status"></p></main></div>`;
            const aside=this.shadowRoot.querySelector('aside'),split=this.shadowRoot.querySelector('.split');
            const resize=width=>{aside.style.width=Math.max(100,Math.min(this.clientWidth*.65,width))+'px';};
            split.onpointerdown=event=>{
                event.preventDefault();split.setPointerCapture(event.pointerId);
                const x=event.clientX,width=aside.getBoundingClientRect().width;
                split.onpointermove=e=>resize(width+e.clientX-x);
                split.onpointerup=split.onpointercancel=()=>{split.onpointermove=null;};
            };
            split.onkeydown=event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();resize(aside.getBoundingClientRect().width+(event.key==='ArrowLeft'?-10:10));}};
            this.parts=Object.fromEntries(['tabs','status','confirm','discard','keep'].map(k=>[k,this.shadowRoot.querySelector('.'+k)]));
            this.parts.tabs.addEventListener('gnr-stack-selection',e=>{
                if(!this.rendering&&e.detail.pageName&&this.model.active!==e.detail.pageName)this.model.active=e.detail.pageName;
            });
            this.parts.tabs.addEventListener('gnr-before-close',e=>{
                e.preventDefault();const key=e.detail.pageName;const result=this.model.close(key);
                if(result.status==='needs-discard'){this.closeKey=key;this.parts.confirm.hidden=false;}
                else if(result.status==='busy')this.parts.status.textContent='Wait for the pending operation';
            });
            this.parts.discard.onclick=()=>{this.model.close(this.closeKey,{discard:true});this.parts.confirm.hidden=true;};
            this.parts.keep.onclick=()=>{this.parts.confirm.hidden=true;};
            this.onState=()=>this.render();this.model.state.subscribe('ide-ui',{any:this.onState});
            this.beforeUnload=e=>{if(this.model.documents.getNodes().some(n=>this.model.dirty(n.label))){e.preventDefault();e.returnValue='';}};
            window.addEventListener('beforeunload',this.beforeUnload);
            if(root){
                this.tree=document.createElement('gnr-filesystemtree');this.shadowRoot.querySelector('aside').append(this.tree);
                this.tree.addEventListener('filesystem-open',e=>this.run(()=>this.model.open(e.detail.path),'Opened'));
                this.run(async()=>{const bag=await this.model.app.server.call(this.getAttribute('treemethod')||'directory_tree',{root},{owner:this.model});
                    if(this.model&&!this.model.disposed)this.tree.storeBag=bag;},'');
            }else {aside.hidden=true;split.hidden=true;}
            if(this.hasAttribute('content'))this.model.add(this.getAttribute('filename')||'scratch.py',this.getAttribute('content'),this.getAttribute('language')||'python');
            if(root&&this.hasAttribute('initialpath'))this.run(()=>this.model.open(this.getAttribute('initialpath')),'Opened');
            this.render();
        }
        async run(action,message){
            const model=this.model;this.parts.status.textContent='Working…';
            try{const result=await action();if(this.model!==model)return;this.parts.status.textContent=result?.status==='busy'?'Busy':message;}
            catch(error){if(this.model===model)this.parts.status.textContent=error.message;}
            finally{if(this.model===model)this.render();}
        }
        render(){
            const model=this.model;if(!model)return;
            this.rendering=true;
            const keys=new Set(model.documents.getNodes().map(n=>n.label));
            for(const pane of [...this.parts.tabs.children])if(!keys.has(pane.getAttribute('pageName'))){pane.documentBag?.unsubscribe('ide-document-ui',{any:true});pane.remove();}
            for(const n of model.documents.getNodes()){
                let tab=[...this.parts.tabs.children].find(p=>p.getAttribute('pageName')===n.label);
                if(!tab){tab=document.createElement('gnr-tab');tab.setAttribute('pageName',n.label);tab.setAttribute('closable','');this.parts.tabs.append(tab);}
                const path=n.getValue().getItem('path');
                const title=path.split('/').pop()+(model.dirty(n.label)?' •':'');
                tab.setAttribute('tooltip',path);
                if(tab.getAttribute('title')!==title)tab.setAttribute('title',title);
            }
            this.parts.tabs.value=model.active;
            this.rendering=false;
            for(const tab of this.parts.tabs.children){
                const key=tab.getAttribute('pageName'),doc=model.document(key);
                if(!tab.controls){
                    const layout=document.createElement('gnr-bordercontainer');layout.style.height='100%';
                    const toolbar=document.createElement('div');toolbar.slot='top';toolbar.className='bar';toolbar.style.justifyContent='flex-start';
                    const toggle=document.createElement('button');
                    const save=document.createElement('button');save.textContent='Save';
                    const revert=document.createElement('button');revert.textContent='Revert';
                    toggle.onclick=()=>doc.setItem('editing',!doc.getItem('editing'));
                    save.onclick=()=>this.run(()=>model.save(key),'Saved');
                    revert.onclick=()=>model.revert(key);
                    toolbar.append(toggle,save,revert);
                    const editor=document.createElement('gnr-codemirror');
                    editor.setAttribute('language',doc.getItem('language')||'text');
                    editor.setAttribute('aria-label',doc.getItem('path'));
                    editor.setAttribute('readonly','');editor.value=doc.getItem('content');
                    editor.addEventListener('change',()=>{if(!tab.syncing&&doc.getItem('editing'))doc.setItem('content',editor.value);});
                    if(doc.getItem('language')==='html'){
                        const stack=document.createElement('gnr-stackcontainer');stack.style.height='100%';
                        const preview=document.createElement('iframe');preview.title='HTML preview';preview.setAttribute('sandbox','');preview.style.cssText='width:100%;height:100%;border:0;background:white';
                        const prose=document.createElement('gnr-proseeditor');prose.readonly=true;
                        prose.addEventListener('change',()=>{if(!tab.syncing&&doc.getItem('editing'))doc.setItem('content',prose.value);});
                        for(const [name,content] of [['Code',editor],['Preview',preview],['Rich text',prose]]){
                            const pane=document.createElement('gnr-contentpane');pane.setAttribute('pageName',name);pane.style.height='100%';pane.append(content);stack.append(pane);
                            const button=document.createElement('button');button.textContent=name;button.onclick=()=>{stack.value=name;if(name==='Preview'&&!model.previewmethod)preview.srcdoc=doc.getItem('content');
                            if(name==='Preview'&&model.previewmethod){
                                const generation=(tab.previewGeneration||0)+1;tab.previewGeneration=generation;
                                preview.srcdoc='<p>Loading preview…</p>';
                                this.run(async()=>{const result=await model.preview(key);
                                    if(result&&tab.isConnected&&tab.previewGeneration===generation)preview.srcdoc=result.html;
                                },'Preview rendered');
                            }if(name==='Rich text')prose.value=doc.getItem('content');};toolbar.append(button);
                        }
                        stack.value='Code';tab.htmlViews={stack,preview,prose};layout.append(toolbar,stack);
                    }else layout.append(toolbar,editor);
                    tab.append(layout);
                    tab.controls={toggle,save,revert,editor};
                    tab.documentBag=doc;doc.subscribe('ide-document-ui',{any:this.onState});
                }
                const {toggle,save,revert,editor}=tab.controls;
                const editing=doc.getItem('editing')===true,busy=model.pending.has(key);
                toggle.setAttribute('aria-label',editing?'Lock editing':'Enable editing');
                toggle.title=editing?'Lock editing':'Enable editing';
                toggle.setAttribute('aria-pressed',String(editing));toggle.disabled=busy;
                const icon=editing?'edit':'locked';
                if(toggle.dataset.icon!==icon){
                    toggle.dataset.icon=icon;
                    toggle.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>${editing?'':'<path d="M3 3 21 21"/>'}</svg>`;
                }
                save.hidden=revert.hidden=!editing;
                save.disabled=busy||!model.writable||!doc.getItem('writable')||!model.dirty(key);
                revert.disabled=busy||!model.dirty(key);
                tab.syncing=true;
                try{
                    if(tab.htmlViews){
                        const {stack,preview,prose}=tab.htmlViews;prose.readonly=!editing;
                        if(!model.previewmethod&&stack.value==='Preview'&&preview.srcdoc!==doc.getItem('content'))preview.srcdoc=doc.getItem('content');
                        if(stack.value==='Rich text'&&prose.value!==doc.getItem('content'))prose.value=doc.getItem('content');
                    }
                    if(editor.value!==doc.getItem('content'))editor.value=doc.getItem('content');
                    if(editor.hasAttribute('readonly')===editing)editor.toggleAttribute('readonly',!editing);
                }finally{tab.syncing=false;}
            }
        }

        disconnectedCallback(){
            window.removeEventListener('beforeunload',this.beforeUnload);
            for(const tab of this.parts?.tabs.children||[])tab.documentBag?.unsubscribe('ide-document-ui',{any:true});
            this.model?.state.unsubscribe('ide-ui',{any:true});this.model?.dispose();this.model=null;this.editorKey=null;
        }
    });
}
