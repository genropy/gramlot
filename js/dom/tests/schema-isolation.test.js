// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Collection/component composition must stay local to one builder instance. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { HtmlBuilder } from '../src/contrib/html/html-builder.js';
import { registerCollection } from '../src/collections.js';

const grammarEntry = (origin) => ({ sub_tags: '', _meta: { origin } });

registerCollection('isolationAlpha', {
    grammar: { elements: {
        alphaOnly: grammarEntry('alpha'),
        orderedChoice: grammarEntry('alpha'),
        form: grammarEntry('intentional-html-override'),
    } },
    defineComponents() {},
});

registerCollection('isolationBeta', {
    grammar: { elements: {
        betaOnly: grammarEntry('beta'),
        orderedChoice: grammarEntry('beta'),
    } },
    defineComponents() {},
});

class CollectionPage extends HtmlBuilder {
    constructor(name, collections) {
        super(name);
        this.collections = collections;
    }

    setup() { this.wcRequires(...this.collections); }

    main(root) { root.div('collection page'); }
}

test('collection order and tag-name caches are isolated per builder', () => {
    const alphaThenBeta = new CollectionPage('alpha-beta', [
        'isolationAlpha', 'isolationBeta',
    ]);
    const initialNames = alphaThenBeta.schemaTagNames;
    assert.equal(initialNames.alphaonly, undefined);
    alphaThenBeta.create();

    assert.equal(alphaThenBeta.schema.orderedChoice._meta.origin, 'beta');
    assert.equal(alphaThenBeta.schema.form._meta.origin, 'intentional-html-override');
    assert.equal(alphaThenBeta.schemaTag('ALPHAONLY'), 'alphaOnly');
    assert.notEqual(alphaThenBeta.schemaTagNames, initialNames);

    const betaThenAlpha = new CollectionPage('beta-alpha', [
        'isolationBeta', 'isolationAlpha',
    ]);
    betaThenAlpha.create();
    assert.equal(betaThenAlpha.schema.orderedChoice._meta.origin, 'alpha');
    assert.equal(betaThenAlpha.schemaTag('betaonly'), 'betaOnly');

    assert.equal(alphaThenBeta.schema.orderedChoice._meta.origin, 'beta');
    assert.equal(CollectionPage._classSchema.alphaOnly, undefined);
    assert.equal(CollectionPage._classSchema.betaOnly, undefined);

    const plain = new CollectionPage('plain', []);
    plain.create();
    assert.equal(plain.schema.alphaOnly, undefined);
    assert.equal(plain.schemaTag('betaOnly'), null);
});

class ComponentPage extends CollectionPage {
    static components = ['orderedChoice', 'localComponent'];

    orderedChoice() {}

    localComponent() {}
}

test('components compose after collections without mutating class grammar', () => {
    const page = new ComponentPage('components', ['isolationAlpha']);
    page.create();

    assert.deepEqual(page.schema.orderedChoice._meta, { component: true });
    assert.deepEqual(page.schema.localComponent._meta, { component: true });
    assert.equal(page.schemaTag('LOCALCOMPONENT'), 'localComponent');
    assert.equal(ComponentPage._classSchema.orderedChoice, undefined);
    assert.equal(ComponentPage._classSchema.localComponent, undefined);

    const collectionOnly = new CollectionPage('collection-only', ['isolationAlpha']);
    collectionOnly.create();
    assert.equal(collectionOnly.schema.orderedChoice._meta.origin, 'alpha');
    assert.equal(collectionOnly.schema.localComponent, undefined);
});

class FirstComponentPage extends HtmlBuilder {
    static components = ['firstComponent'];

    firstComponent() {}

    main(root) { root.div('first'); }
}

test('one component builder cannot seed a later builder class or its tag cache', () => {
    const first = new FirstComponentPage('first');
    const initialNames = first.schemaTagNames;
    first.create();
    assert.equal(first.schemaTag('FIRSTCOMPONENT'), 'firstComponent');
    assert.notEqual(first.schemaTagNames, initialNames);

    class LaterComponentPage extends FirstComponentPage {
        static components = ['laterComponent'];

        laterComponent() {}
    }

    const later = new LaterComponentPage('later');
    later.create();
    assert.equal(later.schemaTag('laterComponent'), 'laterComponent');
    assert.equal(later.schema.firstComponent, undefined);
    assert.equal(first.schema.laterComponent, undefined);
    assert.equal(FirstComponentPage._classSchema.firstComponent, undefined);
});
