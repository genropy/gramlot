// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Private executor: preserve source-node scope while the compiler is consolidated. */
import {executeScript} from '../logic/expression.js';

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
        return executeScript(node, code, args);
    }
}
