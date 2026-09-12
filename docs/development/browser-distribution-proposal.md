# CI-built browser distribution

Status: accepted and implemented locally, 2026-09-11. Gramlot CI produces a
distributable runtime that consumers use without compiling it themselves. Release
publication remains subject to the normal release authorization and tag workflow.

## One artifact per framework build

Publish `gramlot-browser-<version>-<build-id>.zip`. The archive contains a directory
with the same name so extraction cannot mix two versions. A build ID identifies
immutable payload contents; a version label alone is insufficient for unreleased
alpha builds that currently reuse the same package version.

The runtime consists of a few browser-native ES modules with shared chunks.
"Bundle" means the complete distribution, not a requirement that every feature
be placed in a single eagerly loaded file. Existing authoring/runtime exports
remain available; applications do not need a new facade or a per-page bundle.

Illustrative layout (internal file names follow the actual build manifest):

```
gramlot-browser-<version>-<build-id>/
  manifest.json
  esm/
    gramlot-dom.js
    gramlot-builder.js
    genro-bag-js.js
    genro-tytx.js
    ...shared chunks and lazy entry points...
    ...component/inspector CSS and templates...
  LICENSE
  NOTICE
  THIRD-PARTY-NOTICES.txt
```

Preserve the complete relative asset tree. Inspector and component resources
must resolve correctly even when esbuild moves code into shared chunks. Consumers
copy the artifact intact; they do not need to discover or rearrange its files.
Runtime dependencies needed by these entries are included with their notices;
loading the artifact must not silently contact an external package CDN.

## Manifest

A small JSON manifest describes deployment, not application grammar. It must not
be confused with the component-description manifest used for Python grammar
integration. Proposed fields:

- `schemaVersion`: integer format revision, initially 1.
- `frameworkVersion`: the release/pre-release version.
- `buildId`: a digest of the canonical file inventory and payload, excluding the
  manifest itself to avoid self-referential hashing.
- `entryPoints`: existing public module specifiers mapped to relative entry paths
  (e.g. `gramlot-dom` and `gramlot-builder`). Public subpath exports must also be
  enumerated where supported; internal file paths are not public APIs by default.
- `files`: relative path, SHA-256, byte size and media type for every payload file
  except the manifest. Include lazy resources and license files.

No hostname, absolute filesystem path, server-framework requirement or consumer
recipe is part of the manifest. All relative paths resolve against its directory.
The release publishes an archive checksum separately. The build must be portable
and ideally reproducible; verify reproducibility rather than assuming it from a
content hash alone.

## Consumption

### Python applications

Include the exact prebuilt browser payload in the corresponding Python wheel.
The release builds the browser payload once, then packages the same bytes in the
zip and wheel. Python installation does not require Node or invoke a JS compiler.
The optional host adapter reads the local manifest, serves its versioned assets
and emits the required import map. Core remains independent of any server.

An application may configure an alternative runtime base URL, such as a CDN,
but the wheel's own runtime is the default to keep Python authoring and browser
behavior aligned. Mismatched versions require explicit compatibility handling.

### JavaScript/static applications

Extract the archive under a versioned static directory or reference its equivalent
CDN location. Configure the import map once in the shared page shell from manifest
entries plus the chosen base URL. Page recipes reuse that configuration. Existing
imports such as `gramlot-dom` and `gramlot-builder` continue to work.

For example, one site's shared shell could map `gramlot-dom` to
`/vendor/gramlot/<version>-<build-id>/esm/gramlot-dom.js`, with the other entry
points from the same distribution. Exact integration helpers should be designed
with the consumer migration, avoiding repeated configuration in every recipe.

A CDN serves the same artifact; it does not build a separate runtime. Browser
cache reuse across pages of one site is expected. Do not promise cross-site cache
sharing: browsers may partition caches by top-level site.

## Caching and delivery

Serve successful versioned artifact files with long-lived immutable cache headers.
Serve HTML/configuration with a policy that permits selecting updated versions.
Never assign immutable caching to mutable unversioned source URLs or missing-file
responses. Configure gzip/Brotli and appropriate JavaScript MIME types in hosting;
the archive by itself cannot set HTTP headers. HTTP/2 is a hosting optimization.

