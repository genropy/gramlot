/** Page-local hover affordance, backed by the same typed Source editor as Inspector. */
export async function installHoverEditor({app, inspector, canvas, preview, hit, records, select, sourcePath}) {
    const {InspectorEditor}=await import(new URL('./inspector-editor.js',import.meta.resolve('gramlot-builder')).href);
    const pencil=document.createElement('button');
    pencil.id='hover-edit';pencil.type='button';pencil.textContent='✎';
    pencil.setAttribute('aria-label','Edit block parameters');pencil.title='Edit block parameters';pencil.hidden=true;
    canvas.append(pencil);
    const dialog=document.createElement('dialog');dialog.id='block-parameters';dialog.setAttribute('aria-labelledby','parameters-title');
    dialog.innerHTML='<header><strong id="parameters-title">Block parameters</strong><button type="button" aria-label="Close parameters">×</button></header><p class="hint">Changes apply when you leave a row.</p><div id="parameter-editor"></div>';
    document.body.append(dialog);
    const shadow=dialog.querySelector('#parameter-editor').attachShadow({mode:'open'});
    const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./inspector.css',import.meta.resolve('gramlot-builder')).href;shadow.append(css);
    const host=document.createElement('div');host.className='inspector-editor';
    host.innerHTML='<div class="inspector-toolbar">Properties <button type="button" data-command="add" aria-label="Add attribute">+</button></div><div class="inspector-grid-scroll"><div data-field="rows"></div></div><div data-field="status" role="status" hidden></div>';
    host.append(inspector.shadowRoot.querySelector('[data-inspector="source-editor"] [data-field="row-template"]').cloneNode(true));shadow.append(host);
    const style=document.createElement('style');style.textContent='.inspector-grid-scroll{max-height:55vh;overflow:auto}[data-field=status]{font:12px system-ui;color:#b23c47}';shadow.append(style);
    const editor=new InspectorEditor(host,app.builder.source,app);
    const internalStyle=document.createElement('style');
    internalStyle.textContent='[data-name="data-design-id"]{display:none}';
    editor.rows.getRootNode().append(internalStyle);
    let hovered=null, editing=null;
    function position(){
        const record=records().get(hovered),el=record&&preview.querySelector(`[data-design-id="${hovered}"]`);
        if(!el||dialog.open){pencil.hidden=true;return;}
        const rect=el.getBoundingClientRect(),base=canvas.getBoundingClientRect();
        pencil.style.left=`${Math.max(2,Math.min(canvas.clientWidth-30,rect.right-base.left-25))+canvas.scrollLeft}px`;
        pencil.style.top=`${Math.max(2,rect.top-base.top)+canvas.scrollTop}px`;
        pencil.hidden=false;
    }
    function hover(event){if(pencil.contains(event.target))return;const id=hit(event);hovered=id==='root'?null:id;position();}
    preview.addEventListener('pointermove',hover);preview.addEventListener('focusin',hover);
    canvas.addEventListener('pointerleave',()=>{pencil.hidden=true;});
    canvas.addEventListener('scroll',position);window.addEventListener('resize',position);
    function open(id){
        if(!records().get(id)?.node)return;
        editing=id;select(id);editor.path=undefined;editor.refresh(sourcePath(id));
        dialog.querySelector('strong').textContent=`${records().get(id).tag} · Parameters`;
        dialog.showModal();pencil.hidden=true;
        editor.rows.querySelector('input[data-cell="value"]:not(:disabled)')?.focus();
    }
    pencil.onclick=()=>open(hovered);
    dialog.querySelector('header button').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{editing=null;pencil.hidden=true;});
    const refresh=()=>{if(editing)editor.refresh(sourcePath(editing));position();};
    app.builder.source.subscribe('builder-hover-editor',{any:refresh});
    window.addEventListener('pagehide',()=>{editor.dispose();app.builder.source.unsubscribe('builder-hover-editor',{any:true});window.removeEventListener('resize',position);dialog.remove();});
    return open;
}
