---
name: maintain-pr
description: "Fix up an open pull request so it's ready to merge. Rebases onto the base branch, addresses CodeRabbit and human review feedback, fixes CI failures, runs code quality checks, and creates a clean commit."
argument-hint: "[PR number or URL]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Maintain PR

Fix an open PR so it passes all checks and is ready for review/merge. Runs through rebase, review feedback, CI, code quality, and lint — then commits everything together.

## How this works

The skill runs 7 phases in order. Each phase can be skipped if there's nothing to do. Phases 5-6 only run if earlier phases actually changed files — reviewing the full PR diff for quality is expensive and not this skill's job.

After all phases, a single consolidated commit captures everything with proper attribution. The skill never pushes automatically.

## Resolve and check out the PR

```bash
pr_data=$(${CLAUDE_SKILL_DIR}/scripts/resolve-pr.sh "$ARGUMENTS")
```

This returns JSON with all PR metadata, owner, repo, and current branch. Extract what you need from it. If the script errors, ask the user for the PR number.

If the current branch doesn't match the PR branch, check out the PR:
- Check `git status --porcelain` first — if there's uncommitted work, warn and ask to stash.
- Use `gh pr checkout "$pr_number"` — this handles forks and stale local branches automatically.
- Don't use `git reset --hard` to switch branches. If a stale local branch blocks checkout, `git branch -D` it first.

## Phase 1: Rebase

Check the `mergeable` field from PR metadata:

- **CONFLICTING**: fetch and rebase onto the base branch, resolve conflicts file by file. Ask the user before force-pushing.
- **Behind but mergeable**: rebase to catch up. Ask before force-pushing.
- **Up to date**: move on.

## Phase 2: CodeRabbit review feedback

Invoke the `coderabbit-autofix` skill — it fetches unresolved CodeRabbit threads via GitHub's GraphQL API and walks through them.

```
Skill(coderabbit-autofix)
```

The autofix skill may ask to commit or push. Decline both — all changes get committed together in Phase 7. The reason: if we commit per-phase, the final commit history is messy and attribution gets split across multiple commits.

## Phase 3: Human review feedback

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```

Filter the output to threads where `is_coderabbit == false`. For each:

1. Read the file at the indicated lines to understand context
2. Check the thread replies — if the PR author already responded with a valid explanation, skip it
3. If a code change is warranted, apply the smallest fix that addresses the feedback
4. If only a discussion response is needed, note it for the summary

## Phase 4: CI failures

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-ci-failures.sh "$owner" "$repo" "$pr_number"
```

The script returns each failed job with its log tail. For each:

- **Lint or type-check errors**: fix the specific lines flagged. Only touch files this PR changed — pre-existing errors in the base branch aren't our problem, and auto-formatting entire directories creates cascading changes that trigger pre-commit hooks on unrelated code.
- **Test failures**: read the failure, check if the test or the code is wrong, fix whichever it is.
- **Build failures**: investigate and fix.
- **Flaky or infra failures** (network timeouts, runner OOM): note for the user but don't try to fix.

## Phase 5: Simplify

Skip if no files were changed in Phases 1-4 — there's nothing new to review.

```bash
git diff --name-only HEAD
```

If there are changes, invoke `/simplify` to catch quality issues in the code we just wrote:

```
Skill(simplify)
```

## Phase 6: Lint

Skip if no files were changed in Phases 1-5.

Lint only the specific files this skill modified:

```bash
git diff --name-only HEAD | grep -E '\.(js|ts|jsx|tsx)$'
```

Run eslint on those files individually. Fix issues with the Edit tool — don't use `eslint --fix` on broad paths. Run type-check and fix any new errors in files we touched.

## Phase 7: Commit

Skip if nothing changed across all phases.

Create one commit with all the fixes. Use the repo's trailer conventions:

```bash
git log --format='%b' -10 | grep -E 'Signed-off-by|Co-Authored-By' | head -3
```

Write a commit message that reflects what actually changed — not a generic "fix: address feedback". If you fixed a lint import, resolved a conflict, and addressed a review comment, say that.

```bash
git add <files-we-changed>
git commit -m "fix: <describe what changed>

Co-Authored-By: Claude <noreply@anthropic.com>
Signed-off-by: $(git config user.name) <$(git config user.email)>"
```

Don't push. Tell the user what was done and let them decide.

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
