// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Browser implementation of the Python openApiClient/openApiForm declarations. */
import {Bag} from 'genro-bag-js';
import {wrapSource} from '../source-bag.js';
import {GridStruct} from '../collections/grid-authoring.js';
import {jsonBag,plainJson} from '../resolvers/http.js';
import {compileOperation,dereference,buildRequest} from './openapi-schema.js';
const get=(node,path)=>node.getRelativeData(path);
const set=(node,path,value)=>node.setRelativeData(path,value);
const emptyStruct=()=>{const struct=new GridStruct();struct.view().rows();return struct;};
const clear=(pane,keep)=>pane.value.getNodes().slice().filter(node=>node!==keep).forEach(node=>pane.value.popNode(node.label));
export class OpenApiClientService {
 prepare(node,{schema}) {
   if(!(schema instanceof Bag))return;
   const spec=plainJson(schema.getItem('spec'));const tree=new Bag();let first;
   const tags=new Map();let count=0;
   for(const [path,item] of Object.entries(spec.paths))for(const method of ['get','post','put','patch','delete','options','head','trace']) {
    if(!item[method])continue;const op=item[method];const tag=op.tags?.[0]||'Other';
    if(!tags.has(tag)){const key=`g${tags.size}`;tags.set(tag,key);tree.setItem(key,new Bag(),{caption:tag});}
    const key=`${tags.get(tag)}.op${count++}`;
    tree.setItem(key,null,{caption:`${method.toUpperCase()}  ${op.summary||path}`,path,method});first ||= key;
   }
   set(node,'apiTitle',spec.info?.title||'API');set(node,'navigation',tree);set(node,'selection',first||'');
 }
 select(node,{selection,schema}) {
   const operation=wrapSource(node.parentNode);

   const entry=get(node,'navigation')?.getNode(selection);if(!entry?.attr.method)return;
   clear(operation,node);set(node,'formError','');set(node,'response',new Bag());set(node,'responseText','');
   set(node,'responseSummary','');set(node,'responseHeaders','');set(node,'responseRows',new Bag());set(node,'responseStruct',emptyStruct());
   try {
    const spec=plainJson(schema.getItem('spec'));
    const model=compileOperation(spec,entry.attr.path,entry.attr.method,new URL(get(node,'loadUrl'),location.href).href);
    set(node,'operationModel',jsonBag(model));
    this.buildForm(operation,node,model);
   }catch(error){set(node,'formError',error.message);}
 }
 execute(node,args) {
 const {_triggerpars,genro}=args;
   if(_triggerpars?.kw?.node?.label!=='send'){genro.resolvers.cancel(node);set(node,'requestState',jsonBag({state:'cancelled',error:null}));return;}
   try {
    const model=plainJson(get(node,'operationModel'));
    const fields=plainJson(get(node,'fields'));const input=get(node,'input');const values={};const body={};let whole;
    const include=get(node,'includeBody');
    for(const f of fields) {
     if(f.in==='body'&&!include)continue;
     const mode=input.getItem(`${f.id}.mode`);if(mode==='omit')continue;
     let value=input.getItem(`${f.id}.value`);
     if(mode==='null')value=null;
     else if(f.json || f.schema.enum || f.schema.type==='boolean')value=JSON.parse(value);
     else if(['number','integer'].includes(f.schema.type)){if(value===''||value==null)throw new Error(`${f.name}: enter a number`);value=Number(value);}
     if(f.key==='body')whole=value;else if(f.in==='body')body[f.name]=value;else values[f.key]=value;
    }
    const request=buildRequest(model,values,include?(fields.some(f=>f.key==='body')?whole:body):undefined,get(node,'authorization'));
    set(node,'formError','');set(node,'requestPreview',`${request.options.method} ${request.url}\n${request.options.body||''}`);
    genro.resolvers.load(node,'url',{destination:'response',status:'requestState',url:String(request.url),
     method:request.options.method,headers:request.options.headers,body:request.options.body?JSON.parse(request.options.body):undefined,
     responseType:'auto',envelope:true});
   }catch(error){set(node,'formError',error.message);}
 }
 response(node,{response}) {
   if(!(response instanceof Bag)||!response.getNode('status'))return;
   const data=plainJson(response);set(node,'responseSummary',`${data.status} ${data.statusText} · ${data.duration} ms`);
   set(node,'responseText',typeof data.body==='string'?data.body:JSON.stringify(data.body,null,2));
   set(node,'responseHeaders',Object.entries(data.headers).map(([k,v])=>`${k}: ${v}`).join('\n'));
   const rows=new Bag();const struct=emptyStruct();const columns=struct.getItem('view_0.rows_0');
   if(Array.isArray(data.body)&&data.body.every(row=>row&&typeof row==='object'&&!Array.isArray(row))) {
    const keys=[...new Set(data.body.flatMap(Object.keys))];keys.forEach(field=>columns.cell(field,{name:field,width:140}));
    data.body.forEach((row,i)=>rows.setItem(`r${i}`,null,Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='object'?JSON.stringify(v):v]))));
   }
   set(node,'responseRows',rows);set(node,'responseStruct',struct);
 }
 buildForm(pane,node,model) {
  pane.span(model.method.toUpperCase(),{class:'method'});pane.code(model.path);
  pane.h1(model.operation.summary||model.path);pane.p(model.operation.description||'',{class:'muted'});
  const fields=model.fields.map(f=>({...f,key:`${f.in}:${f.name}`}));const body=model.bodySchema;
  if(body) {
   if(body.properties)for(const [name,definition] of Object.entries(body.properties)) {
    const schema=dereference(model.document,definition);if(!schema.readOnly)fields.push({name,key:`body:${name}`,in:'body',schema,required:body.required?.includes(name)});
   }else fields.push({name:'JSON body',key:'body',in:'body',schema:body,required:model.bodyRequired});
  }
  set(node,'includeBody',!!body);set(node,'input',new Bag());
  if(body&&!model.bodyRequired)pane.checkbox({value:'^includeBody',lbl:'Send request body'});
  const form=pane.formlet({col_min_width:'200px',gap:'10px',class:'request-fields'});
  fields.forEach((field,i)=>{
   const id=`f${i}`;field.id=id;const s=field.schema;field.json=['object','array'].includes(s.type)||!!s.properties;
   const path=`input.${id}`;set(node,`${path}.mode`,field.required||s.default!==undefined?'value':'omit');
   const initial=s.default??(field.json?(s.type==='array'?[]:{}):s.enum?.[0]??(s.type==='boolean'?true:''));
   set(node,`${path}.value`,field.json||s.enum||s.type==='boolean'?JSON.stringify(initial):initial);
   const cell=form.div({class:field.json?'field wide':'field'});
   const caption=s.title||field.name.replace(/([a-z])([A-Z])/g,'$1 $2');
   pane.dataFormula(`${path}.disabled`,"mode !== 'value'",{mode:`^${path}.mode`,_on_start:true});
   const attrs={value:`^${path}.value`,lbl:caption+(field.required?' *':''),width:'100%',disabled:`^${path}.disabled`};
   if(field.json)cell.textBoxArea({...attrs,height:'65px'});
   else if(s.enum||s.type==='boolean') {
    const choices=new Bag();(s.enum||[true,false]).forEach((v,n)=>choices.setItem(`c${n}`,null,{id:JSON.stringify(v),caption:String(v)}));
    // Native select is still authored entirely as Source with a Data binding.
    cell.span(attrs.lbl,{class:'field-label'});
    const select=cell.select({value:attrs.value,disabled:attrs.disabled,'aria-label':attrs.lbl});
    choices.getNodes().forEach(n=>select.option(n.attr.caption,{value:n.attr.id}));
   }else if(['integer','number'].includes(s.type))cell.numberTextBox({...attrs});
   else cell.textBox({...attrs});
   if(!field.required||s.nullable)cell.filteringSelect({value:`^${path}.mode`,values:`value:Include${field.required?'':',omit:Omit'}${s.nullable?',null:Null':''}`,width:'90px'});
  });
  set(node,'fields',jsonBag(fields));
  pane.button('Execute request',{action:"this.SET('send',this.GET('send')+1);"});
  const preview=pane.details();preview.summary('Request preview');preview.pre('^requestPreview');
 }
}
