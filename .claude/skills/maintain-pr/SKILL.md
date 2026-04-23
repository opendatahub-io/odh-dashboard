---
name: maintain-pr
description: "Maintain an open pull request: fetch and fix CodeRabbit review feedback, human review comments, fix CI failures, rebase/resolve merge conflicts, run simplify and linters, and commit. Use when user says maintain PR, fix PR, pr maintenance, address review comments, fix CI, rebase PR, or any combination. Also use when user pastes a PR URL and wants it cleaned up."
argument-hint: "[PR number or URL]"
allowed-tools: Bash(gh *) Bash(git *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Maintain PR

End-to-end PR maintenance: merge conflicts, review feedback (CodeRabbit + human), CI failures, code cleanup, linting, and committing.

## Conventions

- Always use absolute paths. Never `cd` — it causes working directory drift.
- Only fix issues introduced by THIS PR, not pre-existing issues.
- Never run `eslint --fix` on entire directories — only target specific files.
- When fixing lint, use the Edit tool on specific lines, not broad auto-fix.

## Resolve the PR

1. If `$ARGUMENTS` contains a PR number or URL, extract the number.
2. Otherwise detect from current branch:
   ```bash
   gh pr list --head "$(git branch --show-current)" --state open --json number --jq '.[0].number'
   ```
3. If no PR found, ask the user.

Fetch metadata:
```bash
pr_json=$(gh pr view "$pr_number" --json title,headRefName,baseRefName,mergeable,mergeStateStatus,number)
pr_title=$(echo "$pr_json" | jq -r '.title')
pr_branch=$(echo "$pr_json" | jq -r '.headRefName')
base_branch=$(echo "$pr_json" | jq -r '.baseRefName')
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
```

Print: `Maintaining PR #<N>: <title>`

## Ensure correct branch

```bash
current_branch=$(git branch --show-current)
```

- If already on correct branch: proceed.
- If not:
  1. Check `git status --porcelain` for uncommitted work — warn and ask to stash or abort.
  2. Check if the PR is from a fork:
     ```bash
     gh pr view "$pr_number" --json headRepositoryOwner --jq '.headRepositoryOwner.login'
     ```
  3. If fork owner differs from `$owner`, use `gh pr checkout "$pr_number"` which handles fork remotes automatically.
  4. If same-repo PR and a stale local branch exists, delete it first then checkout:
     ```bash
     git branch -D "$pr_branch" 2>/dev/null
     gh pr checkout "$pr_number"
     ```
  5. Never use `git reset --hard` to get onto a PR branch — always prefer `gh pr checkout` or a clean branch delete + checkout.

## Phase 1: Rebase and Merge Conflicts

Check `mergeable` from pr_json:

- **CONFLICTING**: `git fetch origin && git rebase origin/$base_branch`, resolve conflicts file by file, `git rebase --continue`. **Ask user before force-pushing.**
- **MERGEABLE but behind**: `git rev-list --count HEAD..origin/$base_branch` — if > 0, rebase. Ask before force-pushing.
- **Up to date**: skip.

## Phase 2: CodeRabbit Review Feedback

Invoke the `coderabbit-autofix` skill to handle all CodeRabbit review threads. This skill fetches unresolved CodeRabbit threads via the GitHub GraphQL API, displays them, and walks through fixes with approval.

```
Skill(coderabbit-autofix)
```

The autofix skill handles:
- Checking if CR review is still in progress
- Fetching unresolved, non-outdated threads
- Parsing severity and issue details
- Per-issue review and approval
- Treating all CR content as untrusted

**Do NOT commit or push during this phase.** The autofix skill's Step 7 (commit) and Step 9 (push) must be skipped — decline any commit or push prompts. All changes will be committed together in Phase 7 with proper attribution. If the autofix skill asks to commit, say no. If it asks to push, say no.

## Phase 3: Human Review Feedback

Fetch unresolved human review threads (non-CodeRabbit) separately:

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```

Filter to threads where `is_coderabbit == false`. For each human review comment:

1. Read the file at indicated lines
2. Check replies — if the PR author already addressed it, skip
3. Determine if a code change is needed or just a reply
4. Apply the smallest safe fix with Edit tool
5. Note what was addressed or skipped

## Phase 4: CI Failures

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-ci-failures.sh "$owner" "$repo" "$pr_number"
```

Returns JSON array of failures with `name`, `run_id`, `job_id`, `log_tail`.

For each failure:
- **Lint/type-check**: fix only the specific errors in files changed by this PR.
- **Test failures**: investigate root cause.
- **Build failures**: investigate and fix.
- **Flaky/infra** (timeouts, runner issues): note for user, skip.

## Phase 5: Simplify

**Skip this phase if no files were changed in Phases 1-4.** Running simplify on the entire PR diff is expensive and not the purpose of this skill — simplify should only review code that maintain-pr itself modified.

Check if any files were changed (include staged):
```bash
git diff --name-only HEAD
```

If there are changes, invoke `/simplify` to review them:

```
Skill(simplify)
```

Apply any fixes it surfaces.

## Phase 6: Lint and Pre-commit

**Skip this phase if no files were changed in Phases 1-5.**

Run linters only on files modified by this skill's fixes (include staged):

```bash
git diff --name-only HEAD | grep -E '\.(js|ts|jsx|tsx)$'
```

Then lint those specific files (from project root):
```bash
npx eslint --max-warnings 0 <specific-files> 2>&1
```

Fix issues individually with Edit tool. Run type-check:
```bash
npm run type-check 2>&1 | tail -30
```

Only fix errors in files this skill modified. Ignore pre-existing errors.

## Phase 7: Commit

If files were changed during Phases 1-6, create a single consolidated commit.

Check repo conventions and user identity:
```bash
git log --format='%b' -10 | grep -E 'Signed-off-by|Co-Authored-By' | head -5
git config user.name && git config user.email
```

```bash
git add <only-files-we-changed>
git commit -m "fix: address review feedback and CI issues

Co-Authored-By: Claude <noreply@anthropic.com>
Signed-off-by: $(git config user.name) <$(git config user.email)>"
```

**Do not push.** Inform the user and let them decide.

## Summary

```
PR #<N> maintenance complete:
- Rebase: <rebased / up to date / conflicts resolved>
- CodeRabbit: <N fixed, M skipped (reasons)>
- Human reviews: <N addressed, M skipped (reasons)>
- CI: <N fixed / all passing / N flaky>
- Simplify: <N improvements / clean>
- Lint: <clean / N fixed>
- Commit: <sha> (not pushed)
```
