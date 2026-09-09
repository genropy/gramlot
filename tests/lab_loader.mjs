// Resolve the same local modules as the browser import map for contract tests.
import {resolve as resolvePath} from 'node:path';
import {pathToFileURL} from 'node:url';

const base = process.env.GRAMLOT_CLIENT_MODULES
    ? pathToFileURL(resolvePath(process.env.GRAMLOT_CLIENT_MODULES) + '/')
    : new URL('../../', import.meta.url);
export async function resolve(specifier, context, nextResolve) {
    if (specifier === '../../gramlot-dom/tests/dom.js') {
        return {url: new URL('gramlot-dom/tests/dom.js', base).href, shortCircuit: true};
    }
    const aliases = {'genro-tytx': 'genro-tytx/js/src/index.js', 'gramlot-dom': 'gramlot-dom/src/index.js', 'genro-bag-js': 'genro-bag-js/src/index.js'};
    if (aliases[specifier]) {
        return {url: new URL(aliases[specifier], base).href, shortCircuit: true};
    }
    if (specifier.startsWith('/_assets/dom/')) {
        return {url: new URL('gramlot-dom/src/' + specifier.slice('/_assets/dom/'.length), base).href, shortCircuit: true};
    }
    if (specifier.startsWith('/_assets/pages/')) {
        return {url: new URL('../js/pages/src/' + specifier.slice('/_assets/pages/'.length), import.meta.url).href, shortCircuit: true};
    }
    return nextResolve(specifier, context);
}
