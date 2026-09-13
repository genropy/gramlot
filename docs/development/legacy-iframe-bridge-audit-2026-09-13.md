# Legacy iframe communication and the minimum Gramlot bridge

Status: source audit and proposed contract, not an implemented bridge.

## Scope and runtime identity

The owner requires Gramlot pages opened by the normal Genropy menu to cooperate
with the legacy main page while retaining their own runtime. The two `genro`
objects are not interchangeable. The current Gramlot recipe executor injects
`genro: application` into controller scope (`js/dom/src/services/recipe-runtime.js:16`).
The shared browser startup does not currently assign that Application to
`window.genro`. Controller scope and a global visible to the parent are distinct.

Legacy sources below are relative to `/Users/gporcari/Sviluppo/Genropy/genropy`.

## Verified legacy mechanisms

| Concern | Actual mechanism | Source |
| --- | --- | --- |
| Parent identity | Child obtains `window.parent.genro`, main window, root/parent page IDs and `window.frameElement.sourceNode` | `gnrjs/gnr_d11/js/genro.js:616` |
| Ready handshake | Child registers itself as iframe SourceNode `_genro`, publishes `pageStarted`; parent invokes `onStarted` callbacks | `genro.js:910`, `genro_widgets.js:989`, `projects/gnrcore/packages/adm/resources/frameindex.js:167` |
| Initial/reopening arguments | `checkStartsArgs` sends `openKw` with default topic `changedStartArgs`, including when selecting an existing tab | `frameindex.js:199` |
| Message readiness | Iframe sender waits for `contentWindow._windowMessageReady` | `genro_widgets.js:1138` |
| Window messages | Sender uses `postMessage`; receiver extracts `topic` and publishes remaining properties locally | `genro_dom.js:1884`, `genro.js:861` |
| Direct routed topics | `publish({parent:true,...})` calls parent `publish`; iframe targets invoke child `genro.publish` directly | `genro.js:1830` |
| Tab selection | Parent waits for `_pageStarted`, then calls child `resizeAll()` | `frameindex.js:250` |
| Close guards | Parent calls `checkBeforeUnload`; legacy returns a warning string for unsaved changes, not a boolean permission | `frameindex.js:154`, `frameindex.js:410`, `genro.js:1050` |
| Parent commands | Main page subscribes to `selectIframePage`, `changeFrameLabel`, `closeFrame` and reload commands | `frameindex.py:458`, `frameindex.js:499` |
| Activity/focus | Child reports activity through main `childUserEvent` and maintains focused-child references | `genro.js:416`, `genro.js:603` |
| Shared data | Callback Bag nodes expose parent Data as `_frames._parent` and child Data as `_frames.<frameName>` | `genro.js:910` |
| Generic introspection | `currentGenro` and `callOnCurrentIframe` expect the legacy client, including arbitrary nested methods | `frameindex.js:494`, `frameindex.js:612` |

`nonGenroContent=True` currently permits display by skipping several legacy
expectations. It is not a communication adapter: no ready notification, argument
delivery or dirty-state handshake is established by that flag. Also, the delayed
selection callback still calls `resizeAll` whenever `contentWindow.genro` exists,
even for non-legacy content. Simply exposing Gramlot Application globally could
therefore introduce a new error.

## Proposed first implementation

Use an explicit, versioned host-bridge capability on the iframe, recognized before
the legacy `genro` fallback. Keep Gramlot's `genro` as its own Application; do not
make a legacy-shaped object the application's runtime. The parent side belongs
to Genropy; the browser service belongs to the optional host adapter. Application
authors continue to use Python Source and framework controllers/subscriptions.

1. **Lifecycle and arguments.** Attach the bridge early; separate application
   ready from content ready. Install the receiving subscriptions before signalling
   readiness, then deliver initial and repeated `changedStartArgs` payloads.
   Retain host-assigned frame identity independently from server page registration.
2. **Explicit messages in both directions.** Map selected topics into Gramlot's
   existing `Application.publish/subscribe` service. The current service accepts
   string topics only; legacy object-target routing needs an adapter. Initially
   transfer plain values and objects, not live Bags or SourceNodes. If using
   `postMessage`, validate parent window and origin, use an explicit target origin,
   and define the accepted envelope/topics. Do not reproduce the legacy wildcard
   sender and unfiltered message receiver.
3. **Host navigation.** Support changing this tab's title, requesting this tab's
   closure and opening/selecting another page. Bind requests to the calling frame;
   legacy `closeFrame` targets the selected frame and must not be forwarded blindly
   when a background child requests closure.
4. **Selection and activity.** Notify Gramlot when its tab becomes visible so
   layout-sensitive components can refresh; report focus and throttled activity to
   the host. Reuse host session activity handling without copying legacy polling.
5. **Close and teardown.** Expose a synchronous pending-changes snapshot to the
   parent guard, derived from Gramlot form dirty/editorDirty/saving state and any
   explicitly registered participants. The host owns confirmation. Cover close,
   reload and top-level unload entry points, then dispose listeners, subscriptions,
   parent-held references and the Application. A loose textbox is not itself a
   persisted form and must not automatically count as unsaved work.

Suggested capability names such as `hostBridge` or `genro.host` are proposals,
not approved API. The implementation must audit each legacy caller rather than
advertise full compatibility through a partial `window.genro` facade.

## Deliberately outside the first bridge

Live cross-runtime Bag sharing, parent Data bindings, remote object references,
arbitrary `callOnCurrentIframe` dispatch, legacy form/widget APIs, drag-and-drop
internals, external-window registration, database notifications and server page
registration are separate work. The `_calling_page_id` navigation parameter does
not grant authentication or create a registered Gramlot server page.

## Acceptance checks

- Open from the real menu; send arguments only after readiness and deliver them once.
- Reopen the same tab with new arguments; retain its identity and receive updates.
- Exchange one parent/child message through Python-authored Gramlot declarations.
- Switch away/back and verify component sizing, focus and host activity reporting.
- Request title/navigation/closure from a background child; target the correct tab.
- Edit a real form; exercise close, reload and host unload guards, including save
  in progress; confirm and cancel without silently dropping work.
- Close/reopen repeatedly without stale subscriptions or parent references.
- Verify existing legacy pages and plain non-legacy iframe content still work.

This audit changes no runtime, authentication or RPC behavior.
