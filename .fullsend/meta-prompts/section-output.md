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
  "findings": []
}
```

This is an exact closed shape. Do not add Jira identity, summary, explanation,
overall-assessment, criteria rows, or other fields to `product_ask`. Keep
supporting context in the allowed string arrays. When findings are included,
they use the findings contract and must describe only concrete coherence
problems, not Jira-versus-code evaluation. The orchestrator must project the
returned object onto this shape before adding it to the final review result.
