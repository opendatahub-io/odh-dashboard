## Output format

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

Include `actionable: true` when a low or info finding is concrete follow-up work. Otherwise omit `actionable`. Omit `line` when it cannot be verified. Omit other optional fields instead of guessing. Return `[]` when no finding belongs to this dimension.
