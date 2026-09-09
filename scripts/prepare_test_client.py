# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Create the source layout used by the inherited cross-language tests."""
from pathlib import Path


class TestClientPreparation:
    def run(self):
        root = Path(__file__).resolve().parents[1]
        client = root / 'build/test-client'
        modules = root / 'js/dom/node_modules'
        links = {
            'gramlot-dom': root / 'js/dom',
            'genro-bag-js': modules / 'genro-bag-js',
            'genro-tytx/js/src': modules / 'genro-tytx/js/src',
            'genro-tytx/js/node_modules': modules,
        }
        for name, source in links.items():
            if not source.is_dir():
                raise SystemExit(f'Missing {source}; run npm ci --ignore-scripts in js/dom')
            target = client / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.is_symlink():
                target.unlink()
            target.symlink_to(source, target_is_directory=True)
        print(client)


if __name__ == '__main__':
    TestClientPreparation().run()
