# Context brief output contract

The invoking dimension id is supplied as `Output id`. Return only:

```json
{
  "brief": {
    "id": "<Output id>",
    "status": "completed|partial|unavailable",
    "stated_intent": "<what the PR body and linked issue say the change is for, or 'not stated'>",
    "behavior_changes": [
      { "what": "<what behaved one way before and another way now>", "file": "<repository-relative path>", "line": 1 }
    ],
    "related_code": [
      { "file": "<repository-relative path>", "line": 1, "relation": "caller|consumer|test|config|doc|sibling", "note": "<why a reviewer should read it>" }
    ],
    "could_not_determine": ["<what you looked for and could not establish>"]
  }
}
```

A brief is a set of facts for other reviewers to start from. It carries no
severity, verdict, recommendation, or instruction to its reader.

- `stated_intent` is a sentence or two.
- `related_code` lists only files outside the PR diff.
- At most 8 `behavior_changes` and 12 `related_code` entries. Keep the ones
  a reviewer could not guess from the diff.
- Omit `line` instead of guessing. Empty arrays are valid.
- Use `partial` when the budget ran out, and `unavailable` when nothing
  useful was established; say why in `could_not_determine`.
