import {Application, SourceBag, wrapSource} from 'gramlot-dom';
import {GramlotBuilder} from 'gramlot-builder';

import {makeCatalogue} from './catalogue.js';
let catalogue;
const $ = id => document.getElementById(id);
let serial=0, selected='root', drag=null, target='root', records=new Map(), scheduled=false;
const builder = new GramlotBuilder('designer');
builder.main = root => {
    const panel=root.div({'data-design-id':`d${++serial}`, class:'design-container', datapath:'demo'});
    panel.h2('^.message', {'data-design-id':`d${++serial}`});
    panel.textBox({value:'^.message',lbl:'Message',live:true,'data-design-id':`d${++serial}`});
};
let inspector=null, sourceTree=null;
const app=new Application($('preview'),builder,{inspector:false});
catalogue=makeCatalogue(app.builder.schema);
app.live(()=>app.builder.data.setItem('demo.message','Hello visual builder'));
const children = node => node?.value?.getNodes ? node.value.getNodes() : [];
function scan(){
    records=new Map([['root',{id:'root',node:null,bag:app.builder.source,parent:null,tag:'Canvas'}]]);
    function walk(bag,parent){
        for(const node of bag.getNodes()){
            const id=node.getAttr('data-design-id');
            if(!id)continue;
            const tag=Object.keys(catalogue).find(key=>key.toLowerCase()===node.nodeTag?.toLowerCase()) || node.nodeTag;
            records.set(id,{id,node,bag,parent,tag});
            if(children(node).length)walk(node.value,id);
        }
    }
    walk(app.builder.source,'root');
}
function status(message,error=false){$('status').textContent=message;$('status').dataset.error=error;}
function accepts(id){
    const record=records.get(id);
    if(!record || (id!=='root'&&!catalogue[record.tag]?.container))return false;
    if(drag?.id){
        let ancestor=id;
        while(ancestor){if(ancestor===drag.id)return false;ancestor=records.get(ancestor)?.parent;}
    }
    return true;
}
function element(record){return record?.node ? $('preview').querySelector(`[data-design-id="${record.id}"]`) : $('preview');}
function outlines(){
    $('outlines').replaceChildren();
    const base=$('canvas').getBoundingClientRect();
    for(const record of records.values()){
        if(record.id==='root'||(!drag&&record.id!==selected))continue;
        const el=element(record);if(!el)continue;
        const rect=el.getBoundingClientRect();
        const box=document.createElement('div');
        box.className='outline '+(drag?(accepts(record.id)?'allowed':'forbidden'):'selected')+(target===record.id&&drag?' hover':'');
        Object.assign(box.style,{left:`${rect.left-base.left+$('canvas').scrollLeft-2}px`,top:`${rect.top-base.top+$('canvas').scrollTop-2}px`,width:`${rect.width}px`,height:`${rect.height}px`});
        $('outlines').append(box);
    }
    $('canvas').classList.toggle('drop-allowed',!!drag&&accepts('root'));
}
function refresh(){scan();if(!records.has(selected))selected='root';outlines();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});}
function fields(){
    const r=records.get(selected);$('selection').textContent=r?.tag+' · '+selected;
    for(const key of ['move','up','down','delete'])$(key).disabled=selected==='root';
    if(inspector?.tool){
        const path=sourcePath(selected);
        inspector.tool.app.live(()=>inspector.tool.app.builder.data.setItem('sourcePath',path));
        decorateSource();
    }
}
function select(id){selected=id;refresh();fields();}
function act(callback){try{app.live(callback);refresh();fields();status('Source Bag updated.');}catch(error){status(error.message,true);refresh();}}
function add(tag,parent){
    if(catalogue[tag]?.disabled){status(catalogue[tag].disabled,true);return;}
    if(!accepts(parent)){status('This widget cannot contain children.',true);return;}
    act(()=>{const spec=catalogue[tag], owner=wrapSource(records.get(parent)?.node||app.root),id=`d${++serial}`;
        const attrs={...spec.attrs,'data-design-id':id};
        if(spec.text!==undefined)owner[tag](spec.text,attrs);else owner[tag](attrs);
        selected=id;
    });
}
function move(id,parent){
    if(!accepts(parent)){status('Cannot move a node into a leaf, itself or its descendants.',true);return;}
    act(()=>{const r=records.get(id),dest=records.get(parent);
        const attributes={...r.node.getAttr()};
        // Preserve the effective binding scope when changing structural parent.
        try { attributes.datapath=r.node.absDatapath('.').slice(r.node.rootBuilderName.length+1); }
        catch { /* A node without a relative scope needs no explicit datapath. */ }
        if(dest.node && !dest.node.value?.setItem) dest.node.setValue(new SourceBag(null,app.builder,app.builder.handler));
        const bag=dest.node?dest.node.value:app.builder.source;
        if(!bag?.setItem)throw new Error('Destination has no child Bag.');
        // Detach and insert in one live batch; Data is not recreated.
        const removed=r.bag.popNode(r.node.label);
        bag.setItem(`moved_${id}`,removed.value,attributes,'>',false,true,null,false,true,null,removed.nodeTag);
        selected=id;
    });
}
function reorder(delta){const r=records.get(selected);if(!r?.node)return;const index=r.bag.getNodes().indexOf(r.node),to=index+delta;if(to<0||to>=r.bag.getNodes().length)return;act(()=>r.bag.move(index,to));}
function begin(payload,event){drag=payload;target='root';event.dataTransfer.effectAllowed=payload.id?'move':'copy';event.dataTransfer.setData('text/plain',JSON.stringify(payload));outlines();}
function end(){drag=null;target='root';outlines();decorateSource();}
function hit(event){
    for(const el of event.composedPath()){
        const id=el?.dataset?.designId || el?.dataset?.node;
        if(records.has(id))return id;
    }
    return 'root';
}
const sections=new Map();
function section(path){
    if(sections.has(path))return sections.get(path);
    const parts=path.split(' / '), title=parts.pop(), parent=parts.length?section(parts.join(' / ')):$('catalogue');
    const node=document.createElement('details');node.open=parts.length===0;
    const summary=document.createElement('summary');summary.textContent=title;node.append(summary);parent.append(node);sections.set(path,node);return node;
}
for(const [tag,spec] of Object.entries(catalogue)){
    const item=document.createElement('div');item.className='item';item.draggable=!spec.disabled;item.dataset.widget=tag;item.dataset.container=String(Boolean(spec.container));
    const label=document.createElement('span');label.textContent=tag;
    const button=document.createElement('button');button.textContent='+';button.className='catalogue-add';button.title=spec.disabled||'Add '+tag;button.disabled=!!spec.disabled;button.setAttribute('aria-label','Add '+tag);
    if(spec.disabled){item.title=spec.disabled;item.classList.add('unavailable');}
    button.onclick=()=>add(tag,selected);item.append(label,button);
    item.addEventListener('dragstart',event=>{if(spec.disabled)event.preventDefault();else begin({tag},event);});
    section(spec.group).append(item);
}
$('move').addEventListener('dragstart',event=>{if(selected!=='root')begin({id:selected},event);else event.preventDefault();});
for(const surface of [$('canvas')]){
    surface.addEventListener('dragover',event=>{if(!drag)return;event.preventDefault();target=hit(event);const allowed=accepts(target);event.dataTransfer.dropEffect=allowed?(drag.id?'move':'copy'):'none';status(allowed?'Release to insert inside '+records.get(target).tag:'Forbidden: this destination cannot accept the block.',!allowed);outlines();});
    surface.addEventListener('drop',event=>{if(!drag)return;event.preventDefault();target=hit(event);const payload=drag;if(accepts(target)){if(payload.id)move(payload.id,target);else add(payload.tag,target);}else status('Drop rejected. Source unchanged.',true);end();});
}
document.addEventListener('dragend',end);
document.addEventListener('keydown',event=>{if(event.key==='Escape')end();});
$('preview').addEventListener('click',event=>{const id=hit(event);select(id);});
$('canvas').addEventListener('click',event=>{if(event.target===$('canvas'))select('root');});
$('up').onclick=()=>reorder(-1);$('down').onclick=()=>reorder(1);
$('delete').onclick=()=>{const r=records.get(selected);if(r?.node)act(()=>{r.bag.popNode(r.node.label);selected=r.parent;});};
$('edit').onclick=()=>{
    inspector.shadowRoot.querySelector('gnr-tabcontainer')?.shadowRoot?.querySelector('[data-key="source"]')?.click();
    inspector.shadowRoot.querySelector('[data-inspector="source-editor"] [data-field="rows"]')?.shadowRoot?.querySelector('input[data-cell="value"]')?.focus();
};
app.builder.source.subscribe('visual-builder',{any:schedule});
app.builder.data.subscribe('visual-builder',{any:schedule});
const observer=new ResizeObserver(outlines);observer.observe($('preview'));
window.addEventListener('resize',outlines);$('canvas').addEventListener('scroll',outlines);
window.addEventListener('pagehide',()=>{observer.disconnect();app.builder.source.unsubscribe('visual-builder',{any:true});app.builder.data.unsubscribe('visual-builder',{any:true});app.dispose();});
refresh();fields();

