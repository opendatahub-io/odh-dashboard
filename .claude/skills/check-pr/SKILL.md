---
name: check-pr
description: "Read-only merge readiness check for a PR. Runs 8 gates — conflicts, CI, reviews, Jira, tests, PR body, code style, and priority tier — then produces a pass/fail/warn report."
argument-hint: "[PR number or URL]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Check PR — Merge Readiness Report

Evaluate whether a PR is ready to merge. Produces a structured report with pass/fail/warn for each gate and a Jira-based priority tier. This skill is read-only — it never modifies code, commits, or pushes.

## Resolve the PR

```bash
pr_data=$(${CLAUDE_SKILL_DIR}/scripts/resolve-pr.sh "$ARGUMENTS")
```

Extract `pr_number`, `owner`, `repo`, `pr_title`, `base_branch`, `body`, `reviewDecision` from the JSON output. If the script errors, ask the user for the PR number.

## Gate 1: Merge Conflicts

Read `mergeable` from pr_data:

- `MERGEABLE` → **PASS**
- `CONFLICTING` → **FAIL** — needs rebase
- `UNKNOWN` → **WARN** — GitHub hasn't computed status yet

Also check if behind:
```bash
git fetch origin "$base_branch" --quiet 2>/dev/null
git rev-list --count HEAD..origin/$base_branch 2>/dev/null || echo 0
```
If > 0: **WARN** — branch is N commits behind, rebase recommended.

## Gate 2: CI Status

```bash
gh pr checks "$pr_number" --json name,bucket,link --jq '[.[] | {name, bucket, link}]'
```

- All `pass` → **PASS**
- Any `fail` → **FAIL** — list names with links
- Any `pending` → **WARN** — N checks still running
- Any `cancel` → **WARN** — N checks cancelled

## Gate 3: Review Status

### GitHub review decision

Read `reviewDecision` from pr_data:
- `APPROVED` → **PASS**
- `CHANGES_REQUESTED` → **FAIL**
- `REVIEW_REQUIRED` → **WARN**
- empty/null → **WARN** — no required reviewers configured

### Unresolved review threads

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number"
```

Categorize the results:
- CodeRabbit threads with CRITICAL or MAJOR severity → **FAIL**
- Any unresolved human threads → **FAIL**
- CodeRabbit minor/info only → **WARN**
- No unresolved threads → **PASS**

To extract severity from a CodeRabbit comment, look for the `_<emoji> <Level>_` pattern in the first line of `first_comment`.

## Gate 4: Jira Adherence

Extract the Jira key from the PR title and body. Look for the `RHOAIENG-\d+` pattern specifically (the project key for this repo):

```bash
jira_key=$(echo "$pr_title $pr_body" | grep -oE 'RHOAIENG-[0-9]+' | head -1)
```

If no key found, also check for a `issues.redhat.com/browse/` URL in the body.

- No Jira reference → **FAIL**
- Key found → fetch the hierarchy:

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-jira-tree.sh "$jira_key"
```

If `JIRA_TOKEN` is not set, this gate becomes **WARN** ("Jira check skipped — JIRA_TOKEN not set") instead of failing. The script exits with an error message in this case.

When it succeeds, check:
- Issue exists → **PASS**
- Issue is Closed/Done → **WARN** — linked issue is already resolved
- No description → **WARN**
- No assignee → **WARN**

Save the output for Gate 8.

## Gate 5: Test Coverage

```bash
gh pr diff "$pr_number" --name-only
```

Check if the changed files include test files (`.test.`, `.spec.`, `.cy.`):
- Test files changed → **PASS**
- No test files but PR body has content under "Test Impact" section → **PASS**
- Neither → **WARN**

Skip this gate entirely if the PR only touches non-code files (markdown, yaml, config).

## Gate 6: PR Body Health

Check the PR body against the repo's template (`.github/pull_request_template.md`):

1. `## Description` section has real content (not just HTML comments from template) → pass/fail
2. `## How Has This Been Tested?` has content → pass/fail
3. `## Test Impact` has content → pass/fail
4. Checklist: count `- [x]` vs `- [ ]` — report ratio
5. Jira URL (`issues.redhat.com/browse/`) present → pass/fail
6. If PR touches `.tsx`/`.css`/`.scss` files, check for image/gif links → warn if missing

Overall: **FAIL** if Description is empty, **WARN** for other missing sections.

## Gate 7: Code Style

```bash
${CLAUDE_SKILL_DIR}/scripts/scan-style.sh "$pr_number"
```

The script scans added lines in the diff for common issues (console.logs, eslint-disables, inline styles, TODOs, large file changes) without loading the full diff into context.

This gate is **WARN-only** — style issues don't block merging but should be called out. Report each finding with file and line.

## Gate 8: PR Tier

Uses the Jira hierarchy from Gate 4. If Gate 4 was skipped (no token) or no Jira key found, this is Tier 4.

The `fetch-jira-tree.sh` script already computes the tier. Read `tier` and `tier_reason` from its output. See [tier-definitions.md](references/tier-definitions.md) for what each tier means.

Display:
```
Tier: <N> (<label>)
Rationale: <tier_reason>
Hierarchy: <hierarchy_path>
```

Labels: 1=Strategic, 2=Critical, 3=Standard, 4=Untracked

## Report

```
╔══════════════════════════════════════════════════════════════╗
║  Merge Readiness — PR #<N>                                 ║
║  <title>                                                   ║
║  Tier: <N> (<label>)                                       ║
╠═══════════════════════╤════════╤════════════════════════════╣
║  Gate                 │ Status │ Details                    ║
╠═══════════════════════╪════════╪════════════════════════════╣
║  1. Conflicts         │  ___   │                            ║
║  2. CI                │  ___   │                            ║
║  3. Reviews           │  ___   │                            ║
║  4. Jira              │  ___   │                            ║
║  5. Tests             │  ___   │                            ║
║  6. PR Body           │  ___   │                            ║
║  7. Style             │  ___   │                            ║
╠═══════════════════════╪════════╪════════════════════════════╣
║  Verdict              │  ___   │                            ║
╚═══════════════════════╧════════╧════════════════════════════╝
```

Verdict:
- Any FAIL → **NOT READY** + list blocking issues
- All PASS, some WARN → **READY WITH WARNINGS** + list warnings
- All PASS → **READY TO MERGE**
