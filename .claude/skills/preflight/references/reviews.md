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

## Prior Review Deduplication

When a PR has prior preflight review threads, classify them to avoid duplicate suggestions on subsequent runs:

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number" \
  | ${CLAUDE_SKILL_DIR}/scripts/classify-prior-threads.sh --pr-author "$pr_author"
```

**Note:** Resolved (collapsed) review threads are excluded upstream by `fetch-review-threads.sh`, which only selects threads where `isResolved == false`. Resolved threads therefore never appear in the classification input and do not need disposition handling.

The output has two arrays:

- **`preflight_threads`** — threads from prior preflight runs, each with a `disposition`:
  - `no_reply` — no human replied. The finding is still posted on the PR. **Do not re-post**, but count as an active finding in the checks table.
  - `author_replied` — the PR author replied. Read the reply content to determine intent:
    - Dismissed or disagreed ("not applicable", "intentional", "by design", "won't fix") → treat as resolved. **Exclude from findings count** and do not re-post.
    - Acknowledged ("will fix", "good catch", "thanks") → the original comment stands. Do not re-post.
    - Asked a question → keep as active finding. Do not re-post.
  - `reviewer_replied` — a non-author human replied. Read the reply to determine if it reinforces the finding or resolves it. Do not re-post regardless.
- **`other_threads`** — non-preflight threads (human reviews, CodeRabbit). Handle normally.

### Applying deduplication

When compiling findings for the checks table and inline comments:

1. Match new findings against prior preflight threads by **file path** and **line/issue similarity** (same file + same or adjacent line + same concern).
2. **Do not re-post** inline comments for any finding that matches a prior preflight thread — the original comment is still visible on the PR.
3. **Exclude dismissed findings** (author replied with disagreement) from the active findings count in the Review check row.
4. Findings with no prior match are net-new — post as inline comments and count normally.

## Prior Thread Resolution

After classification, resolve prior preflight threads whose findings have been addressed by new commits. This runs automatically before compiling new findings:

```bash
echo "$classified_threads" \
  | ${CLAUDE_SKILL_DIR}/scripts/resolve-prior-threads.sh "$owner" "$repo" "$pr_number"
```

### What gets resolved

Only threads meeting **all** of these criteria:
- Identified as a preflight thread (severity badge pattern)
- `disposition: "no_reply"` — no human has engaged
- The thread's `line` is non-null (line-specific finding)
- The file+line was modified in commits after the thread was posted

### What does NOT get resolved

- Threads where a human replied (`author_replied`, `reviewer_replied`) — human conversations are never auto-collapsed
- File-level comments (no line anchor) — cannot determine if addressed
- Threads on lines that were not modified — the finding may still apply

### Resolution actions

For each resolved thread:
1. Post a reply: "Resolved — addressed in `<short SHA>`."
2. Call `resolveReviewThread` GraphQL mutation to collapse the thread

### Edge cases

| Scenario | Behavior |
|---|---|
| File deleted | Resolve — finding is moot |
| File renamed | Old path no longer exists → resolve |
| Line moved but content unchanged | If the original line number is in a diff hunk, resolve |
| Force-pushed branch | Uses `createdAt` timestamp, not commit ancestry |
| Thread on null line | Skip — cannot verify |
