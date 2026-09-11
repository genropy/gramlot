import {Application, HtmlBuilder} from 'gramlot-dom';
const spec=await fetch('openapi.json').then(r=>r.json());
let app, controller, generation=0;
const operations=Object.entries(spec.paths).flatMap(([path,item])=>Object.entries(item).filter(([method])=>['get','post'].includes(method)).map(([method,operation])=>({path,method,operation})));
function show(entry,button){
 controller?.abort();generation++;
 document.querySelectorAll('nav button').forEach(b=>(b.classList.toggle('active',b===button),b.setAttribute('aria-current',b===button?'page':'false')));
 app?.dispose();const host=document.querySelector('#recipe');host.replaceChildren();
 const {path,method,operation}=entry;
 const properties=operation.requestBody?.content?.['application/json']?.schema;
 const fields=properties?Object.entries(properties.properties).map(([name,schema])=>({name,schema,required:properties.required?.includes(name)})):operation.parameters;
 class ApiPage extends HtmlBuilder {
  main(root){
   const title=root.div();title.span(method.toUpperCase(),{class:'method'});title.span(path,{class:'endpoint'});
   root.h1(operation.summary);root.p(operation.description,{class:'description'});
   const form=root.form({id:'request-form'});form.h2(properties?'Request body':'Query parameters');
   for(const field of fields){
    const row=form.div({class:'field'});const id='param-'+field.name;const s=field.schema;
    this.commandOnNode(row,'label',field.name+(field.required?' *':''),{for:id});
    if(s.enum||s.type==='boolean'){
     const select=row.select({id,name:field.name,required:!!field.required});
     select.option('Not provided',{value:''});
     for(const value of s.enum??[true,false]) select.option(String(value),{value:String(value)});
    }else row.input({id,name:field.name,type:['integer','number'].includes(s.type)?'number':'text',step:s.type==='integer'?'1':'any',min:s.minimum,required:!!field.required,value:s.default??''});
    row.small(s.description||field.description||s.type);
   }
   form.button('Run request →',{type:'submit'});
   const preview=root.details({open:true});preview.summary('Request preview');preview.pre('',{id:'request-preview'});
  }
 }
 app=new Application(host,new ApiPage('api'),{inspector:false});
 const form=host.querySelector('form');
 function values(){const out={};const input=new FormData(form);for(const f of fields){const value=input.get(f.name);if(value==='')continue;out[f.name]=f.schema.type==='boolean'?value==='true':['integer','number'].includes(f.schema.type)?Number(value):value;}return out;}
 function request(){const data=values();const url=new URL(path,location.origin);if(!properties)for(const [k,v]of Object.entries(data))url.searchParams.set(k,String(v));return{url,options:{method:method.toUpperCase(),...(properties?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})}};}
 function preview(){const {url,options}=request();host.querySelector('#request-preview').textContent=options.method+' '+url.pathname+url.search+(options.body?'\nContent-Type: application/json\n\n'+JSON.stringify(values(),null,2):'');}
 form.addEventListener('input',preview);preview();
 document.querySelector('#result').textContent='—';document.querySelector('#headers').textContent='—';document.querySelector('#table').replaceChildren();document.querySelector('#status').textContent='Ready to send';document.querySelector('#empty').hidden=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();controller?.abort();controller=new AbortController();const current=++generation;const submit=form.querySelector('button');submit.disabled=true;
  const start=performance.now();document.querySelector('#status').textContent='Sending…';
  try{const {url,options}=request();const response=await fetch(url,{...options,signal:controller.signal});const raw=await response.text();if(current!==generation)return;
   let data;try{data=JSON.parse(raw);}catch{data=raw;}
   document.querySelector('#status').textContent=`${response.status} ${response.statusText} · ${Math.round(performance.now()-start)} ms`;
   document.querySelector('#empty').hidden=true;document.querySelector('#result').textContent=typeof data==='string'?data:JSON.stringify(data,null,2);
   document.querySelector('#headers').textContent=[...response.headers].map(([k,v])=>`${k}: ${v}`).join('\n');
   const target=document.querySelector('#table');target.replaceChildren();
   if(Array.isArray(data)&&data.length&&data.every(row=>row&&typeof row==='object'&&!Array.isArray(row))){const table=document.createElement('table');const keys=[...new Set(data.flatMap(Object.keys))];const head=table.createTHead().insertRow();for(const key of keys){const th=document.createElement('th');th.textContent=key;head.append(th);}for(const row of data){const tr=table.insertRow();for(const key of keys)tr.insertCell().textContent=typeof row[key]==='object'?JSON.stringify(row[key]):String(row[key]??'');}target.append(table);}
  }catch(error){if(current===generation){document.querySelector('#status').textContent='Request failed';document.querySelector('#result').textContent=error.message;}}
  finally{if(current===generation)submit.disabled=false;}
 });
}
// A native disclosure tree keeps groups keyboard accessible without custom keys.
const navigation=document.querySelector('#operations');
navigation.setAttribute('aria-label','API tree');
const groups=new Map();
for(const entry of operations){
 const tag=entry.operation.tags?.[0]||'Other';
 if(!groups.has(tag))groups.set(tag,new Map());
 const paths=groups.get(tag);
 if(!paths.has(entry.path))paths.set(entry.path,[]);
 paths.get(entry.path).push(entry);
}
for(const [tag,paths] of groups){
 const group=document.createElement('details');group.open=true;group.className='api-group';
 const heading=document.createElement('summary');heading.textContent=tag;group.append(heading);
 for(const [path,entries] of paths){
  const branch=document.createElement('details');branch.open=true;branch.className='api-path';
  const title=document.createElement('summary');title.textContent=path;branch.append(title);
  for(const entry of entries){
   const button=document.createElement('button');button.type='button';
   const verb=document.createElement('b');verb.className='verb '+entry.method;verb.textContent=entry.method.toUpperCase();
   const label=document.createElement('span');label.textContent=entry.operation.summary||entry.method.toUpperCase();
   button.append(verb,label);button.onclick=()=>show(entry,button);branch.append(button);
  }
  group.append(branch);
 }
 navigation.append(group);
}
show(operations[0],navigation.querySelector('button'));
