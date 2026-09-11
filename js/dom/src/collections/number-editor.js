// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {createDecimal, getDecimalLibrary, isDecimal} from 'genro-tytx';
import {formatNumber, numberSymbols, parseNumberText} from '../number-format.js';

/** Numeric draft and display formatting, independent of model binding. */
export class NumberEditor {
    constructor(host,input) {
        this.host=host;this.input=input;this.committed=null;this.editing=false;this.focused=false;
        input.inputMode='decimal';
        this.message=host.ownerDocument.createElement('small');this.message.hidden=true;
        this.message.id='number-message';this.message.setAttribute('aria-live','polite');
        input.addEventListener('focus',()=>{this.focused=true;if(!this.editing){this.policy=this.context();this.display();}});
        input.addEventListener('input',()=>{this.editing=true;this.error();});
        input.addEventListener('blur',()=>{this.focused=false;this.confirm();if(!this.editing)this.display();});
        input.addEventListener('keydown',event=>{
            if(event.isComposing)return;
            if(event.key==='Enter'){event.preventDefault();this.confirm();}
            if(event.key==='Escape'){event.preventDefault();this.cancel();}
        });
        input.addEventListener('change',event=>{event.stopImmediatePropagation();this.confirm();});
    }
    get locked(){return this.input.disabled||this.input.readOnly||this.host.hasAttribute('disabled')||this.host.hasAttribute('readonly');}
    context(){return {locale:this.host.getAttribute('locale')||this.host.ownerDocument.documentElement.lang||undefined,
        format:this.host.getAttribute('format')||'decimal',places:this.host.getAttribute('places')};}
    error(message=''){
        this.input.setCustomValidity(message);this.input.setAttribute('aria-invalid',String(Boolean(message)));
        this.message.textContent=message;this.message.hidden=!message;
        const ids=new Set((this.input.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
        if(message)ids.add(this.message.id);else ids.delete(this.message.id);
        if(ids.size)this.input.setAttribute('aria-describedby',[...ids].join(' '));else this.input.removeAttribute('aria-describedby');
    }
    sync(){if(!this.editing)this.display();}
    display(){
        const value=this.committed;
        try {
            const options=this.context();
            const formatted=value==null||value===''?'':formatNumber(value,options);
            this.input.value=this.focused&&value!=null&&value!==''
                ? String(value).replace('.',numberSymbols((this.policy||options).locale).decimal):formatted;
            this.error();this.host._nullState?.setNull(value==null);
        }catch(error){this.error(error.message);}
    }
    setValue(value){
        if(value===null && this.input.value==='')this.editing=false;
        if(value==null||value==='')this.committed=value;
        else if(typeof value==='number'||isDecimal(value))this.committed=value;
        else if(this.host.getAttribute('dtype')==='N') {
            if(getDecimalLibrary()==='number'){this.error('A Decimal backend is required for dtype N.');return;}
            this.committed=createDecimal(String(value));
        } else {
            const text=String(value);
            if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))return;
            this.committed=Number(text);
        }
        if(!this.editing)this.display();
    }
    accept(){
        if(this.locked||!this.editing)return {ok:true,value:this.committed};
        try {
            const text=this.input.value.trim();let value='';
            if(text){
                const canonical=parseNumberText(text,(this.policy||this.context()).locale);
                if(isDecimal(this.committed)||this.host.getAttribute('dtype')==='N') {
                    if(getDecimalLibrary()==='number')throw new Error('A Decimal backend is required for dtype N.');
                    value=isDecimal(this.committed)?new this.committed.constructor(canonical):createDecimal(canonical);
                }else value=Number(canonical);
                if(this.host.getAttribute('dtype')==='L' && !Number.isSafeInteger(value))throw new Error('Enter a safe integer.');
                this.checkBounds(value);
            }
            this.committed=value;this.editing=false;this.error();this.display();
            return {ok:true,value};
        }catch(error){this.error(error.message);return {ok:false,message:error.message};}
    }
    checkBounds(value){
        const decimal=isDecimal(value);
        const compare=(other)=>decimal?value.cmp(new value.constructor(other)):value-Number(other);
        const min=this.host.getAttribute('min'),max=this.host.getAttribute('max'),step=this.host.getAttribute('step');
        for(const bound of [min,max])if(bound!=null&&bound!==''&&!Number.isFinite(Number(bound)))throw new Error('Numeric bounds must be finite.');
        if(min!=null&&min!==''&&compare(min)<0)throw new Error(`Minimum value is ${min}.`);
        if(max!=null&&max!==''&&compare(max)>0)throw new Error(`Maximum value is ${max}.`);
        if(step!=null&&step!==''&&step!=='any'){
            if(decimal){
                const precision=value.toFixed().length+new value.constructor(min||0).toFixed().length+new value.constructor(step).toFixed().length+4;
                const Exact=value.constructor.clone ? value.constructor.clone({precision:Math.max(20,precision)}) : value.constructor;
                const candidate=new Exact(value.toString()),increment=new Exact(step);
                if(increment.cmp(0)<=0)throw new Error('step must be positive.');
                if(!candidate.minus(min||0).mod(increment).eq(0))throw new Error(`Use increments of ${step}.`);
            }else{
                const increment=Number(step),ratio=(value-Number(min||0))/increment;
                if(!Number.isFinite(increment)||increment<=0)throw new Error('step must be positive.');
                if(Math.abs(ratio-Math.round(ratio))>1e-9)throw new Error(`Use increments of ${step}.`);
            }
        }
    }
    confirm(){if(this.editing&&!this.locked&&this.accept().ok)this.host.dispatchEvent(new this.host.ownerDocument.defaultView.Event('change',{bubbles:true,composed:true}));}
    cancel(){
        this.editing=false;this.error();this.display();
        const field=this.host._formField;
        if(field){field.editorDirty=false;field.parseError=false;field.hasCandidate=false;field.signature=null;field.sync();}
    }
}
