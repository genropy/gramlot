// Resolve the actual generated import map, including its browser require shim.
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve as resolvePath} from 'node:path';
const root=process.env.GRAMLOT_SHIPPED_PREVIEW;
const frame=readFileSync(resolvePath(root,'lessons/13-number-format/python.html'),'utf8');
const imports=JSON.parse(frame.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
export async function resolve(specifier,context,nextResolve){
    for(const key of Object.keys(imports).sort((a,b)=>b.length-a.length)){
        if(specifier===key || key.endsWith('/')&&specifier.startsWith(key)){
            const path=imports[key]+specifier.slice(key.length);
            return {url:pathToFileURL(resolvePath(root,'.'+path)).href,shortCircuit:true};
        }
    }
    return nextResolve(specifier,context);
}
