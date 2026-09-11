# CSS declarations

`css` and `styleSheet` declare stylesheet resources in the Source tree. Python and
JavaScript use the same declarations and browser renderer.

## One rule

Python:

```python
root.css('.result', 'background: #f4f4f4; padding: 1rem')
```

JavaScript:

```javascript
root.css('.result', 'background: #f4f4f4; padding: 1rem');
```

Both also accept a complete rule as the first argument:
`root.css('.result { padding: 1rem; }')`.

## A complete stylesheet in the page module

Python:

```python
root.styleSheet('''
    .result { background: #f4f4f4; padding: 1rem; }
    .result h2 { margin-top: 0; }
''', cssTitle='results')
```

JavaScript:

```javascript
root.styleSheet(`
    .result { background: #f4f4f4; padding: 1rem; }
    .result h2 { margin-top: 0; }
`, {cssTitle: 'results'});
```

Python uses quoted strings, including triple-quoted multiline strings. JavaScript
uses strings or backtick template literals. `cssTitle` is optional descriptive
metadata (`data-css-title`); it is not a unique identifier or an alternate-sheet
selection mechanism.

## External and reactive resources

```python
root.styleSheet(href='/assets/page.css')
root.styleSheet(cssText='^theme.css')
```

```javascript
root.styleSheet({href: '/assets/page.css'});
root.styleSheet({cssText: '^theme.css'});
```

JavaScript also accepts an object for rules:
`root.css({rule: '.result', styleRule: '^theme.resultRule'})`.
`cssText`, `rule`, `styleRule`, and `href` support ordinary Bag bindings. A truthy
`href` selects an external `<link rel="stylesheet">`; otherwise `styleSheet`
creates an inline `<style>`. External URLs remain browser-loaded resources;
this declaration does not embed them for offline export.

## Ownership and scope

Resources update with their Source nodes and are removed with their owning
branch or application. CSS is emitted as text, without display formatting or
HTML interpretation. Resource nodes accept no children.

Ownership is not selector scoping: rules apply to the containing document, so
use appropriate classes to limit their targets. Ordinary selectors cannot reach
inside a component's shadow root; use its supported CSS custom properties or
parts. Multiple declarations remain separate, with normal CSS cascade ordering.
