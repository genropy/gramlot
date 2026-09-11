// Live development apps: never cache recipes or mutable runtime assets.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return;
    event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gramlot · Server unavailable</title>
<style>body{margin:0;background:#f5f7fb;color:#172642;font:16px/1.6 system-ui}main{max-width:520px;margin:15vh auto;padding:28px}a{color:#1643c5}</style>
<main><h1>Waiting for the Gramlot server</h1><p>Start the preview server at the same address, then reload this app.</p>
<p><a href="">Try again</a></p></main></html>`,
        {status:503, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'}})));
});
