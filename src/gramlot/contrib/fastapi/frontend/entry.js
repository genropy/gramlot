import {Application} from 'gramlot-dom';
import {GramlotBuilder} from 'gramlot-builder';
import {fromTytx} from 'genro-tytx';

async function start() {
  const {recipe, inspector = true, rpc = null, main = null, exampleView = false} = JSON.parse(
    document.getElementById('startup').textContent,
  );
  const root = document.getElementById('root');
  const application = new Application(root, null, {inspector, rpc});
  root.dataset.gramlotState = 'loading-content';
  document.dispatchEvent(new CustomEvent('gramlot:application-ready', {detail: {application}}));
  window.addEventListener('pagehide', event => {
    if (!event.persisted) application.dispose();
  });
  let source;
  if (main) {
    source = await application.server.call(main, {}, {role: 'source'});
  } else {
    const response = await fetch(recipe);
    if (!response.ok) throw Error(`Recipe failed (${response.status})`);
    source = fromTytx(await response.text(), 'json');
  }
  if (exampleView) await import('gramlot-editors');
  const PageBuilder = exampleView ? class extends GramlotBuilder {
    static wc_requires = [...GramlotBuilder.wc_requires, 'labEditors'];
  } : GramlotBuilder;
  const builder = new PageBuilder('main');
  builder.loadSource(source);
  application.mountBuilder(builder);
  root.dataset.gramlotState = 'ready';
  document.dispatchEvent(new CustomEvent('gramlot:content-ready', {detail: {application}}));
}
start().catch(error => {
  document.getElementById('root').dataset.gramlotState = 'error';
  const message = document.getElementById('error');
  message.hidden = false;
  message.textContent = error.message;
});
