"""Build the self-contained branded HTML component handbook from its source."""
from pathlib import Path
import base64
import html
import re
import zipfile
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/development/component-guide-content.md'
OUTPUT = ROOT / 'docs/guides/component-development.html'

def inline(text):
    slots=[]
    def keep(match):
        slots.append('<code>'+html.escape(match.group(1))+'</code>')
        return f'ZZCODE{len(slots)-1}ZZ'
    text=re.sub(r'`([^`]+)`',keep,text)
    text=html.escape(text)
    text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m:'<a href="'+html.escape(m[2],quote=True)+'">'+m[1]+'</a>',text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',text)
    for i,slot in enumerate(slots):text=text.replace(f'ZZCODE{i}ZZ',slot)
    return text

def render(lines):
    out=[];para=[];listing=False;i=0
    def flush():
        if para:out.append('<p>'+inline(' '.join(para))+'</p>');para.clear()
    while i<len(lines):
        line=lines[i]
        if line.startswith('```'):
            flush()
            if listing:out.append('</ul>');listing=False
            language=line[3:].strip();code=[];i+=1
            while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
            out.append('<div class="code-block"><div class="code-bar"><span>'+html.escape(language or 'code')+'</span><button class="copy" type="button">Copy</button></div><pre><code>'+html.escape('\n'.join(code))+'</code></pre></div>')
        elif line.startswith('### '):
            flush()
            if listing:out.append('</ul>');listing=False
            out.append('<h3>'+inline(line[4:])+'</h3>')
        elif line.startswith('- '):
            flush()
            if not listing:out.append('<ul>');listing=True
            out.append('<li>'+inline(line[2:])+'</li>')
        elif listing and line.startswith(' ') and line.strip():
            out[-1]=out[-1][:-5]+' '+inline(line.strip())+'</li>'
        elif not line.strip():
            flush()
            if listing:out.append('</ul>');listing=False
        elif line.startswith('# '):pass
        else:para.append(line.strip())
        i+=1
    flush()
    if listing:out.append('</ul>')
    return '\n'.join(out)

