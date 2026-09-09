// Copyright 2025 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
// GENERATED from the Python builder grammar (BuilderBase.to_grammar).
// Do not edit by hand: regenerate from genro-builders when the grammar changes.

export const SVG_GRAMMAR = {
  "name": "svg",
  "abstracts": {
    "graphics": {
      "doc": "SVG graphics content: any graphical element.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "_meta": null
    },
    "containerElement": {
      "doc": "SVG container content: elements that can hold children.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "_meta": null
    }
  },
  "elements": {
    "html": {
      "doc": "Switch to the HTML dialect from this node down (BLD.2).\n\n        A sub-builder element: ``_meta['subbuilder']`` switches the active\n        dialect to HTML from this node down. The source tag ``html`` is\n        rendered as ``_meta['render_tag']`` (``<foreignObject>``) carrying\n        ``_meta['render_attributes']`` (the XHTML namespace), required for\n        the document to be XML well-formed at the SVG/HTML boundary.\n        ",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": {
        "subbuilder": "html",
        "render_tag": "foreignObject",
        "render_attributes": {
          "xmlns": "http://www.w3.org/1999/xhtml"
        }
      }
    },
    "svg": {
      "doc": "Root SVG container or nested SVG viewport.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "g": {
      "doc": "Group container for applying transforms and styles.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "defs": {
      "doc": "Container for referenced elements (gradients, patterns, etc.).",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "symbol": {
      "doc": "Reusable graphical template, rendered only when referenced by <use>.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "use": {
      "doc": "Reference and render a <symbol> or other element.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "rect": {
      "doc": "Rectangle.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "circle": {
      "doc": "Circle.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "ellipse": {
      "doc": "Ellipse.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "line": {
      "doc": "Line segment between two points.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "polyline": {
      "doc": "Open shape of connected line segments.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "polygon": {
      "doc": "Closed shape of connected line segments.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "path": {
      "doc": "Arbitrary shape defined by path commands (d attribute).",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "image": {
      "doc": "Embedded raster image.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "text": {
      "doc": "Text block. Contains text content and optional <tspan>/<textPath>.",
      "sub_tags": "tspan,textPath",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "tspan": {
      "doc": "Inline text span within <text>.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "textPath": {
      "doc": "Text rendered along a path shape.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "linearGradient": {
      "doc": "Linear gradient definition. Place inside <defs>.",
      "sub_tags": "stop",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "radialGradient": {
      "doc": "Radial gradient definition. Place inside <defs>.",
      "sub_tags": "stop",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "stop": {
      "doc": "Gradient stop (color and offset).",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "pattern": {
      "doc": "Tile pattern definition. Place inside <defs>.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "clipPath": {
      "doc": "Clipping path definition.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "mask": {
      "doc": "Alpha mask definition.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "marker": {
      "doc": "Marker symbol for line endpoints or vertices.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "filter": {
      "doc": "Filter effect container. Place inside <defs>.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feGaussianBlur": {
      "doc": "Gaussian blur filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feOffset": {
      "doc": "Offset filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feBlend": {
      "doc": "Blend filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feColorMatrix": {
      "doc": "Color matrix filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feComposite": {
      "doc": "Composite filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feFlood": {
      "doc": "Flood fill filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feMerge": {
      "doc": "Merge filter primitive (container for feMergeNode).",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feMergeNode": {
      "doc": "Single input for feMerge.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feDropShadow": {
      "doc": "Drop shadow filter primitive (SVG 2).",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feDiffuseLighting": {
      "doc": "Diffuse lighting filter primitive.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feSpecularLighting": {
      "doc": "Specular lighting filter primitive.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "fePointLight": {
      "doc": "Point light source for lighting filters.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feDistantLight": {
      "doc": "Distant light source for lighting filters.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feSpotLight": {
      "doc": "Spot light source for lighting filters.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feMorphology": {
      "doc": "Morphology filter primitive (erode/dilate).",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feTurbulence": {
      "doc": "Turbulence noise filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feDisplacementMap": {
      "doc": "Displacement map filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feConvolveMatrix": {
      "doc": "Convolution matrix filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feImage": {
      "doc": "Image filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "feTile": {
      "doc": "Tile filter primitive.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "animate": {
      "doc": "Animate an attribute over time.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "animateTransform": {
      "doc": "Animate a transform attribute.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "animateMotion": {
      "doc": "Animate motion along a path.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "set": {
      "doc": "Set an attribute to a value for a duration.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "title": {
      "doc": "Accessible title (tooltip in browsers).",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "desc": {
      "doc": "Accessible description.",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "metadata": {
      "doc": "Metadata container (RDF, Dublin Core, etc.).",
      "sub_tags": "",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "a": {
      "doc": "Hyperlink wrapper.",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "foreignObject": {
      "doc": "Container for non-SVG content (HTML, MathML).",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
    },
    "switch": {
      "doc": "Conditional processing (renders first matching child).",
      "sub_tags": "*",
      "parent_tags": null,
      "inherits_from": null,
      "ns": null,
      "attributes": null,
      "_meta": null
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
};
