// Preserve navigation state between ordinary, directly addressable lesson pages.
const tree = document.querySelector('.lesson-tree');
const gallery = document.documentElement.dataset.app === 'gallery';
const key = gallery ? 'gramlot-gallery-navigation' : 'gramlot-example-navigation';
let state = {};
try { state = JSON.parse(sessionStorage.getItem(key) || '{}'); } catch {}
for (const branch of tree.querySelectorAll('details')) {
    const group = branch.dataset.navGroup;
    branch.open = branch.querySelector('[aria-current="page"]') ? true : (state[group] ?? !gallery);
    branch.addEventListener('toggle', () => {
        state[group] = branch.open;
        try { sessionStorage.setItem(key, JSON.stringify(state)); } catch {}
    });
}
const sidebar = document.querySelector('.sidebar');
try { sidebar.scrollTop = Number(sessionStorage.getItem(key + '-scroll')) || 0; } catch {}
sidebar.addEventListener('scroll', () => {
    try { sessionStorage.setItem(key + '-scroll', String(sidebar.scrollTop)); } catch {}
}, {passive:true});
