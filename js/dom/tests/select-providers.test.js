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
