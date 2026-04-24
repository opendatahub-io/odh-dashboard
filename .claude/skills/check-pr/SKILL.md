---
name: check-pr
description: "Read-only merge readiness check for a PR. Aggregates status from GitHub, CI, CodeRabbit, and Jira — runs 6 gates (conflicts, CI, reviews, Jira, tests, PR body) and produces a pass/fail/warn report."
argument-hint: "[PR number or URL]"
disable-model-invocation: true
allowed-tools: Bash(gh *) Bash(git *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Check PR — Merge Readiness Report

Evaluate whether a PR is ready to merge. Produces a structured report with pass/fail/warn for each gate. This skill is read-only — it never modifies code, commits, or pushes.

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
- Key found → verify it exists. If `JIRA_TOKEN` is set, fetch the issue via Jira REST API or the Jira MCP tool to check:
  - Issue exists → **PASS**
  - Issue is Closed/Done → **WARN** — linked issue is already resolved
  - No description → **WARN**
  - No assignee → **WARN**
- If `JIRA_TOKEN` is not set and no Jira MCP is available → **WARN** ("Jira validation skipped — no credentials available"). The Jira key was found in the PR body, so linkage passes, but the issue details can't be verified.

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

## Report

```
╔══════════════════════════════════════════════════════════════╗
║  Merge Readiness — PR #<N>                                 ║
║  <title>                                                   ║
╠═══════════════════════╤════════╤════════════════════════════╣
║  Gate                 │ Status │ Details                    ║
╠═══════════════════════╪════════╪════════════════════════════╣
║  1. Conflicts         │  ___   │                            ║
║  2. CI                │  ___   │                            ║
║  3. Reviews           │  ___   │                            ║
║  4. Jira              │  ___   │                            ║
║  5. Tests             │  ___   │                            ║
║  6. PR Body           │  ___   │                            ║
╠═══════════════════════╪════════╪════════════════════════════╣
║  Verdict              │  ___   │                            ║
╚═══════════════════════╧════════╧════════════════════════════╝
```

Verdict:
- Any FAIL → **NOT READY** + list blocking issues
- All PASS, some WARN → **READY WITH WARNINGS** + list warnings
- All PASS → **READY TO MERGE**
