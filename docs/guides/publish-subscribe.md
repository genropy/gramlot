# Publish and subscribe

`genro` coordinates messages within one mounted Gramlot application. The same
service handles JavaScript subscribers, declarative Source subscriptions, button
`publish` actions and widget `gnr-topic` notifications. Separate applications do
not receive each other's topics, even when mounted in the same document.

## Application API

```javascript
const unsubscribe = genro.subscribe('report_ready', payload => {
    console.log(payload.reportId);
});
genro.publish('report_ready', {reportId: 42});
unsubscribe(); // Safe to call more than once.
```

A topic is a non-empty, case-sensitive string. A publication carries one payload,
which may be an object, scalar or undefined. Delivery is synchronous; callback
errors propagate to the publisher and stop that delivery. Messages are not queued
or replayed. Reentrant publication is synchronous too. Each subscription is
independent, including subscriptions using the same callback. Unsubscribing a
callback before its turn prevents its delivery during the current publication.

The optional third argument accepts `signal` (an AbortSignal) and `sourceNode`:

```javascript
genro.subscribe('report_ready', function (payload) {
    this.SET('.report', payload);
}, {sourceNode: this});
```

Here `this` is a Source node, as in an action or controller. A Source-owned callback
receives that node as `this` and is released when that node or an ancestor is
removed, including replacement of an ancestor's child Bag. The node must belong
to the application. Without an owner or signal, the caller releases the handle;
application disposal releases every remaining subscription. Register long-lived
subscriptions once, not each time a reactive controller executes.

## Source-node topics

Inside a Source-scoped action or controller, `this.publish('ready', payload)`
qualifies the message with the node identity. `this.subscribe('ready', callback)`
listens to that same qualified topic and automatically owns the subscription.
Both methods use the same `genro` coordinator:

```javascript
// On a Source node with nodeId='report':
this.publish('ready', {reportId: 42});
// Equivalent application-level publication:
genro.publish('report_ready', {reportId: 42});
```

The prefix is `nodeId`, then the builder's `node_id`, then the runtime's stable
per-node target identity. Use an explicit unique identity for externally addressed
topics; the anonymous fallback lasts for the Source node's lifetime and is not a
persistent application identifier. Node subscriptions accept the same `signal`
option and return an unsubscribe handle. Descendant propagation is not implicit.

## Declarative controllers

Python authoring:

```python
pane.dataController("""
    if (pageName === 'history') {
        this.SET('.message', 'History is visible');
    }
""", subscribe_pages_showing=True)

pane.button('Show history',
            action="genro.publish('pages_switchPage', 'history');")
```

JavaScript authoring uses the existing controller `func` attribute:

```javascript
root.dataController({
    func: "this.SET('message', prefix + pageName);",
    prefix: '=messagePrefix',
    subscribe_pages_showing: true
});
```

`subscribe_<topic>=True` runs the controller's normal body. Bindings are resolved
at delivery time, and existing function/named-function controller forms retain
their normal `(sourceNode, bindings)` signature. Plain object payload fields are
available as named parameters, overriding matching declared parameters. The full
payload remains available as `payload` and `_kwargs`. Reserved runtime context
(`genro`, `sourceNode`, `_topic`, `_reason`, `_triggerpars`) is supplied by the
runtime. `_topic` is the published topic; `_reason` is `topic` and
`_triggerpars` contains `{trigger_reason: 'topic', topic, kw: payload}`.

A controller can subscribe to multiple topics. Its reactive Data triggers continue
to work independently. Declarative subscriptions are discovered from live Source,
so inserted declarations work immediately and removed declarations cannot receive
later publications. Existing string/function `subscribe_<topic>` handlers on
ordinary nodes remain supported; they use the action recipe calling convention.
A boolean subscription on an ordinary visual node does not define an action.

## Existing containers

For a tab or stack with `nodeId='pages'`, publish `pages_switchPage` with a page
name, index, `*next*` or `*prev*`. This invokes its existing `switchPage` behavior.
Existing `pages_showing` and `pages_hiding` messages carry `{pageName}`;
`pages_selected` currently carries `{page, selected, change}` for both hide and
show. This slice does not change those legacy-oriented widget semantics or their
notification timing. Use `pages_showing` for an action when a page becomes visible.

Topics themselves are exact strings, not implicit namespaces. The container's
`nodeId_` prefix is its convention. Cross-window transport, wildcards, asynchronous
event queues, retained messages and legacy `selfsubscribe_`/`formsubscribe_`
shortcuts are not part of this API.


## Executable teaching examples

Build the teaching preview with `scripts/prepare_assets.py` followed by
`docs/examples/teaching/build_preview.py --output build/teaching-preview`.

- [Publish and subscribe](../examples/teaching/14-publish-subscribe/recipe.py):
  one publication reaches two controllers; a second button demonstrates
  node-qualified `this.publish`.
- [Stack buttons and page topics](../examples/teaching/15-stack-topics/recipe.py):
  external stackButtons and publish commands share selection; a showing
  subscriber counts actual activations of History.

Both pages display their executed Python source and provide a Data/Source inspector.
The browser review verified both subscribers, node-qualified publication,
selection write-back, external controls and suppression of repeated showing
notifications for an already selected page. The current stack bridge remains an
alpha integration in TopicService; a shared component command protocol is future
work, alongside the container-role review.
