## Output format

Return only a JSON array. Each item must be:

```json
{
  "severity": "critical|high|medium|low|info",
  "category": "<one of your Allowed categories>",
  "file": "<repository-relative path or N/A>",
  "line": 1,
  "description": "<evidence-backed explanation>",
  "why": "<required for critical, high, and medium>",
  "remediation": "<required for critical and high>",
  "actionable": true
}
```

When the prompt supplies `Allowed categories`, `category` must be exactly one of those strings, copied verbatim. Pick the closest one when none fits exactly and name the specific defect in `description`; never invent, reword, or combine category names. The only exception is a literal category your definition prescribes for a specific finding. The host carries prior findings into the next re-review only when every finding uses a listed category.

Include `actionable: true` when a low or info finding is concrete follow-up work. Otherwise omit `actionable`. Omit `line` when it cannot be verified. Omit other optional fields instead of guessing. Return `[]` when no finding belongs to this dimension.
