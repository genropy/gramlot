// The teaching host owns the inspector UI, as in Gramlot Rosetta.
for (const button of document.querySelectorAll('.inspector-tool')) {
    const frame = button.closest('.lab-row').querySelector('iframe');
    let element, application, observer, opening, generation = 0;
    const dispose = () => {
        element?.dispose(); element?.remove();
        element = application = null;
    };
    const watch = () => {
        generation++;
        observer?.disconnect(); dispose();
        const root = frame.contentDocument?.getElementById('root');
        if (root) {
            observer = new MutationObserver(() => { if (application?._disposed) dispose(); });
            observer.observe(root, {childList:true, subtree:true});
        }
    };
    const toggle = async () => {
        if (element && !application?._disposed) { element.opened = !element.opened; return; }
        const current = generation;
        const doc = frame.contentDocument;
        const launcher = doc?.querySelector('.gramlot-inspector-launcher');
        if (!launcher) throw new Error('The example is still loading. Please try again.');
        launcher.click();
        const original = await new Promise((resolve, reject) => {
            const existing = doc.querySelector('gramlot-inspector');
            if (existing) { resolve(existing); return; }
            const changes = new MutationObserver(() => {
                const component = doc.querySelector('gramlot-inspector');
                if (component) { clearTimeout(timeout); changes.disconnect(); resolve(component); }
            });
            const timeout = setTimeout(() => { changes.disconnect(); reject(new Error('Inspector unavailable. Please try again.')); }, 5000);
            changes.observe(doc.body, {childList:true, subtree:true});
        });
        const app = original.application;
        await app.inspector.open();
        if (current !== generation || app._disposed) return;
        // Preserve the example realm's typed Bags. Adopt before initialization,
        // since moving an initialized inspector invokes its disposal lifecycle.
        const external = new original.constructor();
        external.application = app;
        external.setAttribute('presentation', 'floating');
        app.inspector.dispose();
        document.body.append(external);
        element = external; application = app;
        try {
            await external.initialize();
            if (current !== generation || app._disposed) { external.dispose(); external.remove(); return; }
            external.opened = true;
        } catch (error) { dispose(); throw error; }
    };
    button.addEventListener('click', () => {
        if (opening) return;
        opening = toggle().catch(error => { button.title = error.message; })
            .finally(() => { opening = null; });
    });
    frame.addEventListener('load', watch);
    if (frame.contentDocument?.readyState === 'complete') watch();
    window.addEventListener('pagehide', () => { generation++; observer?.disconnect(); dispose(); });
}
