# Use Gramlot with JavaScript only

Build a browser interface with static files and JavaScript. No Python runtime is required.

## Availability

The reusable browser ZIP is currently a locally verified release candidate. It has not yet been published as a public download. These instructions describe that ZIP, not older source archives or the existing PyPI release. A public download link will be added when the browser artifact is released.

## 1. Get the browser distribution

Use gramlot-browser-<version>-<build-id>.zip and its matching .zip.sha256 checksum. The archive is built by Gramlot CI. You do not need Python, Node.js, npm or a build tool to use it.

## 2. Copy the complete payload

Extract the archive and copy the contents of its versioned directory into vendor/gramlot/ beside your index.html. Keep esm/, its chunks, inspector resources, manifest.json and all license files together. Copying only gramlot-dom.js is not sufficient.

## 3. Create index.html

Copy the complete example below. The input and paragraph share a live value. All page construction happens in the browser; there is no Python recipe or application server.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My first Gramlot page</title>
  <script type="importmap">
  {
    "imports": {
      "gramlot-dom": "./vendor/gramlot/esm/gramlot-dom.js",
      "gramlot-builder": "./vendor/gramlot/esm/gramlot-builder.js"
    }
  }
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import {Application} from 'gramlot-dom';
    import {GramlotBuilder} from 'gramlot-builder';

    class Page extends GramlotBuilder {
      main(root) {
        root.data('message', 'Hello from JavaScript');
        root.h1('My first Gramlot page');
        root.textBox({value: '^message', lbl: 'Message', live: true});
        root.p('^message');
      }
    }

    const app = new Application(
      document.getElementById('app'), new Page('main')
    );
    window.addEventListener('pagehide', event => {
      if (!event.persisted) app.dispose();
    });
  </script>
</body>
</html>
```

## 4. Serve the directory

Open index.html through an HTTP or HTTPS static server: your existing website, static hosting or your editor’s local web server. Do not open it by double-clicking a file:// URL. Serve JavaScript files with a JavaScript MIME type. If you enable a Content Security Policy, allow your module and import-map scripts according to your hosting policy.

## Use it across your site

Keep one runtime directory and put the import map in the shared HTML template used by your pages, before any module scripts. The server repeats that small configuration in each document; the browser reuses the same cached runtime URLs. For pages in nested directories, use site-root URLs such as /vendor/gramlot/esm/gramlot-dom.js, adjusted for your deployment base path.

## Update and cache safely

For production, deploy each release into a versioned directory, for example /vendor/gramlot/<version>-<build-id>/, and update the shared import map. Serve successful versioned assets with long-lived immutable caching and compression. Do not apply immutable caching to the mutable vendor/gramlot/ starter path. Keep the previous version available while existing pages may still need its lazy resources. Never mix files from different builds.

## Additional imports and the inspector

The two imports in this example are sufficient for this page. manifest.json lists additional public entry points, including gramlot-dom/date-parser, genro-bag-js and genro-tytx; map only those you use to paths from the same payload. Keep the inspector files even though they load only when opened. A CDN option is planned; no CDN URL is required or supplied by this guide.
