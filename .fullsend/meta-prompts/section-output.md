# Schema-section output contract

The invoking dimension supplies `Output fields` (or the legacy single `Output
section`) and whether findings are included. Return only those named schema
members. When `Include findings` is true, also return `findings` using the
findings contract; otherwise omit it.

For `product_ask`, return:

```json
{
  "product_ask": {
    "status": "none|aligned|mismatch-justified|mismatch-unjustified",
    "aligned": [],
    "mismatched": [],
    "justified_in_description": false,
    "needs_human": false
  },
  "jira_criteria": [
    {
      "criterion": "<explicit Jira acceptance criterion>",
      "verdict": "PASS|PARTIAL|MISS|SKIP",
      "evidence": "<diff-grounded evidence or reason it cannot be evaluated>",
      "stale_comment": false
    }
  ],
  "findings": []
}
```

This is an exact closed shape. Do not add Jira identity, summary,
explanation, overall-assessment, or other fields to `product_ask` or its
criterion rows. Keep that supporting context in the allowed string arrays and
`evidence` fields. The orchestrator must project the returned object onto this
shape before adding it to the final review result.
