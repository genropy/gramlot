# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Behavioral contracts; fill skeletons with real runtime integration checks."""

from pathlib import Path
import subprocess


class TestRuntimeOwnership:
    def _check(self, scenario):
        folder = Path(__file__).parent
        result = subprocess.run(
            ["node", "--experimental-loader", str(folder / "lab_loader.mjs"),
             str(folder / "runtime_disposal.mjs"), scenario],
            capture_output=True, text=True, check=False,
        )
        assert result.returncode == 0, result.stderr

    def test_dispose_is_idempotent_and_preserves_peer(self):
        # wf:contract: Create two Applications; disposing one twice leaves the other reactive and independently usable.
        self._check("idempotent")

    def test_disposed_runtime_ignores_old_events_and_bag_updates(self):
        # wf:contract: After disposal, real events from retained old elements and mutations of retained data/source Bags cannot render or invoke owned callbacks; references remain readable.
        self._check("stale")

    def test_dispose_releases_owned_topics_and_pending_work(self):
        # wf:contract: Existing owned topic listeners and queued runtime work cannot deliver after disposal; unrelated Bag subscribers and peer topics still work.
        self._check("pending")
