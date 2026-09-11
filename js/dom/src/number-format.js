// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {isDecimal} from 'genro-tytx';

export function numericOptions({format='decimal', places}={}) {
    const options={maximumFractionDigits:20};
    if (!format || format==='decimal') options.style='decimal';
    else if(format==='percent') options.style='percent';
    else if(format==='scientific') options.notation='scientific';
    else {
        const match=/^(0|#,##0)(?:\.(0*)(#*))?$/.exec(format);
        if(!match || (format.includes('.') && !match[2] && !match[3])) throw new RangeError(`Unsupported number format: ${format}`);
        options.useGrouping=match[1].includes(',');
        options.minimumFractionDigits=(match[2]||'').length;
        options.maximumFractionDigits=(match[2]||'').length+(match[3]||'').length;
    }
    if(places!=null && places!=='') {
        const count=Number(places);
        if(!Number.isInteger(count)||count<0||count>20) throw new RangeError('places must be an integer from 0 to 20');
        options.minimumFractionDigits=count; options.maximumFractionDigits=count;
    }
    return options;
}
export function formatNumber(value, options={}) {
    if(typeof value!=='number' && !isDecimal(value)) throw new TypeError('Number formatting requires a Number or Decimal');
    if(!Number.isFinite(Number(value))) throw new RangeError('Number must be finite');
    const formatter=new Intl.NumberFormat(options.locale||undefined,numericOptions(options));
    // Modern Intl accepts decimal strings without narrowing to IEEE 754.
    if(isDecimal(value) && new Intl.NumberFormat('en',{useGrouping:false}).format('9007199254740993')!=='9007199254740993') {
        throw new Error('This browser cannot format Decimal values without precision loss');
    }
    return formatter.format(isDecimal(value)?value.toString():value);
}
export function numberSymbols(locale) {
    const parts=new Intl.NumberFormat(locale||undefined).formatToParts(-12345.6);
    return {decimal:parts.find(p=>p.type==='decimal').value,group:parts.find(p=>p.type==='group')?.value,
        minus:parts.find(p=>p.type==='minusSign').value};
}
export function parseNumberText(text,locale) {
    const {decimal,group,minus}=numberSymbols(locale);
    let source=text.trim().replaceAll(minus,'-');
    // Plain ungrouped decimal drafts only: prevents ambiguous separator guesses.
    if(group && source.includes(group)) throw new Error('Enter the number without grouping separators.');
    source=source.replace(decimal,'.');
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(source)) throw new Error('Enter a complete number.');
    if(!Number.isFinite(Number(source))) throw new Error('Enter a finite number.');
    return source;
}
