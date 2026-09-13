// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Small monochrome file glyphs; names are never interpolated into markup. */
export function fileIcon(name, directory=false){
    const namespace='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(namespace,'svg');
    svg.setAttribute('viewBox','0 0 18 18');svg.setAttribute('width','16');svg.setAttribute('height','16');
    svg.setAttribute('aria-hidden','true');svg.style.cssText='color:#89939f;flex:none;vertical-align:middle';
    const path=document.createElementNS(namespace,'path');
    path.setAttribute('d',directory?'M2 5V3.5h5l2 2H16v10H2z M2 7h14':'M4 1.5h6l4 4V16H4z M10 1.5V6h4');
    path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1');path.setAttribute('stroke-linejoin','round');svg.append(path);
    if(!directory){
        const extension=String(name).split('.').pop().toLowerCase();
        const symbol={py:'py',js:'JS',ts:'TS',json:'{}',html:'<>',htm:'<>',css:'#',md:'M↓',xml:'<>',sql:'DB',txt:'≡',png:'◇',jpg:'◇',jpeg:'◇',svg:'◇',sh:'$_',toml:'≡',yaml:'≡',yml:'≡',pdf:'pdf'}[extension]||'≡';
        const text=document.createElementNS(namespace,'text');text.setAttribute('x','9');text.setAttribute('y','12.8');text.setAttribute('text-anchor','middle');text.setAttribute('fill','currentColor');text.setAttribute('font-size','5.5');text.setAttribute('font-family','system-ui');text.textContent=symbol;svg.append(text);
    }
    return svg;
}
