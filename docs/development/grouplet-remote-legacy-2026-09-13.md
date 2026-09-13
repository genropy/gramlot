# Grouplets: remote-content dependencies in the current legacy

Source audit, 2026-09-13. This supplements
[the remote lifecycle audit](remote-source-legacy-audit-2026-09-13.md).
No claim of complete runtime compatibility and no grouplet implementation yet.
The owner prioritizes usable grouplets when extending the remote PoC.

## Actual pipeline

- `gnrpy/gnr/web/gnrwebstruct/base.py:841`: pane.grouplet(value, handler, **kwargs)
  emits a grouplet Source tag. groupletform is separate.
- `gnrjs/gnr_d11/js/genro_components.js:3155`: Grouplet.createContent resolves value
  into an absolute Data path. It creates a dedicated contentPane by default;
  remote content inside defaults to a div. Resource, handler, table, resource root
  and valuepath are passed as remote attributes.
- The remote handler is gr_loadGrouplet, with py_requires pointing to
  GroupletHandler. Source normalization routes that through remoteBuilder.
- `resources/common/gnrcomponents/grouplet/grouplet.py:14`: gr_loadGrouplet loads
  a plain resource or table resource, defaulting to class Grouplet and method
  grouplet_main. It mounts a wrapper with datapath=valuepath, grouplet_module
  and optional grouplet_code; grouplet_main builds its children.
- Without a resource, a public remote handler is invoked inside a contentPane.
- A topic resource is different: the loader builds a grid of expandboxes and
  recursively builds leaf grouplets locally inside the same server invocation.
  It is not automatically one remote request per child. Each child gets a Data
  subpath from topic and resource labels.

## Remote features actually used

Grouplet.createContent adds a resource-presence predicate to any caller _if.
It installs a waiting layer and appends an _onRemote callback that schedules
form.checkInvalidFields() through a named delayedCall. showOnFormLoaded adds
an extra reactive form-loaded dependency; it is not itself a false/true predicate.
The callback must refer to the form owning the newly mounted fields.

There are naming traps worth preserving as observations, not APIs to copy:
remote_async becomes ordinary async after prefix extraction; updateRemoteContent
consumes _async instead. The waiting layer nevertheless forces async here.
The handler-presence predicate tests remote_grouplet_handler whereas the wrapper
sets remote_handlername. Handler-only gating needs a runtime test before porting.

The dedicated wrapper explains why overwrite-all remote semantics were usually
acceptable here: the frame/menu/form toolbar lives outside that content boundary.
A Gramlot grouplet can own a dedicated fragment without changing every remote
container to destructive replacement of static siblings.

## Forms change the scope substantially

`genro_components.js:986` GroupletForm wraps a BoxForm and an inner grouplet.
It separates widget datapath, formDatapath (default .record), controller path and
store locationpath. The default store handler is memory and store type Item;
a database-backed grouplet is not the only intended use.

Dynamic location handling uses either metadata locationpath or a resource path
relative to the topic, sets the form store location, replaces onLoading/onSaving
hooks and calls form.load after remote construction. Other branches use
loadOnBuilt/startKey. There is autosave behavior. Replacing a grouplet before
pending save completion is therefore a data-lifecycle question, not just rendering.

Panel code at grouplet.py:229 selects a resource reactively and optionally hosts
GroupletForm. Menu metadata is assigned before selected_resource, enabling the
new fragment's load callback to see the corresponding metadata. Reordering these
updates can load or save into the previous resource's Data path.

Wizard code in grouplet.js calls form.save and immediately advances/publishes
completion; it does not await save in that function. This is an observed source
ordering risk, not evidence that all actual saves fail. Do not copy it into a
Promise-based implementation without a completion barrier.

Chunk and grid variants add record loading, editor dialogs, templates, drag/drop
and more lifecycle machinery. They are not prerequisites for a basic grouplet.

## Resource identity and isolation

The legacy mixes resources into the page object. mixinTableResource applies table
resources then package-specific customization. Within topic construction several
resources can be mixed sequentially; immediate grouplet_main calls do not prove
that deferred method references remain isolated. Distinct Data paths alone do
not isolate methods, explicit IDs, CSS, subscriptions, or server dispatch.

grouplet_module and grouplet_code record identity; the presence of those attrs
is not proof of complete request/method namespacing. Metadata discovery filters
menu items through tags, table permissions and is_enabled. Menu filtering alone
must not be substituted for authorization on the remote loader.

## Smallest useful Gramlot slice (proposal)

1. A registered Python resource definition and a separate instance identity.
   Resolve resources server-side from an allowlist; do not accept arbitrary file
   or import paths supplied by the browser. No Genropy dependency in the core.
2. Dedicated remote content boundary, explicit Data path and relative field
   bindings. Two simultaneous instances must keep Data and generated IDs separate.
3. Resource-presence guard, visible loading/error state, and a post-install hook.
   Hook semantics must distinguish Source insertion from nested asynchronous
   completion. Existing latest-response behavior remains explicit, not implied
   parity with legacy pending replay.
4. Switch resources A→B→A with per-instance draft preservation and deterministic
   removal of old providers/subscriptions. Remove an instance during a request.
5. Exercise two resources exporting the same method names: correct dispatch must
   follow resource/instance identity rather than whichever mixin ran last.
6. Only then add optional form ownership, store load/save hooks and save barriers.

This reprioritizes the backlog: resource/instance isolation and Data scope first;
remote guards, readiness and teardown next; form lifecycle afterward. Full topic
menus, wizard/grid/chunk composition, legacy cache, tbody and eager embedding can
remain explicit omissions. No new declaration spelling is approved by this plan.
