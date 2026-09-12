# Consolidation before develop

Local checkpoint, 2026-09-12. Not a release or a remote CI result.

Existing work is grouped into browser distribution/FastAPI, expanded tutorials,
and retained documentation/experiments on main. The component-grammar design and
RPC compatibility audit belong to develop. See [branch policy](branch-policy.md).

## Preservation

Before preparation, 60 modified/untracked files were copied with SHA-256 inventory
and a binary tracked diff to `/private/tmp/gramlot-before-branches-20260912`.
This temporary recovery copy is additional protection, not the durable history.
Existing generated test-results files remain on disk and are now ignored.
No consumer repository was modified; no push, tag or publication was performed.

The standalone-storage files are a browser storage capability probe, explicitly
not a Gramlot application or proof of a supported Gramlot persistence feature.
The shareable component-development Markdown includes example source listings;
the maintained handbook generator source remains component-guide-content.md.

## Verification of the consolidated inputs

- Python 3.14: 129 tests passed, no skips, with optional FastAPI dependencies.
- JavaScript runtime: 349 tests passed.
- Chrome: 19 tests passed for the new tutorial pairs and chapter navigation.
- Sphinx: warning-as-error build passed.
- Isolated source-distribution-to-wheel build passed; strict Twine checks passed.
- Fresh core wheel installation with public dependencies passed the installed
  distribution verifier and confirmed FastAPI is absent.
- Browser ZIP/wheel: 45 byte-identical files, build ID 84882997aa36910e.
- New tutorial recipes were reviewed for application DOM/event/fetch bypasses;
  none were found in the nine added Python/JS pairs.

The original sandboxed Python run had one local-server permission failure and
skipped optional/package checks. The final full run above supersedes it. Three
upstream deprecation warnings remain. Build output is kept under
build/consolidation-dist; old dist candidates have not been replaced.

The rebuilt artifact differs from the historical handoff's 8f3eac851e6680a0.
The historical parity claim described a previous candidate; only the newly
matched pair is verified here. A build ID does not establish reproducibility.

## Known unfinished work

Release policy alignment is still required before a tag (see branch-policy.md).
The tutorial validation ARIA discrepancy in open-work.md remains recorded debt;
visible-error/recovery browser tests do not establish that it is fixed. JSON/Bag
array-shape transport, broad legacy compatibility and full component contracts
are not claimed complete. Remote CI has not run on these local commits.
