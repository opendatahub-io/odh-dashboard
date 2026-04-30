---
name: preflight
description: "Pre-merge readiness check for a PR or local branch. Gathers context, runs reviews and checks, reports a results table. Interactive by default — asks what to review and whether to fix. Supports flags: --fix, --local, --review coderabbit,claude,style, --help."
argument-hint: "[PR] [--fix] [--local] [--review coderabbit,claude,style] [--help]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(npm *) Bash(npx *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Preflight

Pre-merge readiness check. Gather context, review code, run checks, report results. Interactive by default — asks the user before making decisions. Never skip a check silently.

Never push. Never comment on the PR.

## --help

If `$ARGUMENTS` is `--help`, print the following and stop:

```
/preflight [PR] [flags]

  PR number or URL      Check a specific PR (optional — auto-detects from branch)
                        If no PR exists, runs in local mode automatically.

Flags:
  --fix                 Fix failing checks after reporting
  --local               Ignore PR even if one exists, run everything locally
  --review X,Y          Run specific reviewers without asking
                        Options: coderabbit, claude, style
  --help                Show this help

Examples:
  /preflight                                  Check current branch (auto-detect PR)
  /preflight 1234                             Check PR #1234
  /preflight --fix                            Check and fix current branch
  /preflight --review coderabbit,style        Run specific reviewers
  /preflight 1234 --review claude --fix       Check PR, run Claude review, fix issues

How it works:
  1. Gather    Detect PR, sync status, affected packages, Jira key
  2. Review    Fetch PR reviews or run local reviewers (interactive)
  3. Check     Run all checks, print results table (read-only)
  4. Fix       Optionally fix failing checks (--fix or interactive)
```

## Flags

Parse these from `$ARGUMENTS` before processing:
- `--fix` — after reporting, fix failing checks without asking
- `--local` — ignore PR even if one exists, run everything locally
- `--review X,Y` — run specific reviewers without asking (options: `coderabbit`, `claude`, `style`)
- `--help` — print usage and stop
- No flags — interactive mode: ask the user what to do at decision points

## Step 0: Prerequisites

Before doing anything, verify required tools are available:

```bash
which gh jq git 2>/dev/null
```

- `gh` — required for PR checks, CI status, review threads
- `jq` — required by all scripts
- `git` — required for branch/diff operations

If any are missing, stop and tell the user what to install. These are non-negotiable — the skill can't function without them.

Optional tools (check but don't block):
- `coderabbit` — needed only if user selects CodeRabbit review
- `npm` / `npx` — needed only for local lint/type-check/test runs

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
pr_sha=$(gh pr view "$pr_number" --json headRefOid --jq '.headRefOid')
local_sha=$(git rev-parse HEAD)
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
grep -oE '[A-Z][A-Z0-9]+-[0-9]+' <<< "$pr_title $pr_body" | head -1 || git branch --show-current | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | head -1
```

Print a context summary:
```
Preflight — PR #1234: feat: add new feature (synced ✅)
```
or
```
Preflight — local branch: fix/RHOAIENG-14618 (no PR)
```

## Step 2: Review

If a PR exists and is synced, fetch existing reviews:
```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```
Report what's there — CodeRabbit threads with severity, human threads, review decision.

If no PR exists, or PR exists but is not synced, or `--local`: no reviews have been done on this code yet. Ask the user what reviewer to run:

If `--review` flag was passed, use those reviewers directly. Otherwise use AskUserQuestion with `multiSelect: true` so the user can pick any combination:
- "CodeRabbit CLI" — run `coderabbit review --agent` (requires CLI installed)
- "Claude review" — invoke `/review` built-in skill
- "Style review" — invoke `/style-review` for code style and pattern checks
- "Skip review" — no review

Run whichever the user picks. If a reviewer fails (e.g. CR CLI not installed or errors), report the failure clearly — don't silently fall back to something else.

## Step 3: Check

**This step is read-only. Do not fix, edit, or modify any files during checks.** Just run the checks, record the results, and report them. All fixes happen in Step 4.

Read [references/checks.md](references/checks.md) for the full list of checks and how to run each one in each context (PR synced, PR not synced, no PR).

Statuses:
- ✅ passed · ❌ failed · ⚠️ warning · ⏭️ covered by CI (same commit) · ➖ not applicable

⏭️ means CI ran this on the exact same commit. If a check can't run (OOM, missing tool), that's ❌ or ⚠️ — never ⏭️. If a check doesn't apply (no PR body because no PR), use ➖.

Print a results table with every check, its status, and details. End with a verdict: any ❌ → **NOT READY**, all ✅ with ⚠️ → **READY WITH WARNINGS**, all ✅ → **READY**.

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
