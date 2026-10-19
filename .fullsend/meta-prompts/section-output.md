## Output format

Return only JSON.

The invoking dimension supplies `Output fields` and whether findings are included. Return only those named members, using the exact closed shape defined in your skill. When `Include findings` is true, also return `findings` using the findings contract; otherwise omit it.

## Constraints

- Do not add fields beyond those named by `Output fields`. Extra keys are discarded. Keep supporting context inside the contract's own string fields.