Keep old asset versions available through an appropriate deployment retention
window so already-open pages can still load their lazy resources after an update.
Each page loads one runtime version, preventing duplicate classes and registries.

## CI responsibility and acceptance

Gramlot CI builds and validates the browser artifact before publication. Consumer
CI only downloads/copies/packages that version; it may still compile its own
application code. Normal application code builds and single-file offline exports
are separate concerns.

The release gate must verify:

1. Existing public imports, shared class/registry identity and typed transport.
2. Reactive editing, focus-out editing, formulas and Source updates using the
   built/minified payload, not only source-module tests.
3. Lazy inspector/component resources, custom hosting base paths and MIME types.
4. A JS-only example and Python-authored example against the same payload.
5. No unresolved browser imports, missing files, or unexpected network origins.
6. Payload identity between wheel and zip, readable file permissions for a
   non-root static server, version/checksum consistency and license completeness.

Publish the zip as a release asset. An npm package/CDN channel can wrap the same
payload later; selecting its provider or changing current package publication is
not implicit in this format proposal. The existing unpublished-framework policy
continues to apply until a framework release is authorized.

## Migration

First build and verify the reusable artifact in Gramlot. Then adapt its optional
Python host and the two current consumers to read it. Replace consumer-specific
framework bundling with artifact consumption once parity is verified. Rosetta's
already deployed optimization and gramlot.org's in-progress optimization remain
transitional fixes; do not undo their performance benefit while this is designed.

## Local implementation checkpoint — 2026-09-11

The first implementation now builds the versioned ZIP and embeds its identical
payload in the Python wheel. CI changes prepare both artifacts and keep the
browser archive separate from the Python distributions uploaded to PyPI.
No framework release or CI run of these changes has been published yet.

The optional FastAPI adapter discovers the packaged manifest automatically,
shares its versioned URLs across pages and serves successful assets with gzip
and immutable caching. Missing manifests retain the development source runtime.

Local verification: 342 runtime tests reported passing; 20 combined adapter and
distribution tests passed. The archive and wheel contain 45 byte-identical files.
A real browser page on port 8053 verified Python dataSetter initialization, live
text editing and numeric focus-out updates driving a reactive formula. The
bundled startup loaded 11 JavaScript files, followed by its recipe.

The floating inspector initially failed with `Cannot set properties of null
(setting 'storeBag')`. Investigation identified an obsolete local Python compiler
environment producing ordinary Bag markers instead of SourceBag markers. A
semantic preparation check now rejects that loss of structural typing without
forbidding legitimate Data Bags. Resources were regenerated with supported dependencies.
A second defect cleared externally assigned stores during reconciliation; recipe
ownership is now tracked so externally attached Bags survive unrelated updates,
while recipe-managed stores still update and clear normally.

The corrected build is `8f3eac851e6680a0`. Real browser verification on ports
8053 (bundle) and 8054 (sources) confirmed populated Data and Source trees.
Editing a Data value through the bundled inspector updated the page; closing and
reopening retained the Source tree. Focused tests cover those store ownership
rules and the packaged inspector recipe through open/close/reopen. ZIP and wheel
still contain 45 byte-identical files. No publication was performed.

Rosetta's optimization is already public. The site optimization was verified
locally in its production Docker container on port 8043: container checks,
Python/JavaScript tutorial binding, gallery focus-out editing, recipe editing and
its embedded inspector passed. That site change has not been deployed.

Final coordinator check: 21 adapter/inspector tests passed. The four distribution
pytest cases were skipped because a concurrent source preparation had removed
the generated browser directory. The distribution's executable inspector check
was therefore rerun against the extracted final wheel and passed, and wheel/ZIP
parity was independently reverified (45 files). The Node DOM emulator logs
requestAnimationFrame warnings for palette callbacks; real browser opening,
editing and reopening passed. The stable preview at port 8053 now serves that
extracted wheel, isolated from concurrent asset preparation.
