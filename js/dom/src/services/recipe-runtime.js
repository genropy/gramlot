// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Private executor: preserve source-node scope while the compiler is consolidated. */
export class RecipeRuntime {
    constructor(application) { this.application = application; }
    /** Trusted author code, with freshly resolved parameters and source-node scope. */
    run(node, code, extra = {}) {
        let result;
        this.application.live(() => { result=this.evaluate(node,code,extra); });
        return result;
    }
    /** Value-returning source-scoped evaluation; callers own effects and lifetime. */
    evaluate(node, code, extra = {}) {
        const [, attrs] = this.application.builder.runtimeValues(node);
        const args = {...attrs, ...extra, genro:this.application, sourceNode:node};
        if (typeof code === 'function') return code.call(node,args.value,args,extra.signal);
        const names = Object.keys(args).filter(name => /^[A-Za-z_$][\w$]*$/.test(name)
            && !['await','break','case','catch','class','const','continue','debugger','default','delete','do','else','enum','export','extends','false','finally','for','function','if','implements','import','in','instanceof','interface','let','new','null','package','private','protected','public','return','static','super','switch','this','throw','true','try','typeof','var','void','while','with','yield'].includes(name));
        return new Function(...names, code).call(node, ...names.map(name => args[name]));
    }
}
