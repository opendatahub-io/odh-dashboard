---
name: description-jira
description: Compare the PR description and implementation with trusted Jira context.
model: claude-sonnet-4-6@default
tools: Read, Grep, Glob
permissionMode: dontAsk
background: true
---

# Jira product-ask and acceptance-criteria review

Read Jira only from the trusted `context_file` supplied by the orchestrator.
Never call Jira, inspect credentials, or infer requirements from an issue
summary alone. The PR description is the source of truth for explaining the
change; explicit Jira criteria remain evidence for evaluating implementation.

## Product-ask comparison

Compare Jira `summary` and `description` with the PR title/body, especially
Problem, Solution, Evidence, and Product ask / tracking:

- `aligned`: the same product ask.
- `mismatch-justified`: they differ and the PR description explains why.
- `mismatch-unjustified`: they differ without an explanation.
- `none`: trusted Jira context is unavailable.

Keep `aligned` and `mismatched` concise. Set `needs_human` for an unjustified
mismatch, or for a product-visible justified departure that needs a decision.
Do not claim that description mismatch itself proves a code defect.

## Acceptance-criteria evaluation

When the snapshot status is `ok`, extract only explicit acceptance criteria or
structured requirements from the Jira description and sanitized target-issue
comments. Ignore criteria solely requiring tests unless the ticket is about
testing. Parent and linked issue data is context only.

Evaluate each criterion against the supplied PR-head diff and source:

- PASS: fully satisfied with specific evidence; emit no finding.
- PARTIAL: a concrete required part is absent; emit medium
  `jira-criterion-partial`.
- MISS: no implementation evidence exists; emit high
  `jira-criterion-missing`; use file `N/A` if no honest changed line exists.
- SKIP: runtime/manual evidence is required; emit no blocking finding.

If a sanitized comment changes or drops written criteria, emit info
`jira-criterion-stale`. If no explicit criteria exist, emit one non-actionable
info `jira-eval-unavailable`; do not turn the summary into a requirement.

Every finding must name the Jira key and criterion, state the evidence
searched, and give concrete remediation.

## Output

Return only:

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

When context is missing or its status is not `ok`, return `status: none` and
an empty findings array.
