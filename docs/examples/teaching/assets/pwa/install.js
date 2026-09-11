// Chrome supplies the installation prompt when this app is eligible.
const button = document.querySelector('[data-install-app]');
const home = document.documentElement.dataset.app === 'gallery' ? '/gallery/' : '/';
let pending;
window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pending = event;
    button.hidden = false;
});
button.addEventListener('click', async () => {
    if (!pending) return;
    const prompt = pending;
    pending = null;
    button.hidden = true;
    await prompt.prompt();
    await prompt.userChoice;
});
window.addEventListener('appinstalled', () => {
    pending = null;
    button.hidden = true;
});
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(home + 'service-worker.js', {scope:home, updateViaCache:'none'})
        .catch(error => console.warn('App registration failed:', error));
}
