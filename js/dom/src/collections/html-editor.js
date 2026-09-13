// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Edit supported text regions without replacing the surrounding page structure.
export function richBody(html){return new DOMParser().parseFromString(html,'text/html');}
export function richRegions(doc){
 const inline=new Set(['STRONG','EM','B','I','U','S','DEL','CODE','A','BR']);
 return [...doc.body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,dt,dd,figcaption,td,th,span,small')].filter(el=>{
  if(!el.textContent.trim()||el.closest('script,style,template,svg'))return false;
  return [...el.querySelectorAll('*')].every(child=>inline.has(child.tagName)&&
   [...child.attributes].every(a=>child.tagName==='A'&&['href','title'].includes(a.name))&&
   !(child.tagName==='A'&&/^(javascript|data):/i.test(child.getAttribute('href')||'')))&&!el.innerHTML.includes('<!--');
 });
}
export function serializeRichDocument(doc,full){
 return full?(doc.doctype?new XMLSerializer().serializeToString(doc.doctype)+'\n':'')+doc.documentElement.outerHTML:doc.body.innerHTML;
}
export function defineHtmlEditor(){
 if(customElements.get('gnr-proseeditor'))return;
 customElements.define('gnr-proseeditor',class extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._value='';}
  set value(v){if(v===this._value)return;this._value=v||'';if(this.isConnected)this.load();}
  get value(){return this._value;}
  set readonly(v){this._readonly=v;this.view?.setProps({editable:()=>!this._readonly});this.refreshTools?.();}
  connectedCallback(){if(this._value)this.load();}
  disconnectedCallback(){this.generation=(this.generation||0)+1;this.view?.destroy();this.view=null;}
  async load(){
   const generation=this.generation=(this.generation||0)+1;
   this.view?.destroy();this.view=null;
   this.shadowRoot.innerHTML='<style>:host{display:flex;flex-direction:column;height:100%;overflow:hidden;background:white;color:#303944}.tools{padding:6px;border-bottom:1px solid #ddd;display:flex;gap:5px}button{background:none;border:1px solid #ddd;border-radius:3px;color:inherit}button:disabled{opacity:.4}button[aria-pressed="true"]{background:#dce8f6;border-color:#91accb}.ProseMirror{padding:16px;outline:none;min-height:160px;white-space:pre-wrap}.ProseMirror p{margin:0 0 10px}</style><div class="body">Loading rich text…</div>';
   const body=this.shadowRoot.querySelector('.body');
   try{
    const documentHtml=richBody(this._value),regions=richRegions(documentHtml);
    if(!regions.length)throw new Error('No editable text blocks in this document. Preview and Code remain available.');
    const deps='?deps=prosemirror-model@1.22.3,prosemirror-state@1.4.3,prosemirror-view@1.33.8';
    const [model,state,view,basic,commands,keymap,history]=await Promise.all([
     import('https://esm.sh/prosemirror-model@1.22.3'),
     import('https://esm.sh/prosemirror-state@1.4.3'+deps),
     import('https://esm.sh/prosemirror-view@1.33.8'+deps),
     import('https://esm.sh/prosemirror-schema-basic@1.2.3'+deps),
     import('https://esm.sh/prosemirror-commands@1.6.2'+deps),
     import('https://esm.sh/prosemirror-keymap@1.2.2'+deps),
     import('https://esm.sh/prosemirror-history@1.4.1'+deps)]);
    if(generation!==this.generation)return;
    const schema=new model.Schema({nodes:{doc:{content:'inline*'},text:{group:'inline'},hard_break:basic.schema.spec.nodes.get('hard_break')},marks:basic.schema.spec.marks.append({underline:{parseDOM:[{tag:'u'}],toDOM:()=>['u',0]},strike:{parseDOM:[{tag:'s'},{tag:'del'}],toDOM:()=>['s',0]}})});
    const full=/<html[\s>]|<!doctype/i.test(this._value)||documentHtml.head.children.length>0;
    body.textContent='';body.style.cssText='flex:1;min-height:0';
    const toolbar=document.createElement('div');toolbar.className='tools';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Text formatting');toolbar.style.flexWrap='wrap';body.before(toolbar);
    const status=document.createElement('span');status.style.cssText='font:12px system-ui;color:#68717e;padding:5px';toolbar.append(status);
    const controls=[];this.refreshTools=()=>{status.textContent=this._readonly?'Locked — unlock the pencil to edit':this.view?'Editing text — select words to format':'Click a paragraph to edit';for(const {button,command,mark} of controls){button.disabled=this._readonly||!this.view||!command(this.view.state);if(mark&&this.view){const {from,to,empty}=this.view.state.selection;button.setAttribute('aria-pressed',String(empty?mark.isInSet(this.view.state.storedMarks||this.view.state.selection.$from.marks())!=null:this.view.state.doc.rangeHasMark(from,to,mark)));}}};
    const frame=document.createElement('iframe');frame.title='Rich text document';
    // WebKit needs scripting enabled for parent-installed editing handlers.
    // The sanitized srcdoc below enforces script-src 'none' through CSP.
    frame.setAttribute('sandbox','allow-same-origin allow-scripts');frame.style.cssText='width:100%;height:100%;border:0;background:white';
    // The editable presentation is isolated from the host and never runs page
    // scripts. The original parsed document remains the serialization source.
    const display=documentHtml.cloneNode(true);
    richRegions(display).forEach((el,index)=>el.setAttribute('data-gramlot-region',String(index)));
    display.querySelectorAll('script,iframe,object,embed,base,meta[http-equiv]').forEach(el=>el.remove());
    display.querySelectorAll('*').forEach(el=>{for(const attr of [...el.attributes])if(/^on/i.test(attr.name)||attr.name==='autofocus')el.removeAttribute(attr.name);});
    const policy=display.createElement('meta');policy.httpEquiv='Content-Security-Policy';
    policy.content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'";display.head.prepend(policy);
    const style=display.createElement('style');style.textContent='[data-gramlot-region]:hover{outline:1px dashed #b8c4d0;outline-offset:3px}.ProseMirror{outline:1px solid #859db8;outline-offset:3px;white-space:pre-wrap}.ProseMirror:focus{outline-color:#467bb8}';display.head.append(style);
    const ready=new Promise(resolve=>frame.addEventListener('load',resolve,{once:true}));
    frame.srcdoc='<!doctype html>'+display.documentElement.outerHTML;body.append(frame);
    await ready;if(generation!==this.generation)return;
    const frameDoc=frame.contentDocument;
    let active=null,originalClass='';
    const activate=(element,event)=>{
     if(this._readonly)return;
     if(active===element){frame.contentWindow.focus();return;}
     // Prevent the original pointer default from focusing the old, replaced
     // text node after ProseMirror has mounted (notably in desktop WebKit).
     if(event.type==='mousedown')event.preventDefault();
     this.view?.destroy();
     if(active){active.className=originalClass;active.removeAttribute('contenteditable');active.innerHTML=regions[Number(active.getAttribute('data-gramlot-region'))].innerHTML;}
     active=element;originalClass=element.className;
     const region=regions[Number(element.getAttribute('data-gramlot-region'))];
     const initial=model.DOMParser.fromSchema(schema).parse(region);
     element.textContent='';
     this.view=new view.EditorView({mount:element},{state:state.EditorState.create({schema,doc:initial,plugins:[history.history(),keymap.keymap({'Mod-z':history.undo,'Mod-y':history.redo,'Mod-b':commands.toggleMark(schema.marks.strong),'Mod-i':commands.toggleMark(schema.marks.em),'Enter':(s,dispatch)=>{if(dispatch)dispatch(s.tr.replaceSelectionWith(schema.nodes.hard_break.create()));return true;}})]}),editable:()=>!this._readonly,
      dispatchTransaction:transaction=>{
       this.view.updateState(this.view.state.apply(transaction));
       this.refreshTools();
       if(!transaction.docChanged)return;
       const container=document.createElement('div');container.append(model.DOMSerializer.fromSchema(schema).serializeFragment(this.view.state.doc.content));
       region.innerHTML=container.innerHTML;
       this._value=serializeRichDocument(documentHtml,full);
       this.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
      }});
     const position=this.view.posAtCoords({left:event.clientX,top:event.clientY});
     if(position)this.view.dispatch(this.view.state.tr.setSelection(state.TextSelection.create(this.view.state.doc,position.pos)));
     frame.contentWindow.focus();this.view.focus();this.refreshTools();
    };
    const boundDocuments=new WeakSet();
    const bindDocument=()=>{
     const current=frame.contentDocument;
     if(!current||boundDocuments.has(current))return;
     boundDocuments.add(current);
     const activateEvent=event=>{
      const target=event.target.nodeType===1?event.target:event.target.parentElement;
      const element=target?.closest('[data-gramlot-region]');
      if(!element)return;
      try{activate(element,event);}catch(error){status.textContent='Cannot activate editing: '+error.message;console.error(error);}
     };
     current.addEventListener('submit',event=>event.preventDefault(),true);
     current.addEventListener('mousedown',activateEvent,true);
     current.addEventListener('click',event=>{
      if(event.target.closest?.('a,button,input'))event.preventDefault();
      activateEvent(event);
     },true);
    };
    // Browsers may replace the initial about:blank document after a hidden
    // stack pane becomes visible. Bind every loaded document, not only the first.
    frame.addEventListener('load',bindDocument);bindDocument();
    const clear=(s,dispatch)=>{if(s.selection.empty)return false;if(dispatch)dispatch(s.tr.removeMark(s.selection.from,s.selection.to));return true;};
    for(const [label,command,mark] of [
     ['Bold',commands.toggleMark(schema.marks.strong),schema.marks.strong],
     ['Italic',commands.toggleMark(schema.marks.em),schema.marks.em],
     ['Underline',commands.toggleMark(schema.marks.underline),schema.marks.underline],
     ['Strikethrough',commands.toggleMark(schema.marks.strike),schema.marks.strike],
     ['Code',commands.toggleMark(schema.marks.code),schema.marks.code],
     ['Clear formatting',clear],['Undo',history.undo],['Redo',history.redo]]){
     const button=document.createElement('button');button.textContent=label;button.title=label;
     button.onmousedown=e=>e.preventDefault();
     button.onclick=()=>{if(!this._readonly&&this.view){command(this.view.state,this.view.dispatch,this.view);this.view.focus();this.refreshTools();}};
     toolbar.append(button);controls.push({button,command,mark});
    }
    this.refreshTools();

   }catch(error){if(generation===this.generation)body.textContent=error.message;}
  }
 });
}
