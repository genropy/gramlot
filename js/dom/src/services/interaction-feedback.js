// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
/** Application-owned busy feedback and independently owned interaction locks. */
export class InteractionFeedback {
    constructor(application) {
        this.application = application;
        this.locks = new Map();
    }

    busy(sourceNode) {
        const root = this.application.target.root;
        root.dispatchEvent(new root.ownerDocument.defaultView.CustomEvent('gramlot:busy', {
            bubbles: true, detail: {sourceNode},
        }));
        // Audio may be disallowed until a user gesture. The command stays rejected.
        try {
            const WindowAudio = root.ownerDocument.defaultView.AudioContext
                || root.ownerDocument.defaultView.webkitAudioContext;
            if (!WindowAudio) return;
            this.audio ??= new WindowAudio();
            const play = () => {
                if (this.application._disposed || this.audio.state !== 'running') return;
                const oscillator = this.audio.createOscillator();
                const volume = this.audio.createGain();
                oscillator.frequency.value = 220;
                volume.gain.setValueAtTime(0.06, this.audio.currentTime);
                volume.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.1);
                oscillator.connect(volume); volume.connect(this.audio.destination);
                oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
                oscillator.start(); oscillator.stop(this.audio.currentTime + 0.1);
            };
            if (this.audio.state === 'running') play();
            else this.audio.resume().then(play).catch(() => {});
        } catch { /* Browser audio policy must never change RPC behavior. */ }
    }

    lock(owner) {
        const token = {};
        this.locks.set(token, owner);
        if (!this.overlay) {
            const root = this.application.target.root;
            this.wasInert = root.inert;
            root.inert = true;
            this.overlay = root.ownerDocument.createElement('div');
            this.overlay.setAttribute('role', 'status');
            this.overlay.setAttribute('aria-label', 'Working');
            this.overlay.setAttribute('data-gramlot-screen-lock', '');
            this.overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;cursor:wait;background:rgba(0,0,0,.06)';
            this.overlay.addEventListener('pointerdown', event => { event.preventDefault(); this.busy(owner); });
            root.ownerDocument.body.append(this.overlay);
        }
        return () => { this.locks.delete(token); this._refresh(); };
    }

    releaseOwner(owner) {
        for (const [token, heldBy] of this.locks) if (heldBy === owner) this.locks.delete(token);
        this._refresh();
    }

    _refresh() {
        if (this.locks.size || !this.overlay) return;
        this.overlay.remove(); this.overlay = null;
        this.application.target.root.inert = this.wasInert;
    }

    dispose() {
        this.locks.clear(); this._refresh();
        this.audio?.close().catch(() => {});
    }
}
