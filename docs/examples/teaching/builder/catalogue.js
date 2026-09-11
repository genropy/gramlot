import {HTML5_GRAMMAR} from '/_assets/dom/contrib/html/html5-elements.js';
import {BUILTIN_COMPONENTS} from '/_assets/dom/components/builtin-components.js';

const groups={
 'Structure / Sections':'div main section article aside header footer nav address search hgroup',
 'Text / Headings':'h1 h2 h3 h4 h5 h6',
 'Text / Blocks':'p pre blockquote hr',
 'Text / Inline':'a span abbr b bdi bdo br cite code data dfn em i kbd mark q rp rt ruby s samp small strong sub sup time u var wbr del ins',
 'Lists':'ul ol li dl dt dd menu',
 'Tables':'table caption colgroup col thead tbody tfoot tr th td',
 'Forms / Controls':'input textarea select option optgroup button datalist output progress meter',
 'Forms / Grouping':'form fieldset legend label',
 'Media / Images':'img picture source map area figure figcaption',
 'Media / Audio and video':'audio video track',
 'Embedded content':'iframe embed object param canvas svg math',
 'Interactive':'details summary dialog',
 'Document and metadata':'html head body title base link meta style script noscript template slot',
};
const unavailable=new Set('html head body title base link meta style script noscript template svg math'.split(' '));
const defaults={
 div:{attrs:{class:'design-container'}}, h2:{text:'Heading'}, p:{text:'Write something'}, button:{text:'Button',attrs:{type:'button'}},
 input:{attrs:{placeholder:'Text'}},textarea:{attrs:{placeholder:'Text',rows:3}},
 a:{text:'Link'},img:{attrs:{alt:'Image',width:120,height:80}},
 formlet:{attrs:{columns:2}},labledBox:{attrs:{label:'Panel',label_position:'TC'}},
 textBox:{attrs:{lbl:'Text',value:''}},numberTextBox:{attrs:{lbl:'Number',value:0}},
 checkbox:{attrs:{lbl:'Enabled',checked:false}},colorpicker:{attrs:{lbl:'Color',value:'#315dbd'}},
 tab:{attrs:{label:'Tab'}},palette:{attrs:{title:'Panel',value:true}},
};
export function makeCatalogue(schema){
 const result={};
 for(const [tag,entry] of Object.entries(HTML5_GRAMMAR.elements)){
  const group=Object.entries(groups).find(([,tags])=>tags.split(' ').includes(tag))?.[0]||'Other HTML';
  result[tag]={group:'HTML / '+group,container:!!entry.sub_tags,
   ...(entry.sub_tags==='*'&&!['div','section','article','table','ul','ol','form','details'].includes(tag)?{text:tag}:{}),
   ...defaults[tag],disabled:unavailable.has(tag)?'Document-level or specialized element; not insertable in this canvas.':null};
 }
 for(const collection of BUILTIN_COMPONENTS)for(const component of collection.components){
  const tag=component.name;
  result[tag]={group:'Gramlot collections / '+collection.name,container:!!component.subTags,...defaults[tag],
   disabled:!schema[tag]?'Collection not loaded in this playground.':null};
 }
 return result;
}
