# Readiness-check output contract

The invoking dimension id is supplied as `Output id`. Return only:

```json
{
  "check": {
    "id": "<Output id>",
    "status": "pass|fail|warning|not-applicable|could-not-verify",
    "summary": "<short result>",
    "details": ["<evidence-backed detail>"]
  }
}
```

A check reports evidence and readiness; it must not invent a code finding to
fit the findings schema. Use `could-not-verify` when required trusted context
was unavailable.
