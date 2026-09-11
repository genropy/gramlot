// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {getComponentBases} from '../components/bases.js';
import {addDays, civil, daysInMonth, parts} from '../date-parser/civil.js';

export function formatCivil(iso, locale, options = {day:'2-digit', month:'2-digit', year:'numeric'}) {
    const formatter=new Intl.DateTimeFormat(locale, {...options, timeZone:'UTC'});
    const date=new Date(`${iso}T12:00:00Z`);
    return formatter.formatToParts(date).map(part=>part.type==='year' && options.year==='numeric' ? part.value.padStart(4,'0') : part.value).join('');
}

/** Reusable civil-date picker. Selection is an ISO date (or null), not a Data write. */
export function defineDateCalendar() {
    if (customElements.get('gnr-datecalendar')) return;
    const {GramlotElement} = getComponentBases();
    class DateCalendar extends GramlotElement {
        static get observedAttributes() { return ['value','locale','workdate']; }
        onConnect() { if(!this.active) this.reset(); }
        attributeChangedCallback() { if(this.isConnected) this.reset(); }
        reset() {
            const now=new Date();
            const today=civil(now.getFullYear(),now.getMonth()+1,now.getDate());
            this.configure({value:this.getAttribute('value') || null,
                locale:this.getAttribute('locale') || this.ownerDocument.documentElement.lang || 'en',
                workdate:this.getAttribute('workdate') || today});
        }
        constructor() {
            super();
            this.attachShadow({mode:'open'});
            this.shadowRoot.addEventListener('keydown', event => this.navigate(event));
        }
        configure({value, workdate, locale}) {
            this.locale = locale;
            this.workdate = workdate;
            this.selected = value;
            this.active = value || workdate;
            this.render();
        }
        render(focus = false) {
            const [year, month] = parts(this.active);
            const it = this.locale.toLowerCase().startsWith('it');
            this.shadowRoot.innerHTML = `<style>
:host{display:block;width:17em;max-width:100%;font:inherit;color:inherit}
header,footer{display:flex;align-items:center;justify-content:space-between;gap:.3em}
button{font:inherit;color:inherit;background:transparent;border:1px solid transparent;border-radius:3px;padding:.3em;cursor:pointer}
button:hover,button:focus-visible{background:#e8f0fb;border-color:#447fc0}button[aria-pressed=true]{background:#326da8;color:white}
.grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin:.4em 0}.weekday{font-size:.8em;padding:.3em}
</style><header><button type="button" data-month="-1" aria-label="${it ? 'Mese precedente' : 'Previous month'}">‹</button><strong></strong><button type="button" data-month="1" aria-label="${it ? 'Mese successivo' : 'Next month'}">›</button></header><div class="grid"></div><footer><button type="button" data-today>${it ? 'Oggi' : 'Today'}</button><button type="button" data-clear>${it ? 'Cancella' : 'Clear'}</button></footer>`;
            this.shadowRoot.querySelector('strong').textContent = formatCivil(this.active,this.locale,{month:'long',year:'numeric'});
            const grid = this.shadowRoot.querySelector('.grid');
            // Monday first, consistently across the alpha's supported locales.
            for (let i=0;i<7;i++) {
                const label = this.ownerDocument.createElement('span');
                label.className = 'weekday';
                label.textContent = formatCivil(addDays('2026-09-07',i),this.locale,{weekday:'narrow'});
                grid.append(label);
            }
            const offset = (new Date(`${civil(year,month,1)}T12:00:00Z`).getUTCDay()+6)%7;
            for(let i=0;i<offset;i++) grid.append(this.ownerDocument.createElement('span'));
            for(let day=1;day<=daysInMonth(year,month);day++) {
                const iso = civil(year,month,day), button = this.ownerDocument.createElement('button');
                button.type='button'; button.textContent=String(day); button.dataset.date=iso;
                button.tabIndex = iso === this.active ? 0 : -1;
                button.setAttribute('aria-label',formatCivil(iso,this.locale,{dateStyle:'full'}));
                button.setAttribute('aria-pressed',String(iso === this.selected));
                button.addEventListener('click',()=>this.choose(iso)); grid.append(button);
            }
            for(const button of this.shadowRoot.querySelectorAll('[data-month]')) button.addEventListener('click',()=>this.moveMonth(Number(button.dataset.month)));
            this.shadowRoot.querySelector('[data-today]').addEventListener('click',()=>this.choose(this.workdate));
            this.shadowRoot.querySelector('[data-clear]').addEventListener('click',()=>this.choose(null));
            if(focus) this.focusDay();
        }
        focusDay() { this.shadowRoot.querySelector(`[data-date="${this.active}"]`)?.focus(); }
        choose(value) {
            this.selected=value; if(value) this.active=value; this.render(true);
            this.dispatchEvent(new this.ownerDocument.defaultView.CustomEvent('date-select',{detail:{value},bubbles:true,composed:true})); }
        moveMonth(offset) {
            const [year,month,day]=parts(this.active), index=year*12+month-1+offset;
            const y=Math.floor(index/12), m=(index%12+12)%12+1;
            if(y<1 || y>9999) return;
            this.active=civil(y,m,Math.min(day,daysInMonth(y,m))); this.render(true);
        }
        navigate(event) {
            if(!event.target.dataset.date) return;
            const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
            if(event.key==='PageUp'||event.key==='PageDown') { event.preventDefault(); this.moveMonth(event.key==='PageUp'?-1:1); }
            else if(Object.hasOwn(offsets,event.key)) {
                event.preventDefault();
                try { this.active=addDays(this.active,offsets[event.key]); this.render(true); } catch {}
            }
        }
    }
    customElements.define('gnr-datecalendar', DateCalendar);
}
