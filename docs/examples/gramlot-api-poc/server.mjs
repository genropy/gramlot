import http from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {execFileSync} from 'node:child_process';
const here = new URL('.', import.meta.url).pathname;
execFileSync(process.env.GRAMLOT_PYTHON || resolve(here, '../../../.venv/bin/python'),
    [resolve(here, 'build.py')], {stdio:'inherit'});
const runtime = resolve(here, '../../../build/teaching-preview/runtime');
const products = [{id:1,name:'Desk lamp',price:49,available:true},{id:2,name:'Notebook',price:12,available:true},{id:3,name:'Oak desk',price:320,available:false}];
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const json=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/api/products/') && req.method==='GET') {
  const product=products.find(p=>p.id===Number(url.pathname.split('/').at(-1)));
  return json(product?200:404,product || {error:'Product not found'});
 }
 if(url.pathname==='/api/products' && req.method==='GET') {
  let rows=products.filter(p=>p.name.toLowerCase().includes((url.searchParams.get('q')||'').toLowerCase()));
  if(url.searchParams.has('available')) rows=rows.filter(p=>p.available===(url.searchParams.get('available')==='true'));
  return json(200,rows);
 }
 if(url.pathname==='/api/quote' && req.method==='POST') {
  try {let body='';for await(const chunk of req){body+=chunk;if(body.length>10000)return json(413,{error:'Request too large'});}
   const data=JSON.parse(body);const p=products.find(p=>p.id===data.productId);
   if(!p||!Number.isInteger(data.quantity)||data.quantity<1)return json(422,{error:'Choose a valid product ID and a positive integer quantity'});
   return json(200,{product:p.name,quantity:data.quantity,total:p.price*data.quantity,currency:'EUR',note:data.note??null});
  }catch{return json(400,{error:'Invalid JSON'});}
 }
 if(req.method!=='GET')return json(405,{error:'Method not allowed'});
 try {
  const versions=await readdir(runtime);
  const base=url.pathname.startsWith('/runtime/')?resolve(runtime,versions[0]):here;
  const relative=url.pathname.startsWith('/runtime/')?url.pathname.slice(9):url.pathname==='/'?'index.html':url.pathname.slice(1);
  const file=resolve(base,relative);if(!file.startsWith(resolve(base)+'/'))return json(403,{error:'Forbidden'});
  const content=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'})[extname(file)]||'application/octet-stream'});res.end(content);
 }catch{json(404,{error:'Not found'});}
});
const port=Number(process.env.PORT || 64324);
server.listen(port,'127.0.0.1',()=>console.log(`Gramlot API PoC: http://127.0.0.1:${server.address().port}`));
