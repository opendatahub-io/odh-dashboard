---
name: description-jira
description: >-
  Compare the PR description to a host-fetched Jira issue snapshot.
  Fill product_ask. Do not review the diff against Jira acceptance criteria.
---

# Description vs Jira (product ask)

The PR description is the source of truth. This skill checks whether
that description **coheres with** the linked Jira issue's summary and
description. It does **not** treat Jira AC as a checklist against the
diff. Do not use Atlassian MCP. Do not fetch Jira yourself. Do not
emit `findings[]`.

## Inputs

1. PR title and body (Problem, Solution, Evidence, optional Product
   ask / tracking).
2. Host snapshot at `/sandbox/workspace/.fullsend/.run/jira.json` (also listed as
   `context_file` on the registry row).

If the snapshot `status` is not `ok`, or the file is missing, return:

```json
{
  "status": "none",
  "aligned": [],
  "mismatched": [],
  "justified_in_description": false,
  "needs_human": false
}
```

## Compare

Read Jira `summary` + `description` against the PR body's Problem,
Solution, Evidence, and Product ask / tracking.

- **aligned** — same product ask; call out what matches.
- **mismatch-justified** — they differ, and Evidence/Solution (or
  Product ask) explains why the PR departs. Description remains SoT.
  Set `justified_in_description: true`. Set `needs_human: true` when
  the departure is product-visible or you are unsure.
- **mismatch-unjustified** — they differ and the description does not
  justify it. Set `justified_in_description: false` and
  `needs_human: true`.

List short bullets in `aligned` and `mismatched`. Do not restate the
entire Jira issue. Do not mention code files unless the **description**
already names them.

## Output

Return only this object (the orchestrator copies it onto
`product_ask`):

```json
{
  "status": "none|aligned|mismatch-justified|mismatch-unjustified",
  "aligned": ["…"],
  "mismatched": ["…"],
  "justified_in_description": true,
  "needs_human": true
}
```

