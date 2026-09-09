# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Audit deliverable contract; not evidence of runtime implementation."""

import json
from pathlib import Path

import pytest


class TestRuntimeContract:
    @pytest.mark.parametrize("scenario", [
        "bootstrap_readiness", "source_callback_context", "relative_paths",
        "get_set_put_fire", "method_and_dom_connections", "owned_topics",
        "recursive_deletion", "node_id_reuse", "pending_callback_cleanup",
        "page_instance_isolation", "typed_source_data_transport",
        "page_close_and_nested_frames", "mobile_handles_and_cancellation",
    ])
    def test_scenario_has_verifiable_contract(self, scenario):
        # wf:contract: every agreed scenario has legacy and current code evidence.
        # wf:contract: expected behavior, disposition and verification are explicit.
        # wf:contract: adapted or deferred behavior states its reason or dependency.
        root = Path(__file__).resolve().parents[1]
        contract = json.loads(
            (root / "docs/history/genro-pages/docs/architecture/runtime-contract.json").read_text()
        )
        entry = contract["scenarios"][scenario]
        assert entry["disposition"] in {"preserve", "adapt", "defer"}
        for field in ("expected", "verification"):
            assert isinstance(entry[field], str) and entry[field].strip()
        if entry["disposition"] != "preserve":
            assert entry["reason"].strip()
        for side in ("legacy", "current"):
            assert entry[side]
            for evidence in entry[side]:
                assert evidence["repository"] in contract["repositories"]
                for field in ("path", "symbol", "revision", "finding"):
                    assert isinstance(evidence[field], str) and evidence[field].strip()
