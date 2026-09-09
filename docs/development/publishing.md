# Publishing Gramlot

## Continuous integration

`.github/workflows/ci.yml` tests Python 3.11, 3.12 and 3.14, the browser runtime,
Sphinx documentation and package construction. It installs the built wheel in
an isolated environment without optional server dependencies. Source archives
are included: the wheel is rebuilt from the sdist before validation.

## Read the Docs

Import the public repository https://github.com/genropy/gramlot into Read the
Docs Community with the project slug `gramlot`. The root `.readthedocs.yaml`
selects Python 3.12, docs/requirements.txt and docs/source/conf.py. It does not
install the Gramlot runtime and fails the build on Sphinx warnings. Enable the
GitHub integration/webhook so pushes to main rebuild the latest documentation.
The public documentation includes only docs/source, not development/context notes.

## PyPI Trusted Publishing

Configure a pending GitHub publisher in the owner's PyPI account for the first
upload (or a publisher in project settings once the project exists):

- PyPI project: `gramlot`
- GitHub owner: `genropy`
- Repository: `gramlot`
- Workflow filename: `publish.yml`
- GitHub environment: `release`

No long-lived PyPI token is needed. The release workflow requests a short-lived
OIDC credential in its publish job. Both the trusted publisher and the GitHub
environment must exist before publishing a release.

Use the same release convention as Genro Bag: push a version tag matching
pyproject.toml, for example:

```sh
git tag v0.1.0a1
git push origin v0.1.0a1
```

The tag triggers publish.yml. It runs the full CI, checks the tag against the
package version, then uploads its verified distributions through Trusted
Publishing using the `release` environment. Only after a successful PyPI upload
does it create the GitHub release and attach the files. An existing draft is
published at that point. Alpha/beta/RC tags produce GitHub prereleases.
Manual workflow dispatch from main runs verification without publishing; select
a version tag to publish manually. Never reuse an uploaded version filename.

Confirm the Actions run, PyPI release files and installation from PyPI before
reporting a release as published. A successful Git push alone does not activate
a Read the Docs project or register a PyPI trusted publisher.
