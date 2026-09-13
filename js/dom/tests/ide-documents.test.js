import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Bag} from 'genro-bag-js';
import {IdeDocuments} from '../src/services/ide-documents.js';

function fixture(){
    const app={data:new Bag(),feedback:{busy(){}},server:{cancel(){},async call(){throw new Error('No server');}}};
    const node={handler:{application:app},absDatapath:()=> 'ide'};
    return {app,node,model:new IdeDocuments(node,{root:'demo',writable:true})};
}
test('standalone documents live in Data and refuse dirty close',()=>{
    const {app,model}=fixture();const key=model.add('a.b.py','before','python');
    model.document().setItem('content','after');
    assert.equal(app.data.getItem(`ide.documents.${key}.content`),'after');
    assert.equal(model.close(key).status,'needs-discard');
    assert.equal(model.close(key,{discard:true}).status,'closed');assert.equal(model.active,null);
});
test('save preserves edits made during RPC and failures never mark saved',async()=>{
    const {app,model}=fixture();let finish;
    app.server.call=()=>new Promise(resolve=>{finish=resolve;});
    const key=model.add('x.py','original','python',{writable:true,revision:'old'});
    model.document().setItem('content','sent');const pending=model.save();
    assert.equal((await model.save()).status,'busy');
    model.document().setItem('content','newer');finish({revision:'new'});
    await pending;assert.equal(model.document().getItem('saved'),'sent');assert.equal(model.dirty(key),true);
    app.server.call=async()=>{throw new Error('Conflict');};
    await assert.rejects(model.save(),/Conflict/);assert.equal(model.document().getItem('content'),'newer');
});
test('disposing ignores a late open and reopening a tab preserves its edits',async()=>{
    const {app,model}=fixture();let finish;app.server.call=()=>new Promise(resolve=>{finish=resolve;});
    const key=model.add('a.py','original');model.document().setItem('content','edited');
    assert.equal(await model.open('a.py'),key);assert.equal(model.document().getItem('content'),'edited');
    const pending=model.open('b.py');model.dispose();finish({content:'late',revision:'r'});
    assert.equal(await pending,null);assert.equal(model.documents.getNodes().length,1);
});
test('editing starts locked per document and revert restores the saved snapshot',()=>{
    const {model}=fixture();const a=model.add('a.py','first');
    assert.equal(model.document(a).getItem('editing'),false);
    model.document(a).setItem('editing',true);
    model.document(a).setItem('content','draft');
    const b=model.add('b.py','second');
    assert.equal(model.document(b).getItem('editing'),false);
    assert.equal(model.document(a).getItem('editing'),true);
    model.pending.add(a);assert.equal(model.revert(a).status,'busy');
    assert.equal(model.document(a).getItem('content'),'draft');
    model.pending.delete(a);model.revert(a);
    assert.equal(model.document(a).getItem('content'),'first');
    assert.equal(model.dirty(a),false);
});

test('preview sends unsaved content and ignores results after edits or disposal', async()=>{
    const {app,model}=fixture();model.previewmethod='render_preview';
    const key=model.add('page.html','saved','html');model.document(key).setItem('content','draft');
    let finish;let request;
    app.server.call=(method,params)=>{request={method,params};return new Promise(resolve=>{finish=resolve;});};
    const pending=model.preview(key);
    assert.equal(request.method,'render_preview');assert.equal(request.params.content,'draft');
    model.document(key).setItem('content','newer');finish({html:'obsolete'});
    assert.equal(await pending,null);assert.equal(model.document(key).getItem('saved'),'saved');
    const next=model.preview(key);finish({html:'rendered'});assert.deepEqual(await next,{html:'rendered'});
    const last=model.preview(key);model.dispose();finish({html:'late'});assert.equal(await last,null);
});
