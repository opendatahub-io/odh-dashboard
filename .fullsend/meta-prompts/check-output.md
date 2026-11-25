## Output format

Return only this JSON object.

```json
{
  "checks": [
    {
      "id": "<declared check id>",
      "status": "pass|fail|warning|not-applicable|could-not-verify",
      "summary": "<short result>",
      "details": ["<evidence-backed detail, omit the key when empty>"]
    }
  ]
}
```

`checks` is an array: a producer that declares one check returns one object,
and a producer that declares several returns one object per declared check.

## Declared checks

The invoking dimension supplies `Output checks`, the registry-declared
`{id, label}` pairs for this producer. Every returned `checks[].id` must be one
of those supplied ids; never invent, rename, or translate an id. Return exactly
one object for **each** declared id, including aspects that do not apply
(`status: not-applicable`) — an omitted declared id is an incomplete producer,
not a pass. Do not return an id twice. When the caller supplies no declared
set, return exactly one object whose `id` is the supplied `Output id`.

Labels are host-owned: the registry supplies them, so do not return a `label`
key or put the label in place of the id.

## Status

- `pass` — the check is satisfied
- `warning` — satisfied, with a caveat
- `not-applicable` — the check does not apply to this head
- `fail` — not ready; the author must fix it
- `could-not-verify` — required trusted context was unavailable

When the aspect rules in your skill use ✅ / ⚠️ / ❌ / ➖, return `pass` /
`warning` / `fail` / `not-applicable`.

Statuses are per check. The single-row roll-up in your skill's *Status mapping*
section describes that skill's direct-CLI report only; when declared checks are
supplied, do not apply it. The host renders each returned check as its own row
and gates on each one.

## Constraints

- Do not add keys.
- Do not invent a code finding to fit the findings schema.
- Do not guess a pass when required trusted context was unavailable.
- Keep each aspect's reasoning and evidence in its own `summary` / `details`;
  do not fold one aspect's evidence into another aspect's row.
