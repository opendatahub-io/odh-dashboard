---
name: pr-review
description: Dashboard PR review that combines general code review with the maintained Dashboard style, RBAC, and Jira evaluation guidance.
---

# Dashboard PR review

Review the pull request identified by `GITHUB_PR_URL`. This is a single
reviewer workflow, not a custom sub-agent framework.

## Inputs and trust boundary

- Use `gh` to obtain PR metadata, changed files, and the unified diff.
- For every changed file, fetch its content at the PR head SHA using the
  GitHub API. The checked-out `target-repo/` is the base branch: never use it
  to judge changed code.
- Read unchanged files from `target-repo/` only when needed for local context.
- If `/sandbox/workspace/.fullsend/.run/jira.json` exists, it is a trusted,
  read-only snapshot prepared by the host. Do not call Jira, request
  credentials, or include credentials in output.

## Review dimensions

Always assess correctness, tests, regressions, API compatibility, security,
and repository conventions. Then use the maintained Dashboard skills when the
changed paths make them relevant:

- `style-review` for TSX, CSS, SCSS, PatternFly, wrapper, or custom-class
  changes.
- `rbac-review` for routes, pages, actions, data hooks, SSAR, auth, namespace,
  backend, or BFF changes.
- `jira-eval-review` only when the trusted Jira snapshot is `status: ok` and
  contains explicit criteria or requirements. Apply its evaluation guidance to
  the snapshot; do not invoke its live Atlassian-MCP fetch procedure.

If a dimension is out of scope, do not invent findings. Keep a short
`inspected` record of the review dimensions and evidence considered.

## Jira handling

Treat the PR description as the source of truth. The Jira snapshot supplies
product context and explicit acceptance criteria; it does not authorize a
finding merely because the PR differs from a loosely related issue. If criteria
are absent, record Jira evaluation as unavailable rather than guessing.

## Findings

Report only actionable, PR-head-verified defects. Deduplicate overlapping
observations into the most useful finding. Use exact changed file paths and
one-based line numbers when the location is stable. Do not emit inline-comment
instructions: the host posts one summary-only comment.

Severity:

- `critical`: exploitable security or data-loss defect.
- `high`: likely production breakage, permission bypass, or unmet explicit
  requirement.
- `medium`: real correctness, maintainability, or test gap that should be
  addressed before routine merge.
- `low` / `info`: useful but non-blocking improvement.

## Result

Write exactly one valid JSON object to
`$FULLSEND_OUTPUT_DIR/agent-result.json`, following the supplied
`review-result.schema.json`. Include `head_sha`, `pr_number`, `repo`, a concise
`change_summary`, calibrated `risk` and `confidence`, `findings`, and
`verification`. Set `action` to `request-changes` for critical/high findings
or functional medium findings; otherwise use `comment` or `approve`.

Do not post GitHub comments or labels. The host validates, formats, and posts
the result after the sandbox exits.
