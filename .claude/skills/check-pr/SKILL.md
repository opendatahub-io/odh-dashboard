---
name: check-pr
description: "Check a PR's readiness to merge, or check local branch quality if no PR exists. Runs all applicable checks (conflicts, CI, lint, type-check, tests, reviews, Jira, PR body) using whatever context is available — skips checks it can't run. Optionally fixes failures with --fix. Use when someone says check PR, check my branch, is this ready, or wants a pre-merge report."
argument-hint: "[PR number or URL] [--fix]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(npm *) Bash(npx *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Check PR

Run every applicable check against the current work and report results. Adapts to context — if a PR exists, reads from GitHub. If not, runs checks locally. Skips anything it can't check.

With `--fix`, attempts to fix failing checks after reporting.

## Step 1: Resolve context

Determine whether `$ARGUMENTS` contains `--fix`. Strip it from args if present and remember the flag.

Try to find a PR:
```bash
${CLAUDE_SKILL_DIR}/scripts/resolve-pr.sh "$ARGUMENTS"
```

This returns JSON with PR metadata, or errors if no PR is found. Either outcome is fine — the skill adapts.

If a PR was found, extract: `pr_number`, `owner`, `repo`, `pr_title`, `base_branch`, `body`, `reviewDecision`, `mergeable`.

If no PR, determine context from the local branch:
```bash
base_branch="main"
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
```

Detect which packages are affected by comparing against the base branch:
```bash
git diff --name-only origin/$base_branch | cut -d'/' -f1-2 | sort -u
```

## Step 2: Run all checks

Run every check below. Each check uses PR data if available, otherwise falls back to local or skips. Collect results into a table: check name, status (✅ ❌ ⚠️ ⏭️), and details.

### Conflicts

- **PR exists**: read `mergeable` from PR metadata. `MERGEABLE` → ✅, `CONFLICTING` → ❌, `UNKNOWN` → ⚠️. Also check commits behind with `git rev-list --count HEAD..origin/$base_branch`.
- **No PR**: `git fetch origin $base_branch --quiet && git rev-list --count HEAD..origin/$base_branch`. 0 → ✅, >0 → ⚠️ "N commits behind".

### CI

- **PR exists**: `gh pr checks "$pr_number" --json name,bucket,link --jq '[.[] | {name, bucket, link}]'`. All pass → ✅, any fail → ❌ (list names + links), any pending → ⚠️.
- **No PR**: ⏭️ skip — "no PR, CI hasn't run"

### Lint

- **PR exists**: ⏭️ skip — "CI covers this"
- **No PR**: run `npm run lint` on affected packages. Pass → ✅, fail → ❌ with error summary.

### Type Check

- **PR exists**: ⏭️ skip — "CI covers this"
- **No PR**: run `npm run type-check` on affected packages. Pass → ✅, fail → ❌ with error summary.

### Unit Tests

- **PR exists**: ⏭️ skip — "CI covers this"
- **No PR**: run `npm run test-unit` on affected packages. Pass → ✅, fail → ❌ with failure summary.

### Reviews

- **PR exists**: fetch unresolved review threads:
  ```bash
  ${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
  ```
  Also read `reviewDecision` from PR metadata.
  - `APPROVED` + no unresolved threads → ✅
  - `CHANGES_REQUESTED` → ❌
  - Unresolved CodeRabbit CRITICAL/MAJOR → ❌
  - Unresolved human threads → ❌
  - Only minor/info CodeRabbit threads → ⚠️
  - `REVIEW_REQUIRED` → ⚠️
- **No PR**: ⏭️ skip — "no PR, no reviews yet"

### Jira

Extract Jira key from PR title/body (if PR) or branch name/commit messages (if local):
```bash
# From PR
echo "$pr_title $pr_body" | grep -oE 'RHOAIENG-[0-9]+' | head -1
# From branch/commits
git branch --show-current | grep -oE 'RHOAIENG-[0-9]+' || git log --oneline -5 | grep -oE 'RHOAIENG-[0-9]+' | head -1
```

- No key found → ❌ "no Jira issue referenced"
- Key found → ✅. If Jira MCP or `JIRA_TOKEN` is available, verify the issue exists and is active. Otherwise ⚠️ "found key, couldn't verify".

