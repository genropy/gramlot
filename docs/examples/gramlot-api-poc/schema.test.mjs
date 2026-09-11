import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dereference,compileOperation,buildRequest,validate} from '../../../js/dom/src/services/openapi-schema.js';
const document={openapi:'3.0.3',servers:[{url:'/v1'}],components:{schemas:{Input:{type:'object',required:['quantity'],properties:{quantity:{type:'integer',minimum:1},note:{type:'string',nullable:true},items:{type:'array',items:{type:'integer'}}}}}},paths:{'/items/{id}':{parameters:[{name:'id',in:'path',schema:{type:'string'}}],post:{parameters:[{name:'q',in:'query',schema:{type:'string'}},{name:'X-Test',in:'header',schema:{type:'boolean'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/Input'}}}}}}}};
test('schema generates path, query, header and referenced body inputs',()=>{
 const model=compileOperation(document,'/items/{id}','post','https://example.test/openapi.json');
 assert.equal(model.fields.length,3);assert.equal(model.bodySchema.type,'object');
 const {url,options}=buildRequest(model,{'path:id':'a/b','query:q':'a&b','header:X-Test':false},{quantity:2,note:null,items:[1,2]});
 assert.equal(url.href,'https://example.test/v1/items/a%2Fb?q=a%26b');assert.equal(options.headers['X-Test'],'false');assert.equal(JSON.parse(options.body).note,null);
});
test('omission differs from empty and null; required and nested validation',()=>{
 const model=compileOperation(document,'/items/{id}','post','https://example.test/openapi.json');
 assert.throws(()=>buildRequest(model,{},{}),/id: required/);
 assert.throws(()=>buildRequest(model,{'path:id':'1'},{quantity:0}),/numeric limits/);
 assert.throws(()=>buildRequest(model,{'path:id':'1'},{quantity:1,items:['x']}),/integer/);
 const result=buildRequest(model,{'path:id':'1','query:q':''},{quantity:1,note:''});
 assert.equal(result.url.search,'?q=');assert.equal(JSON.parse(result.options.body).note,'');
 assert.throws(()=>buildRequest(model,{'path:id':'1'},undefined),/Body is required/);
});
test('local escaped refs resolve and unsupported constructs are explicit',()=>{
 assert.equal(dereference({'a/b':{type:'string'}},{$ref:'#/a~1b'}).type,'string');
 assert.throws(()=>dereference({},{$ref:'other.json#/x'}),/External/);
 assert.throws(()=>dereference({a:{$ref:'#/a'}},{$ref:'#/a'}),/Circular/);
 assert.throws(()=>validate({}, {oneOf:[]},'x'),/not supported/);
});
