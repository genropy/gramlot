"""The public builder assembles the extracted declaration families unchanged."""

from genro_builders.builder import BuilderBase

from gramlot.builder import GramlotBuilder
from gramlot.grammar import (
    AdjacentWidgetDeclarations,
    DecorationDeclarations,
    FormDeclarations,
    InputDeclarations,
    LayoutDeclarations,
    NativeHtmlDeclarations,
)


DECLARATIONS = {
    "form": "*",
    "labledBox": "*",
    "copyButton": "",
    "palette": "*",
    "codeMirror": "",
    "details": "summary,div",
    "div": "*",
    "textBox": "",
    "textBoxArea": "",
    "filteringSelect": "",
    "comboBox": "",
    "passwordbox": "",
    "numberTextBox": "",
    "dateTextBox": "",
    "timeTextBox": "",
    "horizontalSlider": "",
    "verticalSlider": "",
    "checkbox": "",
    "formlet": "*",
    "panel": "*",
    "box": "*",
    "borderContainer": "*",
    "tabContainer": "*",
    "stackContainer": "*",
    "contentPane": "*",
    "stackButtons": "",
    "tab": "*",
    "colorpicker": "",
    "storeTree": "",
}


def test_plain_declaration_mixins_coexist_in_the_public_builder():
    mixins = (
        FormDeclarations,
        DecorationDeclarations,
        InputDeclarations,
        LayoutDeclarations,
        AdjacentWidgetDeclarations,
        NativeHtmlDeclarations,
    )
    assert all(not issubclass(mixin, BuilderBase) for mixin in mixins)
    assert all(mixin in GramlotBuilder.__mro__ for mixin in mixins)

    schema = GramlotBuilder._class_schema
    for tag, sub_tags in DECLARATIONS.items():
        declaration = schema.get_node(tag)
        assert declaration is not None, tag
        assert declaration.attr["sub_tags"] == sub_tags
        assert declaration.attr["accepts_var_keyword"] is True


def test_extracted_families_build_one_tree_without_narrowing_attributes():
    builder = GramlotBuilder()
    form = builder.root.form(datapath="record")
    formlet = form.formlet(columns=2, lbl_position="TL", box_gap="6px")
    field = formlet.textBox(
        value="^.amount",
        dtype="N",
        default=False,
        default_value="",
        default_custom=False,
        lbl="Amount",
    )
    explicit = formlet.labledBox(label="Choice", label_position="R")
    explicit.comboBox(value="=.choice", values="One,Two")
    formlet.colorpicker(value="^.color")
    builder.root.details().div().panel().storeTree(store="^records")

    assert field.node.attr["value"] == "^.amount"
    assert field.node.attr["dtype"] == "N"
    assert field.node.attr["default"] is False
    assert field.node.attr["default_value"] == ""
    assert field.node.attr["default_custom"] is False
    assert explicit.node.attr["label_position"] == "R"
    assert [node.node_tag for node in formlet.node.value.get_nodes()] == [
        "textBox", "labledBox", "colorpicker",
    ]
