// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Ordered legacy-compatible local rules, with strict numeric types. Evaluation
 * has no writes; the field owner controls effects, cancellation and draft policy.
 * A result is synchronous unless a custom rule returns a Promise. */
const RULES=['select','notnull','empty','case','len','min','max','email','regex','call','gridnodup','nodup','exist','remote'];
const OPTIONS=new Set(['depends','onAccept','onReject','timeout']);
export class Validator {
    constructor(application) { this.application=application; }
    validate(node,value,context={}) {
        const result={value,issues:[],modified:false};
        const attrs=context.attrs || node.builder.runtimeValues(node)[1];
        const config=Object.fromEntries(Object.entries(attrs).filter(([key])=>key.startsWith('validate_')).map(([key,v])=>[key.slice(9),v]));
        try {
            for(const key of Object.keys(config)) {
                if (!RULES.some(rule=>key===rule || key.startsWith(rule+'_')) && !OPTIONS.has(key)) {
                    throw new Error(`Unsupported validation: validate_${key}`);
                }
            }
            return this._run(node,result,config,context,0);
        } catch(error) { return this._failure(result,error); }
    }
    _failure(result,error) {
        result.issues.push({rule:'configuration',code:'configuration',severity:'error',message:error.message || String(error)});
        return result;
    }
    _run(node,result,config,context,start) {
        try {
            for(let index=start;index<RULES.length;index++) {
                const rule=RULES[index], param=config[rule];
                if (!param && param!==0) continue;
                const condition=config[rule+'_if'];
                if (condition!==undefined && !this._callback(node,condition,{...config,value:result.value},true)) continue;
                const returned=this._rule(rule,param,result.value,node,config,context);
                if (returned && typeof returned.then==='function') {
                    const pending=Promise.resolve(returned).then(value=>{
                        this._accept(result,rule,value,config);
                        return result.issues.some(issue=>issue.severity==='error') ? result : this._run(node,result,config,context,index+1);
                    }).catch(error=>this._failure(result,error));
                    pending.initial=result;
                    return pending;
                }
                this._accept(result,rule,returned,config);
                if (result.issues.some(issue=>issue.severity==='error')) break;
            }
        } catch(error) { return this._failure(result,error); }
        return result;
    }
    _callback(node,code,args,expression=false) {
        if (typeof code==='boolean') return code;
        return this.application._recipeRuntime.evaluate(node,expression && typeof code==='string' ? `return (${code});` : code,args);
    }
    _rule(rule,param,value,node,config,context) {
        const empty=value==null || value==='';
        if (['nodup','exist','gridnodup'].includes(rule)) throw new Error(`validate_${rule} requires a separate database/grid adapter`);
        if (rule==='remote') {
            if (typeof param!=='function') throw new Error('validate_remote requires an injected function, not an RPC method name');
            return this._callback(node,param,{...config,value,signal:context.signal});
        }
        if (rule==='select') {
            const widget=context.widget;
            if (!widget || typeof widget.getSelectionValidity!=='function') throw new Error('validate_select requires a selection-capable widget');
            return widget.getSelectionValidity(value);
        }
        if (rule==='notnull') return empty ? {errorcode:'notnull'} : true;
        if (rule==='empty') return empty ? {value:param} : true;
        if (rule==='call') return this._callback(node,param,{...config,value,signal:context.signal});
        // Check configuration even for an empty field.
        let regex;
        if (rule==='regex') regex=new RegExp(String(param).trim().replace(/^!/,''));
        if (['min','max'].includes(rule) && (typeof param!=='number' || !Number.isFinite(param))) throw new Error(`validate_${rule} requires a finite numeric limit`);
        if (rule==='len' && !/^\d+(:\d*)?$|^:\d+$/.test(String(param))) throw new Error('validate_len must be a length or min:max');
        if (empty) return true;
        if (['min','max'].includes(rule)) {
            if (typeof value!=='number' || !Number.isFinite(value)) return {errorcode:'type',message:'A finite number is required.'};
            return rule==='min' ? value>=param : value<=param;
        }
        if (typeof value!=='string') return {errorcode:'type',message:'A text value is required.'};
        if (rule==='case') {
            const mode=String(param).toLowerCase();
            if (['upper','u'].includes(mode)) return {value:value.toUpperCase()};
            if (['lower','l'].includes(mode)) return {value:value.toLowerCase()};
            if (['title','t'].includes(mode)) return {value:value.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase())};
            if (['capitalize','c'].includes(mode)) return {value:value[0].toUpperCase()+value.slice(1)};
            throw new Error(`Unknown validate_case mode: ${param}`);
        }
        if (rule==='len') {
            const parts=String(param).split(':');
            const minimum=Number(parts[0] || 0), maximum=parts.length===1 ? minimum : Number(parts[1] || Infinity);
            return value.length<minimum ? 'too short' : value.length>maximum ? 'too long' : true;
        }
        if (rule==='regex') return String(param).trim().startsWith('!') ? !regex.test(value) : regex.test(value);
        if (rule==='email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : {errorcode:'email',iswarning:true};
        return true;
    }
    _accept(result,rule,returned,config) {
        if (returned==null || returned===true) return;
        const reply=typeof returned==='object' ? returned : {errorcode:returned===false ? 'error' : String(returned)};
        if (reply.data) throw new Error('Validation data patches require a separate adapter');
        if (Object.hasOwn(reply,'value')) { result.modified ||= !Object.is(result.value,reply.value); result.value=reply.value; }
        if (!reply.errorcode) return;
        const warning=Object.hasOwn(config,rule+'_iswarning') ? config[rule+'_iswarning']
            : reply.iswarning ?? Boolean(config[rule+'_warning'] && !config[rule+'_error']);
        const severity=warning ? 'warning' : 'error';
        const message=reply.message || config[rule+'_'+reply.errorcode] || config[rule+'_'+severity]
            || config[rule+'_'+(warning?'error':'warning')] || (rule==='notnull' ? 'A value is required.' : `${rule}: ${reply.errorcode}`);
        result.issues.push({rule,code:reply.errorcode,severity,message:String(message)});
    }
}
