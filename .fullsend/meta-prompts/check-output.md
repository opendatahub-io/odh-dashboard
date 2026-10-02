## Output format

Return only this JSON object.

```json
{
  "check": {
    "id": "<Output id>",
    "status": "pass|fail|warning|not-applicable|could-not-verify",
    "summary": "<short result>",
    "details": ["<evidence-backed detail, omit the key when empty>"]
  }
}
```

`check.id` must equal the supplied `Output id`.

## Status

- `pass` — the check is satisfied
- `warning` — satisfied, with a caveat
- `not-applicable` — the check does not apply to this head
- `fail` — not ready; the author must fix it
- `could-not-verify` — required trusted context was unavailable

## Constraints

- Do not add keys.
- Do not invent a code finding to fit the findings schema.
- Do not guess a pass when required trusted context was unavailable.
