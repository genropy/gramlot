# Consolidate experimental dependencies

**Date:** 2026-09-07. **Status:** issues published after explicit owner authorization; consolidation and releases pending.

The owner requested consolidating dependency changes in their repositories and
consuming released versions instead of long-lived experimental worktrees.

## Adoption rule

Track missing behavior upstream, review and integrate it in the owning repository,
obtain an installable versioned release, then validate Pages against that artifact
before removing its local override. A main-branch commit or package version string
is not evidence of a published package. No automatic merge, push or release.

## Released JS follow-up — 2026-09-08

The owner completed Bag JS v0.4.0 publication after the audit below. Pages now
uses the published Git artifacts for Bag JS (`faf6bef3badb389d25ea4cb3b35c5369cb7ffd8a`)
and TYTX (`6b9bf3a486014d92812caa3b06674083e646c5cd`), installed in an isolated
client root with a commit-resolving npm lockfile. Registry publication on npm
is not required. All 92 Pages tests pass (24.64 s). Browser validation additionally required the
Pages import-map entry for Bag JS `#uuid`; after that change JSON, MessagePack
and focus-out binding work, and all six bootstrap tests pass.

See development-checkout.md for the module root, installation steps and the
remaining experimental DOM snapshot / Python Builders override. No original
worktree was changed. The Python Bag 0.22 / released-ASGI incompatibility remains.
Earlier statements below that Bag JS had not been released are historical.

## Alignment audit — 2026-09-08

PyPI confirms Bag 0.22.0, TYTX 0.15.0 and ASGI 0.44.0. GitHub confirms TYTX
`v0.15.0` at `6b9bf3a486014d92812caa3b06674083e646c5cd`; Bag JS has no published
tag/release. Canonical Bag JS 0.4.0 changes remain uncommitted (registered branch
types, node tags, attribute queries, resolver wire descriptions and typed storage).
No consolidation or publication of that work is performed from Pages.

The isolated published Bag 0.22.0/TYTX 0.15.0 pair passes 44 typed-branch and Bag
value/signing contracts. However, importing the SPA worker from the published
ASGI 0.44.0 wheel fails because it imports the removed genro_bag.datachange
module. The existing ASGI 0.43.1 has the same dependency. Active Pages retains
Bag 0.21.1 with a temporary <0.22 bound; ASGI 0.45 consolidation/release and
its import-path migration are prerequisites for lifting it.

TYTX Python is upgraded to 0.15.0, without its Python source override. The JS
checkout used by the existing browser/Node links matches the published v0.15.0
tag with no tracked source changes. All 92 Pages tests pass and 39 TYTX JS
registry tests pass. Distribution still uses explicit JS checkout links; this
is not a claim that all browser dependencies are packaged as released assets.

## Python Bag release adoption — 2026-09-07

The published genro-bag 0.21.1 wheel was installed in isolation with TYTX 0.14.0.
All 24 typed-branch regression cases pass outside the Bag checkout, without its
conftest. All 92 Pages tests also pass with that release replacing the experimental
Python Bag source path (27.45 s). The Pages virtual environment now uses 0.21.1;
its minimum dependency and development command are updated. The experimental
worktree is preserved. Bag JS and the other source overrides remain separate
release prerequisites. The 0.21.0 failures recorded below are historical evidence.

## Verified status

| Dependency | Available version | Missing work / handoff |
| --- | --- | --- |
| genro-tytx | Python 0.15.0 adopted; JS at published v0.15.0 | Public JS registered-type lookup; 92 Pages / 39 JS registry tests pass |
| genro-bag | 0.21.1 retained; PyPI 0.22.0 available | 0.22 removes DataChangeCollector still required by released ASGI; temporary <0.22 bound |
| genro-builders | PyPI 0.23.1; main declares 0.23.2 | SourceBag XS registration; GUI data alias; publish required fixes |
| genro-bag-js | Published Git v0.4.0 adopted | Installed at faf6bef; 92 Pages tests pass with released TYTX JS v0.15.0 |
| genro-dom-js | npm name returns 404; no GitHub release | Review experimental runtime changes in slices and release artifact |

Registry queries used PyPI package JSON, npm package endpoints, and GitHub
issue/main/release APIs. A missing npm name does not prove that no alternative
channel exists; the owning repository must specify its supported distribution.

