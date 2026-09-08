# genro-dom-js

A JavaScript UI library where **the page is data, not code**.

You describe a page through a fluent, validated grammar; the result is not
DOM and not a component tree — it is a **Bag**: a plain, serializable,
hierarchical data structure (the *recipe*). A renderer walks the recipe and
builds real DOM. A reactive engine keeps it alive: every change in the
datastore becomes a surgical patch on exactly the DOM nodes bound to it —
no virtual DOM, no re-render, no diffing.

This documentation is both a **user guide** (how to build pages) and an
**architecture guide** (how the engine works inside), so it serves the team
maintaining the library as much as the developers using it.

```{note}
Status: **Alpha**. The core is implemented and tested; the API may still
change. genro-dom-js is the JavaScript twin of the Python
[genro-builders](https://github.com/softwellsrl/genro-builders) package —
the same recipe can be authored in JS or generated in Python and rendered
here unchanged.
```

## Where to start

- New to the library → read **Concepts**, then **Reactivity**.
- Maintaining the engine → **Architecture** is the map of the modules.
- Coming from another framework → the React / Vue guides translate the model.

```{toctree}
:maxdepth: 2
:caption: Guide

concepts
reactivity
grammar
components
```

```{toctree}
:maxdepth: 2
:caption: Internals

architecture
```

```{toctree}
:maxdepth: 1
:caption: Coming from…

for-react-developers
for-vue-developers
```
