# Main and develop

Owner decision, 2026-09-12. This supersedes the migration-era instruction to do
all development on main.

- main retains the consolidated existing framework line.
- develop accumulates reviewed work toward 0.2.0 beta and subsequent development.
- Experimental worktrees branch from develop after design review. Their results
  enter develop only when reviewed; creating develop does not start experiments.
- At an agreed release gate, integrate develop into main, verify the release
  revision, then create an explicitly authorized version tag. Continue the next
  cycle on develop. Merge strategy and exact tag spelling remain to be selected.
- Pushes and PRs verify; a merge into main is not itself publication. Framework,
  site and Rosetta releases remain independent. PyPI/npm/CDN require separate
  decisions from GitHub Release delivery.

Both branches run CI on push. No branch protection configuration or remote branch
creation is implied by this local policy file.

## Current release blocker

The inherited publish.yml still performs PyPI publishing and allows --clobber on
existing GitHub assets. It has been retained as part of the existing development
snapshot, not certified against the new GitHub-only immutable release policy.
Align it and resolve tag/version mapping before creating any release tag.

## 0.2.0 starting point

Design first, then an isolated experiment. Review dataRpc/serverCall and remote
server contracts before freezing component manifests. Preserve Python-first,
Gramlot-only applications and explicit server requirements; server-dependent
components cannot run in standalone pages. Development does not automatically
start the full historical backlog.