An isolated install of genro-bag 0.21.0 and genro-builders 0.23.1, using TYTX 0.14.0,
fails 10 of the 11 candidate typed-branch/SourceBag cases. Eight failures belong
to Bag; two SourceBag envelope cases raise TypeError in the released Builders.
The MessagePack scalar-like text preservation case passes. A separate GUI data
alias repro raises TypeError. Tests were copied outside the experimental repos
to avoid their conftest source-path overrides. This is a targeted compatibility
probe, not a full test run of those released projects.

## Mailbox follow-up requiring clarification

The ASGI coordinator announced a future 0.44 SPA import move and a proposed
Pages/Stack split. The current host integration is temporarily bounded to
`genro-asgi>=0.43.1,<0.44`. Generic Bag/Builders/DOM consolidation remains valid;
page hosting and concrete WSX ownership must not leak into those libraries.

Before implementing the unknown-branch acceptance item in Bag #63 / Bag JS #4,
reconcile it with TYTX spec §2.5: the specification preserves the hierarchy for an
unregistered branch code, while the experimental candidate rejects that branch.
A valid row with an unknown type code differs from an invalid parent reference.
The unresolved-container policy remains a question for the owner; do not claim
the candidate rejection is already the agreed TYTX behavior. Published text below
is retained as an exact historical record, not a resolution of this question.

## Order

1. Consolidate Python/JS Bag structural contracts with shared fixtures.
2. Consolidate Builders SourceBag registration and GUI recipe alias; release all
   required grammar changes already on main, including those tracked by #38/#39.
3. Review DOM changes in separate slices: source hydration, widgets/containers,
   ownership/disposal, deferred mounting. Keep page RPC and identity in Pages.
4. Obtain versioned JS artifacts through the agreed distribution channel.
5. Validate clean artifacts with the Pages suite and browser; pin the tested
   dependency combination and remove experimental overrides only after success.

No dependency branches, patches or running demo were changed by this audit.
After the initial automatic-review rejection, the owner explicitly authorized
publication of these sanitized texts and destinations. All four issues and the
existing-issue comment were published and their bodies read back and verified.
No absolute workstation paths appear in the published texts.

## Published tracking