// This adapter belongs to the playground: ordinary inspectors remain read-only trees.
const {createInspector}=await import(new URL('./inspector-component.js',import.meta.resolve('gramlot-builder')).href);
inspector=createInspector(app,'embedded');
$('inspector').append(inspector);
await inspector.initialize();
inspector.opened=true;
sourceTree=inspector.shadowRoot.querySelector('[data-inspector="source"]');
function sourcePath(id){
    const record=records.get(id);
    return record?.node ? [sourcePath(record.parent),record.node.label].filter(Boolean).join('.') : '';
}
function decorateSource(){
    if(!sourceTree?.shadowRoot)return;
    function walk(ul,bag){
        if(!ul)return;
        [...ul.children].forEach((li,index)=>{
            const node=bag.getNodes()[index];if(!node)return;
            const details=li.querySelector(':scope > details');
            const row=details?.querySelector(':scope > summary')||li;
            const id=node.getAttr('data-design-id');
            if(!records.has(id))return;
            row.dataset.node=id;row.draggable=true;
            row.classList.toggle('selected',id===selected);
            row.style.outline=drag ? `1px solid ${accepts(id)?'#82d9a2':'#ed8f93'}` : '';
            row.style.outlineOffset='-1px';
            if(details)walk(details.querySelector(':scope > ul'),node.value);
        });
    }
    walk(sourceTree.shadowRoot.querySelector('ul'),app.builder.source);
}
const treeObserver=new MutationObserver(decorateSource);
treeObserver.observe(sourceTree.shadowRoot,{childList:true,subtree:true});
sourceTree.addEventListener('click',event=>{const id=hit(event);if(id!=='root')select(id);});
sourceTree.addEventListener('dragstart',event=>{const id=hit(event);if(id!=='root'){begin({id},event);decorateSource();}else event.preventDefault();});
sourceTree.addEventListener('dragover',event=>{
    if(!drag)return;event.preventDefault();target=hit(event);
    const allowed=accepts(target);event.dataTransfer.dropEffect=allowed?(drag.id?'move':'copy'):'none';
    status(allowed?'Release to insert inside '+records.get(target).tag:'Forbidden: this destination cannot accept the block.',!allowed);
    outlines();decorateSource();
});
sourceTree.addEventListener('drop',event=>{
    if(!drag)return;event.preventDefault();target=hit(event);
    if(accepts(target)){if(drag.id)move(drag.id,target);else add(drag.tag,target);}
    else status('Drop rejected. Source unchanged.',true);
    end();decorateSource();
});
document.addEventListener('dragend',decorateSource);
window.addEventListener('pagehide',()=>{treeObserver.disconnect();inspector.dispose();});
decorateSource();fields();

