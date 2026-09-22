# Findings output contract

Return only a JSON array. Each item must be:

```json
{
  "severity": "critical|high|medium|low|info",
  "category": "<dimension-specific category>",
  "file": "<repository-relative path or N/A>",
  "line": 1,
  "description": "<evidence-backed explanation>",
  "why": "<required for critical, high, and medium>",
  "remediation": "<required for critical and high>",
  "actionable": true
}
```

Omit optional fields instead of guessing. Return `[]` when no finding belongs
to this dimension.
