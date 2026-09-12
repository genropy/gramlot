// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Generic host for a compiled Python Source page, independent of its server. */
import {Application} from 'gramlot-dom';
import {fromTytx} from 'genro-tytx';
import {GramlotBuilder} from './builder.js';
import './codemirror-component.js';

export async function mountPythonPage(host, {url, name='page', inspector=true} = {}) {
    const response=await fetch(url, {cache:'no-store'});
    if(!response.ok)throw new Error(`Source unavailable: HTTP ${response.status}`);
    class PythonPageBuilder extends GramlotBuilder {
        static wc_requires=[...GramlotBuilder.wc_requires, 'labEditors'];
    }
    const builder=new PythonPageBuilder(name);
    builder.loadSource(fromTytx(await response.text(),'json'));
    return new Application(host,builder,{inspector});
}
const host=document.querySelector('[data-gramlot-source]');
if(host)mountPythonPage(host,{url:host.dataset.gramlotSource,name:host.dataset.gramlotName||'page', inspector:host.dataset.gramlotExample === 'true' ? {launcher:false} : true})
    .catch(error=>{host.textContent=error.message;host.setAttribute('role','alert');});
