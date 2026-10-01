## Output format

Return only JSON.

Return only the members named by this row's `result_fields`. When those members are `risk` and `confidence`, return exactly:

```json
{
  "risk": {
    "level": "low|medium|high|critical",
    "why": "<1–2 sentences naming the binding blast-radius dimensions for this head>"
  },
  "confidence": {
    "level": "low|medium|high",
    "why": "<1–2 sentences naming the binding confidence concern (intent, verified evidence, and/or completeness ceiling)>"
  }
}
```

For any other `result_fields` names, return a JSON object containing only those keys. The shape of each value is defined by the invoking producer's skill.

## Constraints

- Do not add keys.
- Risk `why` names the binding blast-radius dimensions for this head. It is not finding severity, not raw size alone, and not a glossary of the levels.
- Confidence `why` names the binding concern among intent, verified evidence, and the completeness ceiling, after the formula in the producer skill.
