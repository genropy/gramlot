import {Application} from 'gramlot-dom';
import {GramlotBuilder} from 'gramlot-builder';
import {fromTytx} from 'genro-tytx';

async function start() {
  const {recipe, inspector = true} = JSON.parse(document.getElementById('startup').textContent);
  const response = await fetch(recipe);
  if (!response.ok) throw Error(`Recipe failed (${response.status})`);
  const builder = new GramlotBuilder('main');
  builder.loadSource(fromTytx(await response.text(), 'json'));
  const application = new Application(document.getElementById('root'), null, {inspector});
  try { application.mountBuilder(builder); }
  catch (error) { application.dispose(); throw error; }
  window.addEventListener('pagehide', event => {
    if (!event.persisted) application.dispose();
  });
}
start().catch(error => {
  const message = document.getElementById('error');
  message.hidden = false;
  message.textContent = error.message;
});
