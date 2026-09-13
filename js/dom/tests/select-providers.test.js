import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupDom} from './dom.js';
import {Application} from '../src/application.js';
import {HtmlBuilder} from '../src/contrib/html/html-builder.js';
import '../src/collections/inputs.js';

test('callbackSelect works standalone with Promise results and identity lookup', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['inputs'];
        main(root) {
            root.callbackSelect({value:'^selected',kw_scope:'demo',callback:`
                return Promise.resolve({rows: [{id: kw._id || 'one', label: kw.scope}], identifier:'id',caption:'label'});
            `});
        }
    }
    const host=document.createElement('div');document.body.append(host);
    const app=new Application(host,new Page('main'));
    const el=host.querySelector('gnr-callbackselect');
    await el._resolve('existing');
    assert.equal(el.options[0].id,'existing');
    assert.equal(el.options[0].caption,'demo');
    const rows=await el._request({_querystring:'d'},el._generation);
    assert.equal(rows[0].id,'one');
    el.value=null;
    assert.equal(el.options.length,0);
    app.dispose();
});

test('repeated identity binding shares pending lookup and selection validation waits', async () => {
    setupDom();
    class Page extends HtmlBuilder {
        static wc_requires=['inputs'];
        main(root) {
            root.callbackSelect({value:'^selected',callback:`
                return new Promise(resolve => setTimeout(() => resolve({rows: [{id: kw._id, label: 'Resolved'}], identifier:'id',caption:'label'}), 10));
            `});
        }
    }
    const host=document.createElement('div');document.body.append(host);
    const app=new Application(host,new Page('main'));
    const el=host.querySelector('gnr-callbackselect');
    el.value=46;
    const pending=el._resolvePromise;
    el.value=46;
    assert.equal(el._resolvePromise,pending);
    assert.equal(await el.getSelectionValidity(46),true);
    assert.equal(el._input.value,'Resolved');
    assert.equal(el._input.validationMessage,'');
    app.dispose();
});
