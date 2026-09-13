import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Validator} from '../src/forms/validator.js';

test('remote validation forwards method, context, candidate and abort signal', async()=>{
    const owner={};const signal=new AbortController().signal;let request;
    const validator=new Validator({server:{async call(method,params,options){request={method,params,options};return {errorcode:'django',message:'Rejected by clean'};}}});
    const result=await validator.validate(owner,'candidate',{signal,attrs:{validate_remote:'validate_field',validate_remote_field:'title',validate_remote_values:{title:'old'},validate_remote_label:'demo.country'}});
    assert.equal(request.method,'validate_field');assert.equal(request.params.value,'candidate');
    assert.deepEqual(request.params.values,{title:'old'});assert.equal(request.options.signal,signal);assert.equal(request.options.owner,owner);
    assert.equal(result.issues[0].message,'Rejected by clean');
});
