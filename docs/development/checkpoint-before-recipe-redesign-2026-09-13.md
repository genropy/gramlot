# Checkpoint before the next architectural change

Owner request, 2026-09-13: commit and push all current repository work before
undertaking a substantial change. This checkpoint preserves the current work;
it does not approve or implement that next change and is not a release.

The snapshot includes current IDE/filesystem tools, chart and grid editing,
checkBoxText, stores and validation work, Django page consolidation, the small
Python/JavaScript recipe experiment, examples, tests and design/audit records.
It also retains the earlier local Bakerydemo preservation commit in the branch.

## Verification at the checkpoint

- JavaScript suite: 409 passed, no failures.
- Python suite: 188 passed, 2 skipped, 4 failed in the sandbox.
- The manual HTTP-server test passed when rerun with local listening permitted;
  its initial failure was environmental.
- Three failures remain, all caused by `ValueError: Missing gallery cases for
  remoteSelect` during gallery construction:
  `test_static_grid_python_javascript_data_parity`,
  `test_preview_build_uses_the_executed_sources`, and
  `test_gallery_covers_the_component_catalogue_and_mounts_cases`.
- The new recipe composition contract passed. Browser behavior and Source
  inspection were verified in the preceding experiment; the full browser suite
  was not rerun for this checkpoint.
- Staged whitespace checks passed after removing trailing whitespace in chart.js.

Keep the unresolved gallery coverage visible when reviewing the next change;
this checkpoint is not evidence of a fully passing Python suite. Ignored build
outputs, environments and temporary files remain outside version control.
