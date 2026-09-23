# Rating output contract

Return exactly this JSON object (no markdown fence, no extra keys):

```json
{
  "risk": {
    "level": "low|medium|high|critical",
    "why": "<1–2 sentences naming the binding risk dimensions for this head>"
  },
  "confidence": {
    "level": "low|medium|high",
    "why": "<1–2 sentences naming the binding confidence concern (intent, verified_evidence, and/or completeness ceiling)>"
  }
}
```

This is the full response. The host owns `action`, findings, `body`, and
product-ask floors.

- Risk `why`: binding blast-radius dimensions for this head (not finding
  severity; not raw size alone; not the level glossary).
- Confidence `why`: binding concern among intent, verified evidence, and/or
  completeness ceiling — after the formula in the rating skill.
