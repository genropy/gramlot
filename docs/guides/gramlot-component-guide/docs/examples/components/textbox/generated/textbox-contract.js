// Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// Generated from its *.component.json + shared-attribute-sets.json (0e89c59d170e0ce6).
// Regenerate with: python docs/examples/components/textbox/generate.py
import '../../../../../js/dom/src/collections/inputs.js';
import {getCollection, registerCollection} from '../../../../../js/dom/src/collections.js';

export const guideTextBoxContract = Object.freeze({
  "descriptor_format": {
    "name": "gramlot_component_example",
    "version": "0.1"
  },
  "identity": {
    "recipe_name": "guideTextBox",
    "custom_tag": "gnr-textbox",
    "python_module": "generated/textbox_declaration.py",
    "collection": "guide-textbox-contract",
    "implementation_module": "../../../../../js/dom/src/collections/inputs.js",
    "implementation_collection": "inputs"
  },
  "summary": "An isolated textBox contract example linked to Gramlot's existing gnr-textbox implementation.",
  "parameters": [
    {
      "name": "placeholder",
      "type": "string|null",
      "default": null,
      "doc": "Hint shown while the field has no text."
    },
    {
      "name": "disabled",
      "type": "boolean|string|null",
      "default": null,
      "doc": "Disable editing; a string also permits the existing ^/= binding syntax."
    },
    {
      "name": "readonly",
      "type": "boolean|string|null",
      "default": null,
      "doc": "Make the inner input read-only; a string also permits ^/= binding."
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
    "binding": "Gramlot resolves literal, ^ and = recipe values before rendering; value write-back follows updateOn.",
    "events": [
      {
        "name": "input",
        "bubbles": true,
        "composed": true,
        "role": "normal value write-back"
      },
      {
        "name": "change",
        "bubbles": true,
        "composed": true,
        "role": "blur/change write-back"
      }
    ],
    "form": "The shared form service reads node identity, validation attributes and value changes; this component does not own persistence."
  },
  "lifecycle": {
    "connected": "Synchronize host attributes, connect null-state behavior and start label observation.",
    "disconnected": "Disconnect the WidgetLabel observer so detached fields retain no observer callback."
  },
  "presentation": {
    "shadow_dom": true,
    "label_decoration": "gramlot.decoration",
    "theme_properties": [
      "--field-bg",
      "--field-border",
      "--field-focus-border",
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
      "name": "gramlot_guidetextbox_guide",
      "version": null,
      "title": null,
      "description": null
    },
    "abstracts": {},
    "elements": {
      "guideTextBox": {
        "doc": "An isolated textBox contract example linked to Gramlot's existing gnr-textbox implementation.\n\nExplicit parameters come from the component descriptor and its\nreferenced shared attribute sets. ``**kwargs`` preserves the open\nGramlot attribute families documented by those sets.\n",
        "sub_tags": "",
        "parent_tags": null,
        "inherits_from": null,
        "ns": null,
        "attributes": null,
        "_meta": {
          "webcomponent": true,
          "render_tag": "gnr-textbox"
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

const identity = guideTextBoxContract.identity;
const implementation = getCollection(identity.implementation_collection);
if (!implementation) {
    throw new Error(`missing implementation collection: ${identity.implementation_collection}`);
}
const exportedEntry = guideTextBoxContract.builder_grammar.elements[identity.recipe_name];
if (!exportedEntry) {
    throw new Error(`missing exported recipe grammar: ${identity.recipe_name}`);
}
registerCollection(identity.collection, {
    grammar: {elements: {[identity.recipe_name]: exportedEntry}},
    defineComponents() { implementation.defineComponents(); },
});
