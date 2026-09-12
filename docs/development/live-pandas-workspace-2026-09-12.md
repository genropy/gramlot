# Live pandas workspace with Gramlot

Date: 2026-09-12.
Status: retained discussion for future work; no implementation or public API is
approved by this document. This is a side project idea, not an addition to the
current Gramlot delivery scope.

## Purpose

Give a user a visual workspace for loading, inspecting, transforming and analysing
pandas DataFrames that remain alive in their Python server process. Gramlot pages
provide grids, controls, menus and parameter panels. Commands execute in Python;
results and data changes reach open pages through WebSockets.

The owner favours pandas because of its familiarity and ecosystem. Start with
pandas; alternative execution engines are not a prerequisite. The value is making
existing Python data and computations interactively accessible.

## Host architecture established by the owner

The intended host is **Genro ASGI**. According to the owner, it already provides:

- User-to-process sticky affinity, allowing the user's DataFrame to remain in
  that process across requests.
- Locks for objects shared between threads, serialising access.
- WebSocket mechanisms for realtime updates.

These are owner-provided premises, not implementation claims verified in this
discussion. Inspect the actual host APIs when work starts.

The consuming application and its Genro ASGI integration belong in a separate
application repository. Do not introduce a Genro ASGI dependency or extra into
Gramlot. Mutable DataFrames belong to a user workspace/service outside stateless
Page instances. Multiple pages of the same user may observe the same object while
retaining separate filters and selections.

Sticky affinity provides process placement, not persistence after a process exits.
Workspace lifetime, reconnect behaviour and optional persistence remain open.

## Proposed data and command flow

1. A Python-authored Gramlot control declares a command and its parameters.
2. The host dispatches it to the user's process.
3. The service acquires the host-provided lock, operates on the DataFrame and
   prepares a coherent result/snapshot with a revision while protected.
4. After releasing the lock, the service publishes the update via WebSocket.
5. A reusable Gramlot client service applies it to Data Bags; bound widgets react.

The browser receives a typed tabular projection, not the Python DataFrame object.
Keep request handling, subscriptions and update application in reusable framework
services/adapters. Application UI, state and interactions must use Gramlot Source,
Data Bags, bindings, controllers and components. Author the application in Python;
do not hide missing framework features in application-local JavaScript.

## Making the object observable

Holding a DataFrame in memory does not automatically expose every pandas mutation
as an event. The proposed service owns a stable object identity and controls
commands that change its data. An operation may replace the underlying DataFrame
while preserving that identity.

Controlled commands can identify affected records or invalidate dependent views.
External Python code that changes the underlying data needs an explicit change
notification contract. A WebSocket transports notifications; it does not detect
mutations. Start with recomputing invalidated views, and introduce targeted patches
where justified. Derived DataFrames do not automatically refresh themselves.

Use stable row identifiers rather than row positions, which change after sorting
and filtering. Define handling of duplicate pandas index labels separately.
Updates need revisions and reconnect resynchronisation; publication after lock
release must still preserve or account for revision ordering.

## Loading data comes first

The owner's correction: the first visual command is **New DataFrame / Load data**,
not a transformation on an assumed pre-existing table.

Suggested flow: source selection, preview, import options, workspace name, load.
Preview should expose headers, separators, column types, dates and missing values.

| Source | Visual interaction | Python acquisition |
| --- | --- | --- |
| File | Upload or select CSV, Excel, JSON or Parquet; choose sheet/options | `read_csv`, `read_excel`, `read_json`, `read_parquet` |
| Database | Select an available connection and table or query | `read_sql` |
| URL/API | Endpoint, parameters and record location in the response | Host acquisition service followed by DataFrame construction |
| Pasted table | Paste text copied from a spreadsheet | Server parsing of submitted text |
| Existing Python object | Choose objects explicitly exposed in the user's workspace | Existing DataFrame or construction from records |
| Existing DataFrame | Select a loaded dataset and optional subset | Copy or derived result |

Retain an acquisition recipe so **Reload from source** can repeat the operation.
Replacing data and appending rows must be distinct choices. Connections and
credentials belong to host-managed configuration, not an exported recipe.

## Candidate visual operations

These are proposed features, not an approved component grammar or delivery plan.
Loading was added first; pivot was moved beyond the initial ten actions.

| Order | Action | Visual parameters | pandas basis |
| --- | --- | --- | --- |
| 1 | Load data | Source, import options, name | Readers/construction above |
| 2 | Filter rows | Column, operator, value, AND/OR conditions | Boolean masks and `loc` |
| 3 | Sort | Ordered list of columns, direction, missing-value position | `sort_values` |
| 4 | Select columns | Checkboxes and column ordering | `loc[:, columns]` |
| 5 | Statistics | Selected columns and requested summaries | `describe`, `count`, `isna().sum()` |
| 6 | Values and frequencies | Column, counts/proportions, missing values | `value_counts` |
| 7 | Group and aggregate | Grouping columns and named measures/functions | `groupby`, `agg`, `size` |
| 8 | Calculated column | Name and expression over available columns | Vectorised expressions and `assign` |
| 9 | Handle missing values | Columns and replacement/removal strategy | `fillna`, `ffill`, `bfill`, `dropna` |
| 10 | Find/remove duplicates | Key columns and retention rule | `duplicated`, `drop_duplicates` |
| Later | Pivot table | Row fields, column fields, values, aggregation | `pivot_table` |

Formula syntax and evaluation rules remain to design; a visual expression editor
does not imply arbitrary Python execution. This list does not promise direct
grid-cell editing.

## Views and reproducible operations

Filters, sorting, summaries and pivots may produce named derived views linked to
the same source DataFrame. The application service tracks these dependencies and
refreshes affected views after source changes. A detail grid, grouped summary and
total can therefore observe one source together.

Cleaning/transformation commands should explicitly target either the working
DataFrame or a derived dataset. Record commands with editable parameters as a
repeatable sequence, for example:

`Filter -> Calculate margin -> Group by customer -> Sort by margin`

Showing equivalent Python code was proposed as a useful companion to the visual
sequence. Replay semantics and code generation have not been specified.

## Existing foundations and gaps

Gramlot already has reactive Bags, bindings and a resident read-only grid; see the
[grid guide](../guides/static-grid.md). This does not establish remote paging,
cell editing or a live pandas adapter.

Future work must define the pandas-to-Bag type mapping, including missing values,
dates/timezones and column metadata; command dispatch through the host; view
subscriptions; revision handling; and disposal when a page closes. Large datasets
need bounded server-side views/windows rather than full browser replication.
Long computations and failure behaviour must fit the host's execution model.

## Suggested first experiment

In the separate consuming application, load one DataFrame and expose a detail
grid, grouped summary, filter and one command that changes data. Open two browser
windows for the same user and check that both receive consistent updates.

Verify that reads/writes use host locks, command errors leave a coherent workspace,
page disposal removes subscriptions, and reconnect restores the current revision.
Audit the application for Python-first and Gramlot-only authoring. This experiment
is a proposal for a future task, not authorised implementation work now.

## References

- [pandas DataFrame API](https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.html)
- [pandas grouped operations](https://pandas.pydata.org/pandas-docs/stable/user_guide/groupby.html)
- [Gramlot project context](../context/README.md)
- [Page services discussion](page-services-design-2026-09-12.md)