inspector.shadowRoot.querySelector('gnr-tabcontainer').shadowRoot.querySelector('[data-key=source]').click();

const {installHoverEditor}=await import('./hover-editor.js');
const openParameters=await installHoverEditor({app,inspector,canvas:$('canvas'),preview:$('preview'),hit,records:()=>records,select,sourcePath});
$('edit').onclick=()=>openParameters(selected);

// Keep playground bookkeeping out of the user-facing property grid.
const internalStyle=document.createElement('style');
internalStyle.textContent='[data-name="data-design-id"]{display:none}';
inspector.shadowRoot.querySelector('[data-inspector="source-editor"] [data-field="rows"]').shadowRoot.append(internalStyle);

sourceTree.rowActions=[
    {id:'edit',icon:'✎',label:'Edit parameters'},
    {id:'delete',icon:'🗑',label:'Delete block'},
];
sourceTree.addEventListener('tree-action',event=>{
    const id=event.detail.node?.getAttr('data-design-id');
    if(!records.has(id))return;
    if(event.detail.action==='edit')openParameters(id);
    if(event.detail.action==='delete'){
        select(id);
        const record=records.get(id);
        act(()=>{record.bag.popNode(record.node.label);selected=record.parent;});
    }
});

// Pointer capture keeps sidebar resizing active outside the narrow handle.
for(const side of ['left','right']){
    const handle=document.getElementById(`${side}-splitter`);
    const main=document.querySelector('main');
    const panel=side==='left'?main.querySelector('aside'):main.querySelector('.inspector-sidebar');
    let start=null;
    function resize(width){
        const other=side==='left'?main.querySelector('.inspector-sidebar'):main.querySelector('aside');
        const max=Math.max(160,main.clientWidth-other.getBoundingClientRect().width-332);
        const value=Math.round(Math.max(160,Math.min(max,width)));
        main.style.setProperty(`--${side}-sidebar`,`${value}px`);
        handle.setAttribute('aria-valuenow',value);
        handle.setAttribute('aria-valuemin','160');handle.setAttribute('aria-valuemax',Math.round(max));
        outlines();
    }
    handle.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        event.preventDefault();start={x:event.clientX,width:panel.getBoundingClientRect().width};
        handle.setPointerCapture(event.pointerId);document.body.classList.add('resizing-sidebar');
    });
    handle.addEventListener('pointermove',event=>{if(start)resize(start.width+(event.clientX-start.x)*(side==='left'?1:-1));});
    const stop=()=>{start=null;document.body.classList.remove('resizing-sidebar');};
    handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
    handle.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
        event.preventDefault();resize(panel.getBoundingClientRect().width+(event.key==='ArrowRight'?16:-16)*(side==='left'?1:-1));
    });
}

const editIconStyle=document.createElement('style');
editIconStyle.textContent=`.actions button[data-action="edit"]{font-size:0;display:inline-flex;align-items:center;justify-content:center}.actions button[data-action="edit"]::before{content:'';width:16px;height:16px;background:currentColor;mask:url('/builder/edit.svg') center/contain no-repeat;-webkit-mask:url('/builder/edit.svg') center/contain no-repeat}`;
sourceTree.shadowRoot.append(editIconStyle);
