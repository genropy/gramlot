"""Validation authoring sugar preserves the existing validate_* contract."""

from copy import deepcopy

import pytest

from gramlot.builder import GramlotBuilder


def test_validate_normalizes_reusable_rules_without_mutating_them():
    builder = GramlotBuilder("example")
    rules = {
        "notnull": True,
        "email": "^validation.enabled",
        "email_warning": "=messages.email",
        "email_if": "^validation.checkEmail",
        "onAccept": "this.SET('.accepted', true);",
        "onReject": "this.SET('.rejected', true);",
        "timeout": 250,
    }
    original = deepcopy(rules)

    first = builder.root.textBox(value="^.primary", validate_email_warning="Inline")
    returned = first.validate(**rules)
    second = builder.root.textBox(value="^.secondary")
    second.validate(**rules)

    assert returned is first
    assert rules == original
    assert first.node.value is None
    for name, value in rules.items():
        assert first.node.attr[f"validate_{name}"] == value
        assert second.node.attr[f"validate_{name}"] == value
    assert first.node.attr["validate_email_warning"] == "=messages.email"


def test_validate_uses_normal_assignment_order_and_none_removes_an_attribute():
    builder = GramlotBuilder()
    field = builder.root.textBox(
        value="^.email",
        validate_email=True,
        validate_email_warning="Inline",
    )

    field.validate(email_warning="First call", notnull=True)
    field.validate(email_warning="Second call", email=None)
    assert field.node.attr["validate_email_warning"] == "Second call"
    assert field.node.attr["validate_notnull"] is True
    assert "validate_email" not in field.node.attr

    field.set_attr(validate_email_warning="Direct assignment")
    assert field.node.attr["validate_email_warning"] == "Direct assignment"


def test_prefixed_dicts_remain_direct_attributes_and_invalid_calls_are_atomic():
    builder = GramlotBuilder()
    prefixed = {
        "validate_notnull": True,
        "validate_len": "3:8",
        "validate_len_error": "Use 3 to 8 characters.",
    }
    field = builder.root.textBox(value="^.code", **prefixed)
    before = dict(field.node.attr)

    with pytest.raises(TypeError, match="unprefixed"):
        field.validate(validate_email=True)
    assert field.node.attr == before
    assert prefixed == {
        "validate_notnull": True,
        "validate_len": "3:8",
        "validate_len_error": "Use 3 to 8 characters.",
    }

    with pytest.raises(TypeError, match="declared elements"):
        builder.root.validate(notnull=True)
