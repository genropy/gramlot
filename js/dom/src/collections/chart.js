// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
import {registerComponentCollection} from '../components/registry.js';
import {builtinComponents} from '../components/builtin-components.js';
import {BagRows} from '../stores/bag-rows.js';
import {scaleBand, scaleLinear, select, axisBottom, axisLeft, pie, arc} from '../charts/d3.js';

let serial = 0;
function defineComponents() {
    if (customElements.get('gnr-chart')) return;
    class Chart extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({mode:'open'}).innerHTML = `<style>
                :host{display:block;min-width:0;height:300px;background:white}
                svg{display:block;width:100%;height:100%;font:12px system-ui}
                .bar,.slice,.legend-entry{cursor:pointer;outline:none}
                .bar.selected,.bar:focus-visible,.slice.selected,.slice:focus-visible{stroke:#172554;stroke-width:3}
                .slice{stroke:white;stroke-width:2}.legend-entry.selected text{font-weight:bold;text-decoration:underline}
                .legend-entry:focus-visible text{text-decoration:underline}.legend-entry text{fill:#334155}
                .axis{color:#64748b}.value{pointer-events:none;fill:#334155}.error{color:#9b2929;padding:12px}
                </style><div class="error" role="status" hidden></div>`;
            this.svg = select(this.shadowRoot).append('svg').attr('role','group').attr('aria-label','Bar chart');
            this.plot = this.svg.append('g');
            this.xAxis = this.plot.append('g').attr('class','axis');
            this.yAxis = this.plot.append('g').attr('class','axis');
            this.bars = this.plot.append('g');
            this.labels = this.plot.append('g');
            this.piePlot = this.svg.append('g');
            this.legend = this.svg.append('g');
            this._structureId = `chart-structure-${++serial}`;
            this._structureBags = [];
            this._selectedKey = null;
        }
        configure({store, struct, identifier = null, datamode = 'bag', selectedKey = null}) {
            this._config = {store, struct, identifier, datamode, selectedKey};
            this._selectedKey = selectedKey;
            if (!this.isConnected) return;
            if (!this._rows) {
                this._rows = new BagRows(store, {identifier, datamode});
                this._unsubscribe = this._rows.subscribe(() => this.schedule());
            } else this._rows.configure(store, {identifier, datamode});
            this._watchStructure();
            this.schedule();
        }
        get selectedKey() { return this._selectedKey; }
        connectedCallback() {
            this.configure(this._config || {});
            const Observer = this.ownerDocument.defaultView.ResizeObserver;
            if (Observer) { this._resize = new Observer(() => this.schedule()); this._resize.observe(this); }
        }
        disconnectedCallback() {
            this._resize?.disconnect(); this._unsubscribe?.(); this._rows?.dispose(); this._rows = null;
            this._unwatchStructure();
        }
        _unwatchStructure() {
            for (const bag of this._structureBags) bag.unsubscribe(this._structureId, {any:true});
            this._structureBags = [];
        }
        _watchStructure() {
            this._unwatchStructure();
            const visit = bag => {
                if (!bag?.getNodes || this._structureBags.includes(bag)) return;
                this._structureBags.push(bag);
                bag.subscribe(this._structureId, {any:() => { this._watchStructure(); this.schedule(); }});
                for (const node of bag.getNodes()) visit(node.getValue());
            };
            visit(this._config.struct);
        }
        schedule() {
            if (this._pending) return;
            this._pending = true;
            queueMicrotask(() => {this._pending = false; if (this.isConnected) this.render();});
        }
        choose(key) {
            if (Object.is(key, this._selectedKey)) return;
            this._selectedKey = key;
            this._config.selectedKey = key;
            const pointer = this.getAttribute('data-selectedKey-pointer');
            if (pointer) this.dispatchEvent(new CustomEvent('gnr-set', {
                bubbles:true, composed:true, detail:{pointer, value:key},
            }));
            this.schedule();
        }
        renderPie(points, width, height, showValues) {
            const positive = points.filter(p => p.value > 0);
            // Stable record keys determine colour, including after insertion/reordering.
            const colour = key => {
                let hash = 0;
                for (const c of `${typeof key}:${key}`) hash = (hash * 31 + c.codePointAt(0)) >>> 0;
                return `hsl(${(hash * 137.508) % 360},55%,52%)`;
            };
            const total = positive.reduce((sum,p) => sum + p.value,0);
            const description = p => `${p.caption}: ${p.value ?? 'No value'}${total && p.value != null ? ` (${(p.value / total * 100).toFixed(1)}%)` : ''}`;
            const key = p => `${typeof p.key}:${p.key}`;
            const legendHeight = Math.ceil(points.length / 2) * 20 + 16;
            const plotHeight = Math.max(80, height - legendHeight);
            const radius = Math.max(20, Math.min(width / 2 - 18, plotHeight / 2 - 12));
            this.piePlot.attr('transform',`translate(${width/2},${plotHeight/2})`);
            const shape = arc().innerRadius(0).outerRadius(radius);
            const sectors = pie().sort(null).value(p => p.value)(positive);
            const interactive = (selection, record) => selection
                .attr('tabindex',0).attr('role','button')
                .attr('aria-pressed',d => String(Object.is(record(d).key,this._selectedKey)))
                .attr('aria-label',d => description(record(d)))
                .on('click',(_,d) => this.choose(record(d).key))
                .on('keydown',(event,d) => {if (['Enter',' '].includes(event.key)) {event.preventDefault();this.choose(record(d).key);}});
            const slices = this.piePlot.selectAll('path').data(sectors,d => key(d.data)).join('path')
                .attr('class',d => `slice${Object.is(d.data.key,this._selectedKey) ? ' selected' : ''}`)
                .attr('data-row-key',d => String(d.data.key)).attr('data-value',d => d.data.value)
                .attr('d',shape).attr('fill',d => colour(d.data.key));
            interactive(slices,d => d.data).selectAll('title').data(d => [d]).join('title').text(d => description(d.data));
            this.piePlot.selectAll('text').data(total ? [] : ['No positive values']).join('text')
                .attr('text-anchor','middle').attr('fill','#64748b').text(d => d);
            this.legend.attr('transform',`translate(12,${plotHeight + 6})`);
            const entries = this.legend.selectAll('g').data(points,key).join(enter => {
                const g = enter.append('g');g.append('rect').attr('width',10).attr('height',10);
                g.append('text').attr('x',16).attr('y',9);g.append('title');return g;
            }).attr('class',p => `legend-entry${Object.is(p.key,this._selectedKey) ? ' selected' : ''}`)
                .attr('transform',(_,i) => `translate(${i%2*(width-24)/2},${Math.floor(i/2)*20})`);
            interactive(entries,p => p);
            entries.select('rect').attr('fill',p => colour(p.key));
            entries.select('text').text(p => `${p.caption.length>10 ? p.caption.slice(0,9)+'…' : p.caption}${showValues ? `: ${p.value ?? '—'}` : ''}`);
            entries.select('title').text(description);
        }
        render() {
            const structure = this._config.struct;
            const read = (key, fallback) => structure?.getItem(key) ?? fallback;
            const category = read('captionField', '');
            const field = read('valueField', '');
            const declared = structure?.getNode('datasetFields');
            const fields = [...new Set(String(declared ? read('datasetFields','') : field).split(',').map(s => s.trim()).filter(Boolean))];
            const chartType = read('chartType','bar');
            const error = this.shadowRoot.querySelector('.error');
            let points = [];
            try {
                if (this._rows.error) throw this._rows.error;
                if (!category || (chartType === 'pie' ? !field : !fields.length)) throw new Error('Choose a category and a numeric value field.');
                if (!['bar','pie'].includes(chartType)) throw new Error('Choose Bars or Pie as chart type.');
                points = this._rows.getItems().flatMap(node => (chartType === 'pie' ? [field] : fields).map(series => {
                    const raw = this._rows.getValue(node, series);
                    const value = raw == null || raw === '' ? null : Number(raw);
                    if (value != null && !Number.isFinite(value)) throw new Error(`Field "${series}" must contain finite numbers.`);
                    return {key:this._rows.keyGetter(node), caption:String(this._rows.getValue(node, category) ?? ''), series, value};
                }));
                if (chartType === 'pie' && points.some(p => p.value < 0)) throw new Error('Pie charts require nonnegative values. Choose Bars to display negative values.');
                error.hidden = true;
            } catch (reason) {
                error.textContent = reason.message; error.hidden = false;
                this.svg.attr('hidden', true).style('display','none'); return;
            }
            this.svg.attr('hidden', null).style('display',null).attr('aria-label', read('title', 'Bar chart'));
            if (this._selectedKey != null && !this._rows.row(this._selectedKey)) this.choose(null);
            const width = Math.max(240, this.clientWidth || 640);
            const height = Math.max(160, this.clientHeight || 300);
            this.svg.attr('viewBox', `0 0 ${width} ${height}`);
            if (chartType === 'pie') {
                this.plot.style('display','none');
                this.bars.selectAll('*').remove();this.labels.selectAll('*').remove();
                this.renderPie(points,width,height,read('showValues',true));
                return;
            }
            this.plot.style('display',null);
            this.piePlot.selectAll('*').remove();this.legend.selectAll('*').remove();
            const angledLabels = (width - 80) / Math.max(1, points.length) < 75;
            const legendRows = fields.length > 1 ? Math.ceil(fields.length / 2) : 0;
            const innerWidth = width - 80, innerHeight = Math.max(40,height - (angledLabels ? 105 : 72) - legendRows*20);
            const x = scaleBand().domain(points.map(p => p.key)).range([0, innerWidth]).padding(.24);
            const seriesX = scaleBand().domain(fields).range([0,x.bandwidth()]).padding(.08);
            const pointKey = p => JSON.stringify([typeof p.key,p.key,p.series]);
            const seriesColour = series => {let hash=0;for (const c of series) hash=(hash*31+c.charCodeAt(0))>>>0;return `hsl(${hash%360},55%,45%)`;};
            const colour = p => fields.length === 1 ? read('color','#4285b4') : seriesColour(p.series);
            const seriesLabel = series => read(`seriesLabels.${series}`,series);
            const description = p => `${p.caption} — ${seriesLabel(p.series)}: ${p.value}`;
            const values = points.filter(p => p.value != null).map(p => p.value);
            let lo = Math.min(0, ...values), hi = Math.max(0, ...values);
            if (lo === hi) hi = lo + 1;
            const y = scaleLinear().domain([lo, hi]).nice().range([innerHeight, 0]);
            this.svg.attr('viewBox', `0 0 ${width} ${height}`);
            this.plot.attr('transform','translate(62,24)');
            const captions = new Map(points.map(p => [p.key, p.caption]));
            this.xAxis.attr('transform', `translate(0,${innerHeight})`).call(axisBottom(x).tickFormat(key => captions.get(key)));
            this.xAxis.selectAll('text').attr('transform', angledLabels ? 'rotate(-35)' : null)
                .attr('text-anchor', angledLabels ? 'end' : 'middle')
                .attr('dx', angledLabels ? '-.5em' : null).attr('dy', angledLabels ? '.6em' : '.71em');
            this.yAxis.call(axisLeft(y).ticks(5));
            this.bars.selectAll('rect').data(points.filter(p => p.value != null), pointKey).join('rect')
                .attr('class', p => `bar${Object.is(p.key, this._selectedKey) ? ' selected' : ''}`)
                .attr('data-row-key', p => String(p.key)).attr('data-value', p => p.value).attr('data-series',p => p.series)
                .attr('x', p => x(p.key)+seriesX(p.series)).attr('y', p => y(Math.max(0,p.value)))
                .attr('width', seriesX.bandwidth()).attr('height', p => Math.max(1, Math.abs(y(p.value)-y(0))))
                .attr('fill', colour).attr('tabindex',0).attr('role','button')
                .attr('aria-pressed', p => Object.is(p.key, this._selectedKey) ? 'true' : 'false')
                .attr('aria-label', description)
                .on('click', (_,p) => this.choose(p.key))
                .on('keydown', (event,p) => {if (['Enter',' '].includes(event.key)) {event.preventDefault(); this.choose(p.key);}})
                .selectAll('title').data(p => [p]).join('title').text(description);
            this.labels.selectAll('text').data(read('showValues',true) ? points.filter(p => p.value != null) : [], pointKey).join('text')
                .attr('class','value').attr('text-anchor','middle').attr('x',p => x(p.key)+seriesX(p.series)+seriesX.bandwidth()/2)
                .attr('y',p => y(p.value)+(p.value < 0 ? 16 : -6)).text(p => p.value);
            this.legend.attr('transform',`translate(12,${height-legendRows*20})`);
            const entries=this.legend.selectAll('g').data(legendRows ? fields : []).join('g')
                .attr('class','series-legend').attr('transform',(_,i)=>`translate(${i%2*(width-24)/2},${Math.floor(i/2)*20})`);
            entries.append('rect').attr('width',10).attr('height',10).attr('fill',seriesColour);
            entries.append('text').attr('x',16).attr('y',9).text(seriesLabel);
        }
    }
    customElements.define('gnr-chart', Chart);
}
registerComponentCollection('chart', {components:builtinComponents('chart'), defineComponents});
