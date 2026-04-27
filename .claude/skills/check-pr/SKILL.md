---
name: check-pr
description: "Check a PR or local branch for merge readiness. Gathers context, runs reviews and checks, reports a results table. Optionally fixes issues with --fix."
argument-hint: "[PR number or URL] [--fix]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(npm *) Bash(npx *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Check PR

Four steps: gather context, review code, run checks, optionally fix. Adapts to what's available — if there's a PR, use it. If not, work locally. Skip what you can't check.

Never push, never comment on the PR.

## Step 1: Gather context

Parse `$ARGUMENTS` — strip `--fix` if present. The rest is a PR number or URL.

Try to find a PR. If a number was given, use it. Otherwise try `gh pr list --head "$(git branch --show-current)"`. If a PR exists, fetch its metadata with `gh pr view`. If not, that's fine.

Figure out:
- **owner/repo**: `gh repo view --json owner,name`
- **base branch**: from PR metadata, or default to `main`
- **affected packages**: `git diff --name-only origin/$base_branch | cut -d'/' -f1-2 | sort -u`
- **Jira key**: grep for `RHOAIENG-[0-9]+` in PR title/body, branch name, or recent commit messages

## Step 2: Review

If a PR exists, fetch existing reviews:
```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```
This gives CodeRabbit threads (with severity) and human review threads. Also check `reviewDecision` from PR metadata.

If no PR exists, no one has reviewed the code yet. Run a local review:
- If CodeRabbit CLI is installed (`coderabbit --version`): `coderabbit review --agent`
- Otherwise: invoke `/review` as fallback

## Step 3: Check

Run each check using PR data when available, local tools when not. Report each as ✅ ❌ ⚠️ or ⏭️ (skipped).

| Check | What to check |
|---|---|
| **Conflicts** | PR: `mergeable` field. Local: `git rev-list --count HEAD..origin/$base_branch` |
| **CI** | PR: `gh pr checks --json name,bucket,link`. Local: ⏭️ skip |
| **Lint** | PR: ⏭️ (CI covers it). Local: `npm run lint` on affected packages |
| **Type Check** | PR: ⏭️ (CI covers it). Local: `npm run type-check` on affected packages |
| **Unit Tests** | PR: ⏭️ (CI covers it). Local: `npm run test-unit` on affected packages |
| **Reviews** | Results from Step 2. Unresolved critical/major CR or human threads → ❌ |
| **Jira** | Key found and issue exists → ✅. No key → ❌. Can't verify → ⚠️ |
| **Test Coverage** | Test files in diff → ✅. None but explained in PR body → ✅. Neither → ⚠️ |
| **PR Body** | PR: check Description, How Tested, Test Impact sections filled, checklist items checked. Local: ⏭️ skip |

Print a results table:

```
Check PR — PR #1234: feat: add new feature
Jira: RHOAIENG-12345

| Check         | Status | Details                          |
|---------------|--------|----------------------------------|
| Conflicts     | ✅     | Up to date                       |
| CI            | ❌     | Lint failed (link)               |
| ...           |        |                                  |

Verdict: NOT READY — 1 failing check
```

Verdict: any ❌ → **NOT READY**. All ✅ with ⚠️ → **READY WITH WARNINGS**. All ✅ → **READY**.

## Step 4: Fix (only with --fix)

Stop here if `--fix` was not passed.

Work through failing checks in order:

1. **Rebase** if conflicts found
2. **Review fixes** — PR: invoke `coderabbit-autofix` for CR threads (decline its commit/push prompts), then fix human threads via `fetch-review-threads.sh`. Local: fix issues from the local review
3. **CI / lint / test fixes** — fix specific errors in files changed by this branch. Don't auto-format entire directories. Don't fix pre-existing issues
4. **Cleanup** — run `/simplify` on files changed during fixes, then lint those files. Skip if nothing changed
5. **Commit** — one commit with all fixes. Descriptive message. `Co-Authored-By` + `Signed-off-by`. Never push

After fixing, run lint and type-check on changed files to verify the fixes compile. Print an updated table — PR-sourced checks keep their original status (nothing was pushed), local checks get updated.
