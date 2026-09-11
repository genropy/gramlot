
## Standalone date-expression parser

Import `parseDateExpression` from `gramlot-dom/date-parser` to decode Italian or
English date/period expressions without loading the DOM runtime. It accepts an
explicit civil `workdate` and returns ISO civil date strings or inclusive period
endpoints. See the [parser guide](../../docs/guides/date-expression-parser.md)
for syntax, result types and ambiguity policies. No widget integration is implied.