CSS='''
.contents-toggle{display:none;border:1px solid #dce3ee;border-radius:4px;background:white;padding:7px 10px;color:#1739a6;cursor:pointer;margin-top:10px}
:root{--blue:#1739a6;--ink:#182743;--muted:#657187;--gold:#f2b900;--line:#dce3ee;--paper:#fff;--back:#edf1f7}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:26px}body{margin:0;background:var(--back);color:var(--ink);font:16px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--blue);text-underline-offset:3px}aside{position:fixed;inset:0 auto 0 0;width:275px;background:#fff;border-right:1px solid var(--line);padding:26px 24px;overflow:auto}.brand{display:flex;align-items:center;gap:10px;font-weight:730;font-size:24px;letter-spacing:-.8px}.brand img{width:46px;height:46px;object-fit:contain}.eyebrow{text-transform:uppercase;letter-spacing:2px;font-size:10px;font-weight:700;color:var(--muted)}aside .eyebrow{margin:24px 0 12px}nav a{display:flex;align-items:baseline;gap:11px;text-decoration:none;color:var(--muted);padding:8px 0;font-size:12px;line-height:1.5}nav a span{font:10px ui-monospace,monospace;color:#9aa5b6}nav a.active{color:var(--blue);font-weight:700}.nav-bottom{margin-top:22px;border-top:1px solid var(--line);padding-top:20px;font-size:12px}.nav-bottom a{display:block;margin:8px 0}main{margin-left:275px;padding:36px 40px 80px;max-width:1350px}.page{background:white;max-width:900px;margin:0 auto 28px;padding:54px 66px;box-shadow:0 6px 22px #18274308;border:1px solid #e0e6ef;border-radius:5px;position:relative}.page:before{content:"";display:block;width:38px;height:4px;background:var(--gold);margin-bottom:24px}.running{display:flex;justify-content:space-between;gap:20px;font-size:10px;text-transform:uppercase;letter-spacing:1.7px;color:#8894a7;margin-bottom:35px}h1{font-size:48px;line-height:1.12;letter-spacing:-2px;margin:24px 0;color:#173572;font-weight:730}h2{font-size:31px;line-height:1.22;letter-spacing:-.9px;margin:8px 0 26px}h3{font-size:18px;line-height:1.4;margin:30px 0 10px;color:#244681}p{margin:0 0 16px}li{padding-left:3px;margin:6px 0}ul{padding-left:22px}code{font: .85em ui-monospace,SFMono-Regular,Consolas,monospace;background:#edf2fa;padding:2px 4px;border-radius:3px;overflow-wrap:anywhere}.code-block{margin:18px 0;border:1px solid #d9e2f0;border-radius:7px;overflow:hidden;background:#f5f8fd;break-inside:avoid}.code-bar{display:flex;justify-content:space-between;padding:7px 14px;background:#eaf0f9;color:#576b8c;font:10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:1px}.copy{border:0;background:transparent;color:var(--blue);font:inherit;cursor:pointer}.code-block pre{margin:0;padding:16px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;font-size:12px}.code-block code{background:transparent;padding:0;font:inherit}.page-footer{margin-top:38px;padding-top:15px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:10px;color:#8390a5;letter-spacing:.7px}.cover-logo{width:115px;float:right;margin:0 0 10px 24px}.lead{font-size:20px;line-height:1.5;color:#657187;margin-bottom:24px}.edition{display:inline-block;font-size:10px;letter-spacing:1.3px;text-transform:uppercase;padding:7px 10px;border:1px solid #dbe3f0;border-radius:4px;color:#566985}.route{display:flex;gap:8px;margin:25px 0 32px;flex-wrap:wrap}.route span{background:#edf2fa;color:#344f83;padding:7px 11px;border-radius:4px;font-size:11px;font-weight:600}.print-button{width:100%;background:var(--blue);color:white;border:0;padding:11px;border-radius:5px;cursor:pointer;font:inherit;font-size:12px}.cover-title{margin-bottom:35px}.chapter-number{color:var(--blue);font:12px ui-monospace,monospace;letter-spacing:2px}.page img{max-width:100%}@media(max-width:1050px){aside{width:220px;padding:20px}main{margin-left:220px;padding:24px}.page{padding:36px}}@media(max-width:720px){aside{position:static;width:auto;border-right:0;border-bottom:1px solid var(--line)}aside nav{display:none}aside.show-contents nav{display:block}.contents-toggle{display:block!important}.nav-bottom{display:flex;gap:16px;align-items:center;margin:12px 0 0;padding-top:12px}.nav-bottom a{margin:0}.print-button{width:auto}.nav-bottom .eyebrow{display:none}main{margin:0;padding:14px}.page{padding:28px 22px}h1{font-size:36px}h2{font-size:26px}.cover-logo{width:75px}.running{font-size:8px}.code-block pre{font-size:11px}}@page{size:A4;margin:15mm 16mm}@media print{body{background:white;font-size:10pt;line-height:1.5}aside,.copy{display:none}main{margin:0;padding:0;max-width:none}.page{box-shadow:none;border:0;border-radius:0;max-width:none;padding:0;margin:0;break-before:page}.page:first-child{break-before:auto}.page:before{margin-bottom:12px}.running{margin-bottom:20px}h1{font-size:32pt}h2{font-size:22pt}h3{font-size:12pt;margin-top:18px;break-after:avoid}p{margin-bottom:10px}.code-block{margin:10px 0}.code-block pre{font-size:8pt;padding:10px;line-height:1.45}.page-footer{margin-top:20px}.lead{font-size:13pt}a{color:inherit;text-decoration:none}}
'''

