// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0

/** A shared visual/focus boundary around a control and its optional tools.
 * Requires a host with an open shadow root and a control in the same document.
 * The host editor, never this helper, owns values and confirmation policy.
 */
export class ControlTools {
    constructor(host, control, {onLeave, onCancel} = {}) {
        if (!host.shadowRoot) throw new TypeError('ControlTools requires an open shadow root');
        this.host=host; this.control=control; this.onLeave=onLeave; this.onCancel=onCancel;
        this.tools=new Set(); this.active=false; this.sequence=0;
        const doc=host.ownerDocument;
        this.element=doc.createElement('div'); this.element.className='gnr-control-tools';
        this.strip=doc.createElement('span'); this.strip.className='gnr-control-tool-strip';
        control.classList.add('gnr-tooled-control');
        const parent=control.parentNode, next=control.nextSibling;
        this.element.append(control,this.strip);
        if(parent) parent.insertBefore(this.element,next);
        const style=doc.createElement('style'); style.textContent=CSS;
        host.shadowRoot.append(style);
        this.element.addEventListener('focusin',()=>{ this.active=true; });
        this.element.addEventListener('input',()=>{ this.active=true; });
        this.element.addEventListener('focusout',event=>{
            if(this.contains(event.relatedTarget)) return;
            if(event.relatedTarget) this.leave('focus');
            // Rebuilding a tool can temporarily remove the focused node. Let
            // its replacement receive focus before classifying a null target.
            else queueMicrotask(()=>{
                if(this.connected && !this.contains(doc.activeElement)) this.leave('focus');
            });
        });
        this.element.addEventListener('keydown',event=>{
            if(event.key!=='Escape' || event.isComposing) return;
            event.preventDefault(); event.stopPropagation();
            this.active=false;
            this.onCancel?.(); this.close(); this.control.focus();
        });
        this.windowBlur=()=>this.leave('window');
        this.pointer=event=>{
            if(event.composedPath().includes(this.element) || event.composedPath().includes(this.host)) this.active=true;
            else this.leave('pointer');
        };
    }
    get locked() { return this.control.disabled || this.control.readOnly || this.host.hasAttribute('disabled') || this.host.hasAttribute('readonly'); }
    contains(node) {
        if(!node) return false;
        // Focus is retargeted to the host outside its shadow; inside it, nested
        // tool shadow roots can expose either the inner node or their host.
        if(node===this.host) return true;
        while(node) {
            if(this.element.contains(node)) return true;
            node=node.getRootNode?.().host;
        }
        return false;
    }
    connect() {
        if(this.connected) return;
        this.connected=true;
        this.host.ownerDocument.addEventListener('pointerdown',this.pointer,true);
        this.host.ownerDocument.defaultView.addEventListener('blur',this.windowBlur);
        this.sync();
    }
    disconnect() {
        this.connected=false; this.active=false;
        this.host.ownerDocument.removeEventListener('pointerdown',this.pointer,true);
        this.host.ownerDocument.defaultView.removeEventListener('blur',this.windowBlur);
        this.close();
    }
    sync() {
        for(const tool of this.tools) tool.button.disabled=this.locked;
        if(this.locked) { this.active=false; this.close(); }
    }
    leave(reason) {
        if(!this.active) return;
        this.active=false;
        if(!this.locked) this.onLeave?.({reason});
        this.close();
    }
    close() { for(const tool of this.tools) tool.close(); }
    add({label, icon, content, onOpen, focus, action} = {}) {
        const doc=this.host.ownerDocument;
        const button=doc.createElement('button'); button.type='button';
        button.className='gnr-control-tool'; button.disabled=this.locked;
        if(icon) button.append(icon);
        else button.textContent=label;
        this.strip.append(button);
        const popup=content ? doc.createElement('div') : null;
        if(popup) {
            popup.className='gnr-control-tool-popup'; popup.hidden=true;
            popup.id=`control-tool-${++this.sequence}`;
            popup.setAttribute('role','dialog'); popup.setAttribute('popover','auto');
            popup.append(content); this.element.append(popup);
            button.setAttribute('aria-haspopup','dialog'); button.setAttribute('aria-expanded','false');
            button.setAttribute('aria-controls',popup.id);
        }
        const tool={button,popup,isOpen:false,
            setLabel(value) { button.setAttribute('aria-label',value); button.title=value; popup?.setAttribute('aria-label',value); },
            open:()=>{
                if(this.locked || !popup || tool.isOpen || !this.host.isConnected) return;
                this.close(); this.active=true; onOpen?.();
                tool.isOpen=true; popup.hidden=false; button.setAttribute('aria-expanded','true');
                popup.showPopover?.();
                const rect=this.element.getBoundingClientRect(), win=doc.defaultView;
                const size=popup.getBoundingClientRect();
                popup.style.left=`${Math.max(4,Math.min(rect.left,win.innerWidth-size.width-4))}px`;
                popup.style.top=`${Math.max(4,Math.min(rect.bottom+4,win.innerHeight-size.height-4))}px`;
                if(focus) focus(); else (popup.querySelector('button,input,select,textarea,[tabindex]') || popup).focus();
            },
            close:()=>{
                if(!popup || !tool.isOpen) return;
                tool.isOpen=false; button.setAttribute('aria-expanded','false');
                if(popup.hidePopover && popup.isConnected && popup.matches(':popover-open')) popup.hidePopover();
                popup.hidden=true;
            },
            remove:()=>{ tool.close(); button.remove(); popup?.remove(); this.tools.delete(tool); },
        };
        tool.setLabel(label || 'Open tool');
        button.addEventListener('click',()=>{
            if(this.locked) return;
            this.active=true;
            if(popup) { if(tool.isOpen) { tool.close(); this.control.focus(); } else tool.open(); }
            else action?.();
        });
        popup?.addEventListener('toggle',event=>{
            if(event.newState!=='closed' || !tool.isOpen) return;
            // A queued old toggle must not dismiss a popup reopened meanwhile.
            if(typeof popup.showPopover==='function' && popup.matches(':popover-open')) return;
            // An automatic browser dismissal follows an outside pointer/focus
            // event. leave() is idempotent, including this delayed notification.
            tool.isOpen=false; popup.hidden=true; button.setAttribute('aria-expanded','false');
            // Returning to the editor can light-dismiss its popup without
            // leaving the combined editing region. Keep that draft provisional.
            if (!this.contains(doc.activeElement)) this.leave('dismiss');
        });
        this.tools.add(tool);
        return tool;
    }
}

