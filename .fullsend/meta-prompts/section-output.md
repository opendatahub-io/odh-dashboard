# Schema-section output contract

The invoking dimension supplies `Output fields` and whether findings are
included. Return only those named schema members using the exact closed
shape defined in your skill. When `Include findings` is true, also return
`findings` using the findings contract; otherwise omit it.

Do not add fields beyond those named by `Output fields`. The orchestrator
projects the returned object onto the result schema; extra keys are
discarded. Keep supporting context inside the contract's own string fields.

Return only JSON. No Markdown fence, no explanatory prose.
