---
name: check-pr
description: "Check a PR or local branch for merge readiness. Gathers context, runs reviews and checks, reports a results table. Interactive by default — asks what to review and whether to fix. Supports flags: --fix, --local, --review coderabbit,claude."
argument-hint: "[PR number or URL] [--fix] [--local] [--review coderabbit,claude]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(npm *) Bash(npx *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Check PR

Gather context, review code, run checks, report results. Interactive by default — asks the user before making decisions. Never skip a check silently.

Never push. Never comment on the PR.

## Flags

Parse these from `$ARGUMENTS` before processing:
- `--fix` — after reporting, fix failing checks without asking
- `--local` — ignore PR even if one exists, run everything locally
- `--review X,Y` — run specific reviewers without asking (options: `coderabbit`, `claude`)
- No flags — interactive mode: ask the user what to do at decision points

## Step 1: Gather context

Try to find a PR (unless `--local`):
- If a number/URL was given, use it
- Otherwise: `gh pr list --head "$(git branch --show-current)" --state open --json number --jq '.[0].number'`
- If found, fetch metadata: `gh pr view "$pr_number" --json title,headRefName,baseRefName,mergeable,mergeStateStatus,number,body,author,reviewDecision`

Get repo info:
```bash
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
```

**Check if local matches PR** (important — determines whether CI results are trustworthy):
```bash
# Get the PR's head SHA
pr_sha=$(gh pr view "$pr_number" --json headRefOid --jq '.headRefOid')
# Get local HEAD
local_sha=$(git rev-parse HEAD)
# Check for uncommitted changes
has_changes=$(git status --porcelain)
```

If `pr_sha == local_sha` AND no uncommitted changes: **local is synced with PR**. CI results from the PR apply to this code.

If not synced (different SHA, uncommitted changes, or unpushed commits): CI results don't apply — need to run checks locally.

Figure out base branch and affected packages:
```bash
base_branch="main"  # or from PR metadata
git diff --name-only origin/$base_branch | cut -d'/' -f1-2 | sort -u
```

Extract Jira key from PR title/body, branch name, or recent commits:
```bash
grep -oE 'RHOAIENG-[0-9]+' <<< "$pr_title $pr_body" || git branch --show-current | grep -oE 'RHOAIENG-[0-9]+'
```

Print a context summary:
```
Check PR — PR #1234: feat: add new feature (synced ✅)
```
or
```
Check PR — local branch: fix/RHOAIENG-14618 (no PR)
```

## Step 2: Review

If a PR exists and is synced, fetch existing reviews:
```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```
Report what's there — CodeRabbit threads with severity, human threads, review decision.

If no PR exists, or PR exists but is not synced, or `--local`: no reviews have been done on this code yet. Ask the user what reviewer to run:

If `--review` flag was passed, use those reviewers directly. Otherwise use AskUserQuestion:
- "CodeRabbit CLI" — run `coderabbit review --agent` (requires CLI installed)
- "Claude review" — invoke `/review` built-in skill
- "Both"
- "Skip review"

Run whichever the user picks. If a reviewer fails (e.g. CR CLI not installed or errors), report the failure clearly — don't silently fall back to something else.

## Step 3: Check

Run each check. A check can be:
- ✅ **passed**
- ❌ **failed** — with details
- ⚠️ **warning** — passed with caveats
- ⏭️ **covered** — only if CI already ran this check on the exact same commit (synced with PR)

**⏭️ means "this check passed in CI on this exact code." It does NOT mean "skipped because we couldn't run it."** If a check can't run (e.g. tsc OOM, missing tool), that's ❌ or ⚠️ with an explanation, never ⏭️.

| Check | PR synced with local | PR exists but not synced | No PR |
|---|---|---|---|
| **Conflicts** | `mergeable` from PR | `mergeable` from PR + warn "local out of sync" | `git rev-list --count HEAD..origin/$base_branch` |
| **CI** | ⏭️ read from `gh pr checks` | ❌ "CI ran on different code" — run locally | run locally |
| **Lint** | ⏭️ if CI lint passed | `npm run lint` on affected packages | `npm run lint` on affected packages |
| **Type Check** | ⏭️ if CI type-check passed | `npm run type-check` | `npm run type-check` |
| **Unit Tests** | ⏭️ if CI tests passed | `npm run test-unit` | `npm run test-unit` |
| **Reviews** | Results from Step 2 | Results from Step 2 | Results from Step 2 |
| **Jira** | key found + verify if possible | key found + verify if possible | key found + verify if possible |
| **Test Coverage** | test files in diff | test files in diff | test files in diff |
| **PR Body** | check template sections | check template sections | ❌ "no PR body" |

Print results table:

```
| Check         | Status | Details                          |
|---------------|--------|----------------------------------|
| Conflicts     | ✅     | Up to date                       |
| CI            | ⏭️     | All passing (synced with PR)     |
| Lint          | ⏭️     | Passed in CI                     |
| Type Check    | ⏭️     | Passed in CI                     |
| Unit Tests    | ⏭️     | Passed in CI                     |
| Reviews       | ❌     | 2 unresolved human threads       |
| Jira          | ✅     | RHOAIENG-12345 — active          |
| Test Coverage | ✅     | 3 test files changed             |
| PR Body       | ⚠️     | 2/5 checklist unchecked          |

Verdict: NOT READY — 1 failing check
```

## Step 4: Fix

If `--fix` was passed, proceed directly.

If no `--fix` flag, use AskUserQuestion:
- "Fix failing checks"
- "Done — just wanted the report"

If fixing:

1. **Rebase** if conflicts found. Don't push.
2. **Review fixes** — PR: invoke `coderabbit-autofix` (decline commit/push), then fix human threads. Local: fix issues from Step 2 review.
3. **CI/lint/test fixes** — fix specific errors in files changed by this branch. Don't auto-format directories. Don't fix pre-existing issues.
4. **Cleanup** — `/simplify` on changed files, lint those files. Skip if nothing changed.
5. **Commit** — one commit, descriptive message, `Co-Authored-By` + `Signed-off-by`. Never push.

After fixing, run lint and type-check on changed files to verify. Print updated table — ⏭️ checks keep original status (nothing pushed), local checks get updated.
