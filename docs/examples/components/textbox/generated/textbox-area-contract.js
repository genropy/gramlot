// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Generated from its *.component.json + shared-attribute-sets.json (55324819396e36b7).
// Regenerate with: python docs/examples/components/textbox/generate.py
import '../../../../../js/dom/src/collections/inputs.js';
import {getCollection, registerCollection} from '../../../../../js/dom/src/collections.js';

export const guideTextBoxAreaContract = Object.freeze({
  "descriptor_format": {
    "name": "gramlot_component_example",
    "version": "0.1"
  },
  "identity": {
    "recipe_name": "guideTextBoxArea",
    "custom_tag": "gnr-textboxarea",
    "python_module": "generated/textbox_area_declaration.py",
    "collection": "guide-textbox-area-contract",
    "implementation_module": "../../../../../js/dom/src/collections/inputs.js",
    "implementation_collection": "inputs"
  },
  "summary": "An isolated textBoxArea contract linked to Gramlot's production gnr-textboxarea implementation.",
  "parameters": [
    {
      "name": "rows",
      "type": "integer|string|null",
      "default": null,
      "doc": "Native textarea row hint; a string also permits ^/= binding."
    },
    {
      "name": "cols",
      "type": "integer|string|null",
      "default": null,
      "doc": "Native textarea column hint; a string also permits ^/= binding."
    },
    {
      "name": "placeholder",
      "type": "string|null",
      "default": null,
      "doc": "Hint shown while the native textarea has no text."
    },
    {
      "name": "maxlength",
      "type": "integer|string|null",
      "default": null,
      "doc": "Native maximum length in UTF-16 code units; a string also permits ^/= binding."
    },
    {
      "name": "minlength",
      "type": "integer|string|null",
      "default": null,
      "doc": "Native minimum length; a string also permits ^/= binding."
    },
    {
      "name": "readonly",
      "type": "boolean|string|null",
      "default": null,
      "doc": "Make the native editor read-only; a string also permits ^/= binding."
    },
    {
      "name": "disabled",
      "type": "boolean|string|null",
      "default": null,
      "doc": "Disable editing; a string also permits ^/= binding."
    },
    {
      "name": "wrap",
      "type": "string|null",
      "default": null,
      "doc": "Native textarea wrap policy."
    },
    {
      "name": "autocomplete",
      "type": "string|null",
      "default": null,
      "doc": "Native textarea autocomplete hint."
    },
    {
      "name": "remainingHint",
      "type": "integer|string|null",
      "default": null,
      "doc": "Absolute integer or 0..100 percentage threshold for the optional live remaining count; requires maxlength."
    },
    {
      "name": "value",
      "type": "any",
      "default": null,
      "doc": "Literal value or an existing ^/= data path expression."
    },
    {
      "name": "dtype",
      "type": "string|null",
      "default": null,
      "doc": "Optional dtype metadata; the component contract does not restrict its vocabulary."
    },
    {
      "name": "default",
      "type": "any",
      "default": null,
      "doc": "Existing default policy value, preserved without narrowing its type."
    },
    {
      "name": "default_value",
      "type": "any",
      "default": null,
      "doc": "Existing explicit default value, including false and empty-string values."
    },
    {
      "name": "blankIsNull",
      "type": "boolean|string|null",
      "default": null,
      "doc": "Blank-value policy; a string also permits the existing ^/= binding syntax."
    },
    {
      "name": "updateOn",
      "type": "string|null",
      "default": null,
      "doc": "Existing input/change update policy."
    },
    {
      "name": "lbl",
      "type": "string|null",
      "default": null,
      "doc": "Widget label text or a ^/= data path expression."
    },
    {
      "name": "lbl_position",
      "type": "string|null",
      "default": null,
      "doc": "Label placement: L, R, TL, TC, TR, BL, BC or BR."
    }
  ],
  "shared_attributes": {
    "gramlot.binding": {
      "summary": "Values and widget policy shared by data-aware Gramlot fields.",
      "parameters": [
        {
          "name": "value",
          "type": "any",
          "default": null,
          "doc": "Literal value or an existing ^/= data path expression."
        },
        {
          "name": "dtype",
          "type": "string|null",
          "default": null,
          "doc": "Optional dtype metadata; the component contract does not restrict its vocabulary."
        },
        {
          "name": "default",
          "type": "any",
          "default": null,
          "doc": "Existing default policy value, preserved without narrowing its type."
        },
        {
          "name": "default_value",
          "type": "any",
          "default": null,
          "doc": "Existing explicit default value, including false and empty-string values."
        },
        {
          "name": "blankIsNull",
          "type": "boolean|string|null",
          "default": null,
          "doc": "Blank-value policy; a string also permits the existing ^/= binding syntax."
        },
        {
          "name": "updateOn",
          "type": "string|null",
          "default": null,
          "doc": "Existing input/change update policy."
        }
      ]
    },
    "gramlot.decoration": {
      "summary": "Shared widget label and box decoration.",
      "parameters": [
        {
          "name": "lbl",
          "type": "string|null",
          "default": null,
          "doc": "Widget label text or a ^/= data path expression."
        },
        {
          "name": "lbl_position",
          "type": "string|null",
          "default": null,
          "doc": "Label placement: L, R, TL, TC, TR, BL, BC or BR."
        }
      ],
      "open_patterns": [
        {
          "pattern": "lbl_*",
          "doc": "Additional label presentation attributes."
        },
        {
          "pattern": "box_*",
          "doc": "Additional inner-box presentation attributes."
        }
      ]
    },
    "gramlot.validation": {
      "summary": "Validation rules consumed by the shared form service.",
      "parameters": [],
      "open_patterns": [
        {
          "pattern": "validate_*",
          "doc": "A supported validation rule such as validate_notnull or validate_len."
        }
      ]
    }
  },
  "integration": {
    "binding": "Gramlot resolves literal, ^ and = values; native drafts stay local until the updateOn-selected event.",
    "events": [
      {
        "name": "input",
        "bubbles": true,
        "composed": true,
        "role": "live draft and optional input write-back"
      },
      {
        "name": "change",
        "bubbles": true,
        "composed": true,
        "role": "default focus-out write-back"
      }
    ],
    "form": "The shared form service owns validation, dirty state and persistence; the component exposes its native draft."
  },
  "lifecycle": {
    "connected": "Synchronize native textarea attributes, null state, remaining hint and label observer.",
    "disconnected": "Disconnect the shared WidgetLabel observer; internal listeners remain owned by the retained shadow tree."
  },
  "presentation": {
    "shadow_dom": true,
    "label_decoration": "gramlot.decoration",
    "theme_properties": [
      "--field-bg",
      "--field-border",
      "--field-focus-border",
      "--field-hint-color",
      "--field-hint-font-size",
      "--form-field-radius"
    ]
  },
  "open_attributes": true,
  "status": "Worked example only; this descriptor format is not a frozen public Gramlot API.",
  "builder_grammar": {
    "document_format": {
      "name": "builder_grammar",
      "version": "1.0"
    },
    "grammar": {
      "name": "gramlot_guidetextboxarea_guide",
      "version": null,
      "title": null,
      "description": null
    },
    "abstracts": {},
    "elements": {
      "guideTextBoxArea": {
        "doc": "An isolated textBoxArea contract linked to Gramlot's production gnr-textboxarea implementation.\n\nExplicit parameters come from the component descriptor and its\nreferenced shared attribute sets. ``**kwargs`` preserves the open\nGramlot attribute families documented by those sets.",
        "sub_tags": "",
        "parent_tags": null,
        "inherits_from": null,
        "ns": null,
        "attributes": null,
        "_meta": {
          "webcomponent": true,
          "render_tag": "gnr-textboxarea"
        }
      },
      "dataSetter": {
        "doc": null,
        "sub_tags": "",
        "parent_tags": null,
        "inherits_from": null,
        "ns": null,
        "attributes": null,
        "_meta": {
          "data_element": true
        }
      },
      "dataFormula": {
        "doc": null,
        "sub_tags": "",
        "parent_tags": null,
        "inherits_from": null,
        "ns": null,
        "attributes": null,
        "_meta": {
          "data_element": true
        }
      },
      "dataController": {
        "doc": null,
        "sub_tags": "",
        "parent_tags": null,
        "inherits_from": null,
        "ns": null,
        "attributes": null,
        "_meta": {
          "data_element": true
        }
      }
    }
  }
});

const identity = guideTextBoxAreaContract.identity;
const implementation = getCollection(identity.implementation_collection);
if (!implementation) {
    throw new Error(`missing implementation collection: ${identity.implementation_collection}`);
}
const exportedEntry = guideTextBoxAreaContract.builder_grammar.elements[identity.recipe_name];
if (!exportedEntry) {
    throw new Error(`missing exported recipe grammar: ${identity.recipe_name}`);
}
registerCollection(identity.collection, {
    grammar: {elements: {[identity.recipe_name]: exportedEntry}},
    defineComponents() { implementation.defineComponents(); },
});
