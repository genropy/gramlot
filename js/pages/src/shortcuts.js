// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Page-owned command registry. Exact modifiers, no repeat/IME, explicit disposal. */
export class Shortcuts {
    constructor(target) {
        this.commands = new Map();
        this.target = target;
        this.listener = event => {
            if (event.defaultPrevented || event.repeat || event.isComposing) return;
            for (const entry of this.commands.values()) {
                const keys = entry.keys.toLowerCase().split('+');
                if (event.key.toLowerCase() !== keys.at(-1)) continue;
                if (['ctrl', 'shift', 'alt', 'meta'].some(mod =>
                    Boolean(event[mod + 'Key']) !== keys.includes(mod))) continue;
                const editing = event.composedPath().some(el =>
                    /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
                if (editing && !entry.allowEditing) continue;
                event.preventDefault();
                entry.action();
                break;
            }
        };
        target.addEventListener('keydown', this.listener);
    }
    register(name, keys, action, {allowEditing = false} = {}) {
        this.commands.set(name, {keys, action, allowEditing});
        return () => this.commands.delete(name);
    }
    execute(name) { this.commands.get(name)?.action(); }
    dispose() {
        this.target.removeEventListener('keydown', this.listener);
        this.commands.clear();
    }
}