const CSS=`
.gnr-control-tools{display:flex;align-items:stretch;position:relative;min-width:0;border:1px solid var(--field-border,#c8c8c8);border-radius:var(--form-field-radius,3px);background:var(--field-bg,#fff)}
.gnr-control-tools:focus-within{border-color:var(--field-focus-border,#4a90d9)}
.gnr-control-tools>.gnr-tooled-control{flex:1 1 auto;min-width:0;border:0!important;border-radius:inherit;outline:none}
.gnr-control-tool-strip{display:flex;align-items:center;flex:none;padding-inline:2px}
.gnr-control-tool{display:flex;align-items:center;justify-content:center;font:inherit;color:inherit;background:transparent;border:0;border-radius:2px;margin:0;padding:3px;cursor:pointer}
.gnr-control-tool:hover:not(:disabled),.gnr-control-tool:focus-visible{background:var(--field-tool-hover,#e8f0fb)}
.gnr-control-tool:disabled{opacity:.45;cursor:default}
.gnr-control-tool-popup{position:fixed;margin:0;inset:auto;padding:8px;border:1px solid var(--field-border,#bac4d1);border-radius:5px;background:var(--field-bg,#fff);color:inherit;box-shadow:0 3px 12px #0003;z-index:10000;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto}
.gnr-control-tool-popup[hidden]{display:none}
`;
