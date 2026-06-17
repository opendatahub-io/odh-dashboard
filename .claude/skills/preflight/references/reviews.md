# Step 2: Reviews

## PR exists and synced
Fetch existing reviews:
```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```
Report: CodeRabbit threads with severity, human threads, review decision.

## No PR, not synced, or --local
No reviews exist on this code. Determine which reviewers to run:

- If `--review X,Y` was passed → run those directly
- If `--skip-review X,Y` was passed → run all EXCEPT those (no prompt)
- If `--ci` was passed → run all available reviewers without asking
- Otherwise → use AskUserQuestion with multiSelect

Available reviewers:
- **CodeRabbit CLI** — `coderabbit review --agent` (requires CLI installed)
- **Claude review** — invoke `/review` built-in skill
- **Style review** — invoke `/style-review`
- **RBAC review** — invoke `/rbac-review`

If a reviewer fails, report the failure — don't silently fall back.

## Prior Preflight Threads

When a PR has prior preflight review threads, classify them and evaluate whether each is still valid:

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number" \
  | ${CLAUDE_SKILL_DIR}/scripts/classify-prior-threads.sh --pr-author "$pr_author"
```

**Note:** Resolved (collapsed) threads are excluded by `fetch-review-threads.sh` (`isResolved == false`), so only open threads appear.

The output has `preflight_threads` (with `disposition`) and `other_threads`. For each preflight thread, read the finding, the current code at that location, any replies, and the PR context (diff, Jira, description) to decide:

### Still valid → keep as active finding

The finding still applies to the current code. Do not re-post it (the original comment is visible). Count it as an active finding.

### No longer valid → resolve (CI only)

The finding no longer applies — the code was fixed, a reply explains why it doesn't apply, or it's no longer relevant given the current PR state. With `--ci`, resolve the thread:

1. Post a reply explaining why (e.g., "Resolved — addressed in `<short SHA>`.")
2. Call `resolveReviewThread` GraphQL mutation to collapse it.

Without `--ci`, report what would be resolved but do not call the API.

### Never re-post

Regardless of validity, never re-post a finding that matches a prior preflight thread. The original comment is already on the PR.