def build():
    text=SOURCE.read_text()
    parts=re.split(r'^## (.+)$',text,flags=re.M)
    chapters=[(parts[i],parts[i+1].strip().splitlines()) for i in range(1,len(parts),2)]
    if len(chapters)!=12:raise ValueError(f'Expected twelve chapters, got {len(chapters)}')
    logo='data:image/png;base64,'+base64.b64encode((ROOT/'assets/gramlot-logo.png').read_bytes()).decode()
    titles=[re.sub(r'^\d+[. —–:-]*','',title).strip() for title,_ in chapters]
    nav=''.join(f'<a href="#chapter-{i}"><span>{i:02}</span>{html.escape(t)}</a>' for i,t in enumerate(titles,1))
    sections=[]
    for i,((_,lines),title) in enumerate(zip(chapters,titles),1):
        hero=f'<div class="cover-title"><img class="cover-logo" src="{logo}" alt="Gramlot logo"><span class="edition">Developer handbook · September 2026</span><h1>Build components.<br>Compose interfaces.</h1><p class="lead">From your first Web Component to a working Gramlot integration.</p><div class="route"><span>Browser fundamentals</span><span>Component contracts</span><span>Gramlot integration</span></div></div>' if i==1 else ''
        sections.append(f'<section class="page" id="chapter-{i}"><div class="running"><span>Gramlot / Component development</span><span>{"Foundations" if i<=6 else "Integration"}</span></div>{hero}<div class="chapter-number">CHAPTER {i:02}</div><h2>{html.escape(title)}</h2>{render(lines)}<div class="page-footer"><span>GRAMLOT · DEVELOPER HANDBOOK</span><span>{i:02} / 12</span></div></section>')
    script='''document.querySelector('.contents-toggle').onclick=e=>{const open=document.querySelector('aside').classList.toggle('show-contents');e.target.setAttribute('aria-expanded',String(open))};document.querySelector('.print-button').onclick=()=>print();document.querySelectorAll('.copy').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.closest('.code-block').querySelector('code').textContent);b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1500)}catch{b.textContent='Select code to copy'}});const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id))}},{rootMargin:'-10% 0px -65% 0px'});document.querySelectorAll('.page').forEach(s=>observer.observe(s));'''
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Component development — Gramlot</title><style>{CSS}</style></head><body><aside><div class="brand"><img src="{logo}" alt="Gramlot">Gramlot</div><p class="eyebrow">Component development</p><button class="contents-toggle" type="button" aria-expanded="false" aria-controls="contents">Browse 12 chapters</button><nav id="contents" aria-label="Chapters">{nav}</nav><div class="nav-bottom"><button class="print-button" type="button">Print / Save as PDF</button><a href="component-examples.zip" download>Download example files ↗</a><p class="eyebrow">12 chapters · Native to Gramlot</p></div></aside><main>{"".join(sections)}</main><script>{script}</script></body></html>')
    with zipfile.ZipFile(OUTPUT.with_name('component-examples.zip'),'w',zipfile.ZIP_DEFLATED) as archive:
        for p in sorted((ROOT/'docs/examples/components/component-guide').glob('*')):
            if p.is_file():archive.write(p,'component-guide/'+p.name)
    bundle = OUTPUT.parent / 'gramlot-component-guide'
    bundle.mkdir(exist_ok=True)
    sources = [SOURCE, OUTPUT, OUTPUT.with_name('component-examples.zip'),
               ROOT/'docs/source/guide/components.rst',
               ROOT/'docs/development/component-contract-probe-2026-09-10.md',
               ROOT/'scripts/generate_components.py']
    for directory in ['docs/examples/components/component-guide',
                      'docs/examples/components/textbox', 'js/dom/src/components']:
        sources.extend(p for p in (ROOT/directory).rglob('*')
                       if p.is_file() and '__pycache__' not in p.parts)
    for source in sources:
        target = bundle / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    (bundle/'START-HERE.txt').write_text(
        'Gramlot Component Development Guide — alpha\n\n'
        'Open docs/guides/component-development.html for the offline handbook.\n'
        'Examples and source references are included for inspection. Running the\n'
        'integration tests requires the Gramlot repository and its dependencies;\n'
        'this archive is documentation, not a runtime distribution.\n')
    with zipfile.ZipFile(OUTPUT.with_name('gramlot-component-guide.zip'), 'w', zipfile.ZIP_DEFLATED) as archive:
        for source in sorted(bundle.rglob('*')):
            if source.is_file() and '__pycache__' not in source.parts:
                archive.write(source, source.relative_to(bundle))
    print(f'Built {OUTPUT} ({len(chapters)} chapters)')

if __name__=='__main__':build()