- [genro-bag #63 — mixed typed branches](https://github.com/genropy/genro-bag/issues/63)
- [genro-builders #41 — SourceBag XS and release](https://github.com/genropy/genro-builders/issues/41)
- [genro-builders #42 — opt-in GUI data alias](https://github.com/genropy/genro-builders/issues/42)
- [genro-dom-js #1 — runtime consolidation and release](https://github.com/genropy/genro-dom-js/issues/1)
- [genro-bag-js #4 — additional acceptance criteria](https://github.com/genropy/genro-bag-js/issues/4#issuecomment-5566071878)

---

## Published text — genro-bag: new issue

## Problem

Genro Pages currently needs a local patch in genro-bag to transport a mixed tree of registered Bag subclasses and ordinary data Bags. The owner requested replacing experimental dependencies with reviewed, released packages.

Verified against the actual PyPI genro-bag 0.21.0 with genro-tytx 0.14.0: nested ordinary Bag branches are reconstructed as the enclosing subclass. An unknown/unresolvable parent branch silently moves its children to the root.

```python
from genro_bag import Bag
from genro_tytx import register_class

@register_class
class TypedBranch(Bag):
    __tytx_suffix__ = 'TESTBRANCH'

source = TypedBranch()
source.set_item('data', Bag({'value': 42}))
for transport in ('json', 'msgpack'):
    result = TypedBranch.from_tytx(source.to_tytx(transport), transport)
    assert type(result['data']) is Bag  # fails on 0.21.0
```

## Required contract

- Preserve each registered branch type independently of the root type, including empty branches and nested ordinary Bag values.
- Preserve node tags, attributes, paths, order and values in JSON and MessagePack, with compact paths on/off and inside a typed envelope.
- Reject an unknown parent reference or an undecodable parent branch instead of relocating descendants to the root.
- MessagePack literal scalar-like strings such as `::RAW` and `::D` remain text. Interpret structural branch markers in the Bag decoder, without changing the TYTX MessagePack scalar contract.
- Preserve documented behavior for existing subclasses that still use X, or explicitly document any necessary migration.

## Existing work to review, not blindly merge

Local worktree: `genro-bag (local experimental worktree)`, branch `codex/sourcebag-tytx`, base `1b13b1e`.
Uncommitted `_parse.py`, `_serialize.py`, and `tests/test_typed_branches.py` contain an implementation candidate and nine contract cases. Against an isolated 0.21.0 installation: eight fail and the scalar-text case passes. No changes have been pushed.

Review and integrate in this repository, run the full suite and cross-language contracts, publish a version, and report the exact release. Pages will then test that release without this source override. No automatic merge/release is requested by this ticket.

---

## Published text — genro-builders: SourceBag issue

## Problem

Genro Pages needs to send SourceBag directly inside TYTX envelopes, preserving SourceBagNode identity and ordinary data Bag subtrees. This currently depends on uncommitted changes in a Builders worktree. We need an upstream reviewed release before removing that override.

Verified on PyPI genro-builders 0.23.1 + genro-bag 0.21.0 + genro-tytx 0.14.0:

```python
from genro_builders.builder import SourceBag
from genro_bag import Bag
from genro_tytx import to_tytx, from_tytx
source = SourceBag()
source.set_item('data', Bag({'value': 42}))
for transport in ('json', 'msgpack'):
    result = from_tytx(to_tytx({'source': source}, transport), transport)
```

JSON raises `TypeError: Type is not JSON serializable: SourceBag`; MessagePack raises `TypeError: Unknown type: SourceBag`.

## Required contract

- Register the concrete SourceBag class through the public TYTX class protocol, with its distinct XS code, rather than treating it as plain X.
- Decode a detached SourceBag with SourceBagNode nodes; runtime builder/handler references are not serialized and are attached by the consumer later.
- Preserve ordinary Bag data subtrees as Bag, not SourceBag, at every depth.
- Verify empty/nonempty source roots, nested source/data branches, JSON and MessagePack, including typed envelopes.
- Declare the released Bag/TYTX versions required by the final implementation.

## Existing candidate and publication gap

Local worktree `genro-builders (local experimental worktree)`, branch `codex/sourcebag-tytx`, base `c6e4684`, contains uncommitted registration/suffix changes in `builder/__init__.py`, `builder/source_bag.py`, plus `tests/test_source_tytx.py` (two transport cases). These are review material, not an approved merge.

At 2026-09-07, GitHub main is version 0.23.2 (`c6e4684`), while PyPI JSON reports 0.23.1. Pages currently declares >=0.23.2 and uses the local checkout. Resolve the publication gap as part of the release handoff; a commit/version string alone is not sufficient evidence of an installable release. Existing #38 and #39 are closed and should not be duplicated.

Review/integrate in Builders, coordinate mixed-branch support with genro-bag, publish through the repository's normal process, and report the exact version. Pages will validate the published artifacts and remove its local override afterward.

---

## Published text — genro-builders: GUI data alias issue

## Problem

The Genro Pages GUI recipes intentionally retain legacy `pane.data(path, value)` spelling. Generic Builders already uses `SourceBagNode.data` as a datastore property, so a plain alias at the schema level does not suffice. Pages currently relies on an uncommitted opt-in adaptation in Builders.

Verified with released genro-builders 0.23.1:

```python
from genro_builders.contrib.html.html_builder import HtmlBuilder
class GuiBuilder(HtmlBuilder):
    data_recipe_alias = True  # local prototype option; not a released API
builder = GuiBuilder('main')
pane = builder.source.div()
pane.data('.value', 'hello')
# TypeError: Bag.__call__() takes from 1 to 2 positional arguments but 3 were given
```

## Desired behavior

- An explicitly opted-in GUI dialect can use `builder.source.data(...)` and `pane.data(...)` to emit the existing dataSetter recipe, including a Bag value and relative paths.
- Generic HtmlBuilder retains its native data element and `pane.data is builder.data` property behavior.
- Internal relative-data access still uses the real datastore, not the recipe callable.
- The project owner requested the legacy recipe spelling. The opt-in mechanism/name is implementation review material; select an appropriate public extension point in this repository.

## Existing candidate

`genro-builders (local experimental worktree)`, branch `codex/sourcebag-tytx`, uncommitted `builder/source_bag.py` changes. The GUI-only opt-in is used by Pages `WidgetTestBuilder`; Pages `tests/test_data_recipe.py` covers both root/nested calls, Bag initialization, relative data methods, and unchanged generic-node access.

Please review and integrate this separately from SourceBag serialization, test the generic and GUI dialects, and include it in a published version. Pages should then remove its experimental Builders source override. Do not make all generic builders change their data semantics.

---

## Published text — genro-dom-js: consolidation issue

## Goal

Consolidate the generic DOM work used by Genro Pages into reviewed upstream changes and a versioned release, so Pages can stop depending on `codex/python-js-alignment`.

Local worktree `genro-dom-js (local experimental worktree)`, clean at `718acbe`. The six experimental commits are `e5540e0`, `358ca59`, `3ef702a`, `4ccf4f2`, `f743e6c`, `718acbe`. They have not been pushed. This is a substantial review, not a request to merge the branch wholesale.

## Review slices and contracts

1. TYTX SourceBag import (XS) and source hydration: preserve node classes, tags, nested ordinary data Bags, reactive bindings and node runtime ownership. Coordinate with the released Bag JS codec.
2. Generic controls/containers used by the gallery: input styles and label attributes, filteringSelect/comboBox, border splitters, tab/stack selection and stackButtons, palette, actions/clipboard. Preserve independent runtime writebacks and existing JS-only construction.
3. Lifecycle: Application disposal releases owned listeners/topics/queued work; stale events cannot mutate/render a disposed instance; disposal is idempotent and does not affect peer applications.
4. Deferred mounting: `new Application(host)` can own services/data before mounting a real builder once; existing immediate construction remains supported; failed mounting disposes partially created runtime and surfaces the failure.
5. Keep page identity, RPC/WebSocket, server registration, inspector/playground integration in genro-pages. DOM must remain usable independently of Python, ASGI and networking.

## Evidence available

The experimental DOM suite previously passed 131 tests. Pages integration against this branch passed all 92 tests after checkout relocation on 2026-09-07, including registered startup, disposal, typed source and gallery. Those results verify the experimental combination, not an upstream release.

Review the large `3ef702a` checkpoint in particular rather than inferring feature completeness from its message. Contract tests in the worktree cover imported source, choices, layout containers, palette, stack, widgets, actions, clipboard and deferred mount; Pages supplies integration regressions.

## Release/consumer handoff

At 2026-09-07 GitHub has no release or PR for this repository, and npm returns 404 for the declared package name `genro-dom-js`. Choose and document the supported distribution channel in the repository (npm package or another immutable versioned artifact), including its released Bag JS/TYTX dependencies. The endpoint choice remains a maintainer/owner decision.

Acceptance: reviewed integration branch, documented public API/migration notes, passing standalone and Pages integration tests, installable immutable release with version and integrity information, then validation from clean artifacts in Pages without the worktree. Do not silently publish, merge or carry page-specific machinery into the library as part of this issue.

---

## Published text — genro-bag-js: comment on existing #4

Genro Pages follow-up, 2026-09-07: this existing alignment issue also blocks replacing Pages' experimental dependency with a consolidated release.

The local `codex/python-js-alignment` worktree at `genro-bag-js (local experimental worktree)` includes commit `005b01d` plus uncommitted `src/bag.js` and `tests/typed-branches.test.js`. Nothing has been pushed. Review these candidates here rather than retaining a permanent Pages-side fork.

Additional required acceptance cases:

- Match the Python TYTX row tag and attribute representation (candidate commit `005b01d` and `tests/tytx-contract.test.js`).
- Concrete registered Bag subclasses survive at the root and at each branch; mixed X data and specialized branches retain distinct constructors, attributes, tags, paths and values in JSON/MessagePack, compact and expanded paths, and inside typed envelopes.
- Missing/undecodable parent branches and unknown compact parent references cannot silently reparent children at the root.
- MessagePack scalar-like literal strings remain text; branch-marker interpretation belongs to the Bag structural decoder, not a global TYTX string rescan.
- Re-run the full existing parity suite; these extra cases do not close the broader trigger-parity requirements of this issue.

The additional nine candidate cases are in `tests/typed-branches.test.js`; use matching fixtures with Python genro-bag and downstream SourceBag.

GitHub main is still `8aa16de` (package version 0.3.0), and npm returns 404 for the declared name `genro-bag-js`. Please provide a reviewed, versioned, installable artifact and an explicit distribution channel before Pages removes its local override. A package.json version alone is not a published release. No automatic merge or release is requested.
