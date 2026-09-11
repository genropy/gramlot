// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Pure OpenAPI input compiler and request serializer for the explorer. */
export function dereference(document, schema, seen = new Set()) {
    if (!schema || typeof schema !== 'object') return schema || {};
    if (!schema.$ref) return schema;
    const ref = schema.$ref;
    if (!ref.startsWith('#/')) throw new Error(`External reference is not supported: ${ref}`);
    if (seen.has(ref)) throw new Error(`Circular reference: ${ref}`);
    let target = document;
    for (const part of ref.slice(2).split('/')) target = target?.[part.replace(/~1/g,'/').replace(/~0/g,'~')];
    if (!target) throw new Error(`Missing reference: ${ref}`);
    const next = new Set(seen); next.add(ref);
    const {$ref, ...siblings} = schema;
    return {...dereference(document, target, next), ...siblings};
}
export function compileOperation(document, path, method, baseUrl) {
    const item = dereference(document, document.paths[path]);
    const operation = item[method];
    const parameters = new Map();
    for (const p of [...(item.parameters || []), ...(operation.parameters || [])]) {
        const parameter = dereference(document, p);
        parameters.set(`${parameter.in}:${parameter.name}`, parameter);
    }
    const fields = [...parameters.values()].map(p => {
        if (!['path','query','header'].includes(p.in)) throw new Error(`Unsupported parameter location: ${p.in}`);
        const schema = dereference(document, p.schema);
        if (schema.type === 'object' || schema.type === 'array' || p.content) throw new Error(`Complex parameter ${p.name} is not supported yet`);
        if (p.style && p.style !== (p.in === 'query' ? 'form' : 'simple')) throw new Error(`Unsupported style: ${p.style}`);
        return {...p, schema, required:p.in === 'path' || !!p.required};
    });
    const requestBody = operation.requestBody && dereference(document, operation.requestBody);
    if (requestBody && !requestBody.content?.['application/json']) throw new Error('Only application/json request bodies are supported');
    const bodySchema = requestBody && dereference(document, requestBody.content['application/json'].schema);
    const server = (operation.servers || item.servers || document.servers || [])[0] || {url:'/'};
    const serverUrl = server.url.replace(/\{([^}]+)\}/g, (_, key) => {
        const value = server.variables?.[key]?.default;
        if (value == null) throw new Error(`Missing server variable: ${key}`);
        return value;
    });
    return {document, operation, path, method, fields, bodySchema, bodyRequired:!!requestBody?.required,
        url:new URL(serverUrl, baseUrl).href.replace(/\/$/,'') + path};
}
export function validate(document, rawSchema, value, path = 'Value', depth = 0) {
    if (depth > 32) throw new Error(`${path}: maximum nesting exceeded`);
    const schema = dereference(document, rawSchema);
    if (schema.oneOf || schema.anyOf || schema.allOf || schema.not) throw new Error(`${path}: schema alternatives/composition are not supported yet`);
    if (value === null) {
        if (schema.nullable || schema.type === 'null' || Array.isArray(schema.type) && schema.type.includes('null')) return;
        throw new Error(`${path}: null is not allowed`);
    }
    const type = Array.isArray(schema.type) ? schema.type.find(t => t !== 'null') : schema.type;
    if (type === 'object' || schema.properties) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected an object`);
        for (const key of schema.required || []) if (!(key in value) && !dereference(document,schema.properties?.[key]).readOnly) throw new Error(`${path}.${key}: required`);
        for (const [key, item] of Object.entries(value)) {
            if (schema.properties?.[key]) validate(document,schema.properties[key],item,`${path}.${key}`,depth+1);
            else if (schema.additionalProperties === false) throw new Error(`${path}.${key}: unknown property`);
            else if (typeof schema.additionalProperties === 'object') validate(document,schema.additionalProperties,item,`${path}.${key}`,depth+1);
        }
    } else if (type === 'array') {
        if (!Array.isArray(value)) throw new Error(`${path}: expected an array`);
        if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) throw new Error(`${path}: invalid number of items`);
        value.forEach((item,i)=>validate(document,schema.items || {},item,`${path}[${i}]`,depth+1));
    } else if (type && (type === 'integer' ? !Number.isInteger(value) : typeof value !== type)) throw new Error(`${path}: expected ${type}`);
    if (schema.enum && !schema.enum.some(v=>JSON.stringify(v)===JSON.stringify(value))) throw new Error(`${path}: choose an allowed value`);
    if (typeof value === 'number' && (!Number.isFinite(value) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) throw new Error(`${path}: outside numeric limits`);
    if (typeof value === 'string') {
        if (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity)) throw new Error(`${path}: invalid length`);
        if (schema.pattern && !new RegExp(schema.pattern).test(value)) throw new Error(`${path}: does not match ${schema.pattern}`);
    }
}
export function buildRequest(model, values, body, authorization = '') {
    let path = model.url;
    const query = new URLSearchParams(); const headers = {};
    for (const field of model.fields) {
        const key = `${field.in}:${field.name}`;
        if (!Object.hasOwn(values,key)) {if (field.required) throw new Error(`${field.name}: required`);continue;}
        const value = values[key]; validate(model.document, field.schema, value, field.name);
        if (field.in === 'path') path = path.replaceAll(`{${field.name}}`,encodeURIComponent(String(value)));
        else if (field.in === 'query') query.append(field.name,String(value));
        else headers[field.name] = String(value);
    }
    if (/\{[^}]+\}/.test(path)) throw new Error('Missing path parameter');
    const url = new URL(path); for (const [k,v] of query) url.searchParams.append(k,v);
    if (authorization) headers.Authorization = authorization;
    const options = {method:model.method.toUpperCase(),headers};
    if (body !== undefined) {
        validate(model.document,model.bodySchema,body,'Body');
        headers['Content-Type']='application/json'; options.body=JSON.stringify(body);
    } else if (model.bodyRequired) throw new Error('Body is required');
    return {url, options};
}
