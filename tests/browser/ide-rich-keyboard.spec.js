import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

// Run with Chromium and WebKit: fill() alone does not test keyboard focus.
test('rich text accepts real typing while document scripts remain blocked',async({page})=>{
 const source=readFileSync(new URL('../../js/dom/src/collections/html-editor.js',import.meta.url),'utf8');
 await page.setContent('<body></body>');
 await page.addScriptTag({type:'module',content:source+'\ndefineHtmlEditor();'});
 await page.evaluate(async()=>{
  await customElements.whenDefined('gnr-proseeditor');
  const editor=document.createElement('gnr-proseeditor');editor.style.height='500px';editor.readonly=false;
  editor.value='<html><body><h1 onclick="window.documentScriptRan=true">Heading</h1><script>window.documentScriptRan=true</script></body></html>';
  document.body.append(editor);
 });
 const frame=page.locator('gnr-proseeditor').frameLocator('iframe');
 await frame.locator('h1').click();
 await expect(frame.locator('h1')).toHaveAttribute('contenteditable','true');
 await page.keyboard.type('typed');
 await expect(frame.locator('h1')).toContainText('typed');
 const result=await page.locator('gnr-proseeditor').evaluate(editor=>({html:editor.value,ran:editor.shadowRoot.querySelector('iframe').contentWindow.documentScriptRan===true}));
 expect(result.html).toContain('typed');expect(result.ran).toBe(false);
 await page.locator('gnr-proseeditor').evaluate(editor=>{editor.readonly=true;});
 await expect(frame.locator('h1')).toHaveAttribute('contenteditable','false');
});
