# GramlotIde

`gramlotIde` is a reusable Web Component in the `labEditors` collection. Its
implementation composes FileSystemTree and CodeMirror. Python applications
declare it without application-level DOM, event wiring or HTTP code.

```python
from gramlot.page import WebPage

class Page(WebPage):
    def main(self, root):
        root.gramlotIde(content='print("Hello")', filename='scratch.py')
```

This standalone mode does not request a server. Editing lives in the Data Bag;
filesystem Save is unavailable. To connect an existing directory:

```python
from pathlib import Path
from gramlot.filesystem import FileSystemPageMixin
from gramlot.page import WebPage

class Page(FileSystemPageMixin, WebPage):
    filesystem_roots = {'project': Path('/srv/my-project')}
    filesystem_writable_roots = ('project',)

    def main(self, root):
        root.gramlotIde(root='project', initialpath='main.py',
                        writable=True, datapath='ide', height='550px')
```

Declare only workspaces the application intends to expose. The provider and UI
both gate Save. Omitting filesystem_writable_roots leaves the server read-only;
omitting writable leaves the UI without Save even on a writable provider.
Editing in the browser remains possible in either case.

## Interaction and state

Double-click a file, or press Enter on its tree row, to open it. Tabs identify
documents by workspace-relative path. Opening an existing tab preserves its
edits. A dot marks unsaved changes. Closing a dirty document requires an explicit
discard or cancellation; closing a document with an operation pending is refused.
The file-tree splitter supports dragging and left/right arrows.

The component's datapath contains `workspace`, `active` and `documents`.
Each document is a Bag with path, content, saved, language, revision and writable.
Document keys encode UTF-8 paths, avoiding dots being interpreted as Bag paths.
Python supplies an isolated default datapath; explicit scopes must not be shared
by different IDE instances. Replacing the component leaves document Data intact
and cancels its owned RPC requests. A late response cannot reinstall a document.
Save captures the submitted text: further typing during the request remains dirty.
Data is memory-resident, not localStorage; reloading a page can lose unsaved work.
The component installs the browser's ordinary unsaved-changes navigation guard.

## Provider contract

Defaults can be replaced by treemethod, readmethod and savemethod:

| Endpoint | Request | Result |
| --- | --- | --- |
| directory_tree | root, optional path | Bag with lazy RPC directory descriptors |
| document_read | root, path | content, language, revision, writable |
| document_save | root, path, content, revision | new revision |

The supplied provider reads existing UTF-8 text files up to 2 MiB, rejects NUL
bytes, traversal and symbolic links, and does not execute document content.
Save compares a SHA-256 content revision before atomic replacement and serializes
writes within the server process. A conflict or other error retains local edits.
This is not a multi-process transaction or a lock against external editors;
production providers may implement stronger version and access policies.
Use application-controlled roots, as described in the directory provider guide.

## Current limits and verification

This is the first IDE component, not a complete legacy gnride port. It edits
existing files; create/delete/rename, execution, debugging and preview are absent.
HTML opens as source with XML highlighting; visual HTML editing needs a separate
rich-text component and is not implemented. Markdown and unknown text use plain
text editing. CodeMirror uses the existing pinned external modules, falling back
to a textarea if those modules cannot load.

The minimal parameter reference is generated from the component catalogue.
`/page/gramlot-ide/` uses an isolated temporary workspace with writable sample
files, never the framework repository itself. Browser verification covers open,
edit, Save, switching tabs, retained edits and dirty-close cancellation. Model
tests cover edits during Save, failures, late responses and standalone Data;
provider tests cover permission checks, revisions and traversal.

## Shared tabs and local development view

The IDE uses the framework tabContainer/tab components. Document panes declare
closable; the shared tab header shows its small close control on hover or focus.
Ordinary tabs without closable have no close control. Tab captions use the file
name; their tooltip contains the full relative path. FileSystemTree uses small
monochrome SVG folder/file glyphs with extension-specific markings.