### Test Coverage

Check if the diff includes test files (`.test.`, `.spec.`, `.cy.`):
- **PR exists**: `gh pr diff "$pr_number" --name-only`
- **No PR**: `git diff --name-only origin/$base_branch`

Test files present → ✅. No test files but "Test Impact" section explains why → ✅. Neither → ⚠️.

Skip if only non-code files changed (markdown, yaml, config).

### PR Body

- **PR exists**: check against `.github/pull_request_template.md`:
  1. `## Description` has real content (not just template comments) → ✅/❌
  2. `## How Has This Been Tested?` has content → ✅/⚠️
  3. `## Test Impact` has content → ✅/⚠️
  4. Checklist: count `- [x]` vs `- [ ]` → report ratio
  5. Jira URL present → ✅/❌
  6. Screenshots if PR touches `.tsx`/`.css`/`.scss` → ⚠️ if missing
  - Empty Description → ❌, other missing sections → ⚠️
- **No PR**: ⏭️ skip — "no PR body yet"

## Step 3: Print results table

```
PR Review — PR #1234: feat: add new feature
Jira: RHOAIENG-12345

| Check         | Status | Details                          |
|---------------|--------|----------------------------------|
| Conflicts     | ✅     | Clean, up to date                |
| CI            | ❌     | Lint failed (link)               |
| Lint          | ⏭️     | CI covers this                   |
| Type Check    | ⏭️     | CI covers this                   |
| Unit Tests    | ⏭️     | CI covers this                   |
| Reviews       | ⚠️     | 2 minor CR suggestions           |
| Jira          | ✅     | RHOAIENG-12345 — active          |
| Test Coverage | ✅     | 3 test files changed             |
| PR Body       | ⚠️     | 2/5 checklist unchecked          |

Verdict: NOT READY — 1 failing check
```

Verdict:
- Any ❌ → **NOT READY**
- All ✅, some ⚠️ → **READY WITH WARNINGS**
- All ✅ → **READY TO MERGE** (or **READY** if no PR)

## Step 4: Local review (when no PR)

If the Reviews check was skipped (no PR exists), run a local code review so there's feedback before fixing:

- If CodeRabbit CLI is installed: `coderabbit review --agent`
- Otherwise: invoke Claude's built-in `/review` skill as fallback

Add any findings to the results.

## Step 5: Fix (only with --fix)

If `--fix` was not passed, stop after printing the table.

If `--fix` was passed, work through the failing checks:

### Rebase (if Conflicts ❌ or ⚠️)
Fetch and rebase onto base branch. Resolve conflicts file by file. Do not push — the user will push manually when ready.

### Review fixes (if Reviews ❌)
- **PR exists**: invoke `coderabbit-autofix` for CodeRabbit threads. Decline any commit/push prompts — everything commits together at the end. Then fetch human threads via `fetch-review-threads.sh`, verify each is valid, apply smallest safe fix.
- **No PR**: fix issues surfaced by the local review in Step 4.

### CI / local check fixes (if CI ❌, Lint ❌, Type Check ❌, or Unit Tests ❌)
- **PR exists**: use `${CLAUDE_SKILL_DIR}/scripts/fetch-ci-failures.sh "$owner" "$repo" "$pr_number"` to get failed job logs. Fix the specific errors.
- **No PR**: the lint/type-check/test output from Step 2 already has the errors. Fix them.

Only fix errors in files changed by this PR/branch. Don't fix pre-existing issues. Don't run `eslint --fix` on entire directories — fix specific lines with the Edit tool.

### Cleanup (if any files were changed above)
Skip if nothing was changed by the fix steps.

Run `/simplify` on changed files, then lint those files to catch anything remaining.

### Commit
Skip if nothing was changed.

Create one commit with all fixes. Write a descriptive message reflecting what actually changed.

```bash
git add <files-changed>
git commit -m "fix: <describe what changed>

Co-Authored-By: Claude <noreply@anthropic.com>
Signed-off-by: $(git config user.name) <$(git config user.email)>"
```

Never push automatically. Tell the user what was done.

## Step 6: Re-check (after fix)

Re-run all checks from Step 2 and print an updated results table. This shows what went from ❌ to ✅.
