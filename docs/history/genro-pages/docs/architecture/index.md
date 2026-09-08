# Architecture and experiment handoff

**Version:** 1.0 · **Last updated:** 2026-09-05

**Status:** 🔴 DA REVISIONARE — documentary synthesis for review. Explicit user requirements below are recorded decisions; proposed contracts and experiment details are not approved implementation specifications.

Start with [decisions](decisions.md), then read the [experiment handoff](handoff.md).
The detailed references preserve the findings needed to continue without the original conversation.

```{toctree}
:maxdepth: 1

decisions
handoff
legacy-reference
configuration
server-gui
poc-inventory
```

## How to interpret this record

The owner requested this transfer into permanent architecture documentation.
The review status concerns this written synthesis and its proposals; it does not
reopen explicit requirements from the conversation. Implementation remains Pre-Alpha.
Evidence was obtained by static source inspection, not by running the investigated POCs.
File positions are navigation aids for the examined checkout, not stable API references.

The earlier discovery covered server administration, legacy page construction,
client stores, transport, resolvers, remote fragments, both component systems,
configuration grammars and orchestration profiles. The chosen next home is
`genro-pages`, a sibling of `genro-asgi`, with a minimal server and test pages to
be implemented in a subsequent experiment.

The three detailed reference chapters were transferred from the dated discovery
reports with their findings intact. The POC inventory consolidates the original
Italian reconnaissance in English. Decisions and handoff reconcile later user
clarifications with the earlier reports. Earlier unanswered questions are not
implicitly carried forward when the user subsequently resolved them.