The autonomous application in `tools/gramlot-ide`, mounted at `/ide/index/`,
has no example navigation or demonstration frame. The old
`/page/gramlot-ide-local/` address redirects there. A borderContainer header
describes the tool and provides a wide folder-path textBox. The initial path
and workspace are empty. Committing a path loads its workspace through @source;
clearing it empties the center. Each folder has a separate Data namespace.
This local-only application accepts absolute paths (including `~` expansion)
and permits revision-checked Save after the user unlocks a document. Generic filesystem pages retain named-root
allowlists. The temporary writable demo
remains separate. `--ide-tree-width` adjusts the initial file-tree width.

Complex components may construct Gramlot Source with the JavaScript builder.
The current IDE reuses framework widgets but still assembles its internal shell
in the Web Component; a full Source-based composition API is not implemented by
this styling change.

Each document pane contains a borderContainer with its own top toolbar. Files
start read-only; the crossed-pencil button unlocks editing for that document
and reveals Save and Revert. Relocking preserves pending edits. Revert restores
the last successfully saved text (it does not reload external disk changes).
Editor instances and lock state survive tab changes. Save remains subject to
server permissions and revision checks; generic read-only providers stay read-only.

### HTML views (initial integration)

HTML documents have Code, Preview and Rich text toolbar buttons selecting panes
in a shared stackContainer. The preview uses a sandboxed iframe without script,
form or same-origin permissions. Relative local assets are not resolved yet.
The rich-text pane loads ProseMirror on demand from pinned esm.sh modules and
shares the document content, editing lock, Save and Revert with CodeMirror.
Rich text displays the complete page in an isolated iframe, including embedded
CSS. Clicking a supported text region mounts ProseMirror directly in that region
when editing is unlocked. There is no block selector. Bold, Italic, Undo and Redo
act on the active region; Enter inserts a line break within it. Relocking makes
the active editor read-only. Only the selected region's inner content is updated;
its attributes, surrounding layout, head, comments and scripts are retained in
the inert parsed document. Page scripts and navigation do not run in this view;
external resources are blocked. Rich text edits content, not the page layout.
Unsupported inline structures are not flattened; supported nested text regions
can be edited separately. DOM serialization may normalize HTML formatting.
Undo history is local to the active region; Revert restores the whole document.
Verified with an isolated browser and a synthetic HTML page: full document display,
inline editing, paragraph switch, serialization and read-only lock.
Network access is
required for editor dependencies; load errors are displayed in the pane.

Reference: https://prosemirror.net/docs/guide/ (schema-based editing).

## Host-rendered preview

`previewmethod` optionally names an RPC endpoint accepting `root`, `path` and
`content` (the current unsaved editor text) and returning `{html: string}`.
Clicking Preview requests that rendering; without a provider, the existing
immediate HTML preview remains unchanged. Rendering does not Save the document.
Stale responses after edits, disposal or a newer preview request are ignored.
The result stays in the existing sandboxed iframe; scripts and forms remain
inactive. Relative resources can be resolved by a provider-supplied base URL.

Inline editing activates on pointer press, before text selection. The formatting
bar reports locked/ready/editing state and enables applicable commands: Bold,
Italic, Underline, Strikethrough, Code, Clear formatting, Undo and Redo. Mark
buttons reflect the current selection. HTML with an implicit head (no explicit
html wrapper) retains its title, metadata and CSS when serialized after editing.
Verified using an in-memory copy of stato_attuale.html: heading edit, selection,
underline, undo and stylesheet preservation; no source file was written.

WebKit keyboard regression: disabling iframe scripting also disables the editing
handlers installed by the parent. The rich iframe therefore allows scripting at
the sandbox level, while sanitized srcdoc and CSP `script-src 'none'` block the
HTML document's scripts. Script nodes and event attributes are removed only from
the displayed copy. Actual keyboard input after a click, followed by Revert, is
verified on the autonomous FastAPI IDE in WebKit as well as Chromium.
