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
