---
name: check-pr
description: "Read-only merge readiness check for a PR. Evaluates conflicts, CI, review status, Jira adherence, test coverage, PR body health, code style, and assigns a priority tier (1-4). Use when user says check PR, is this ready to merge, PR readiness, review PR status, check this PR, or wants a gate/report before merging."
argument-hint: "[PR number or URL]"
allowed-tools: Bash(gh *) Bash(git *) Bash(${CLAUDE_SKILL_DIR}/scripts/*)
---

# Merge Queue — PR Readiness Check

Read-only assessment of whether a PR is ready to merge. Produces a report with pass/fail/warn for each gate and a priority tier classification. **Does not modify any code or push any changes.**

## Resolve the PR

1. If `$ARGUMENTS` contains a PR number or URL, extract the number.
2. Otherwise detect from current branch:
   ```bash
   gh pr list --head "$(git branch --show-current)" --state open --json number --jq '.[0].number'
   ```
3. If no PR found, ask the user.

Fetch metadata:
```bash
pr_json=$(gh pr view "$pr_number" --json title,headRefName,baseRefName,mergeable,mergeStateStatus,number,body,author,labels,additions,deletions,changedFiles,reviewDecision)
pr_title=$(echo "$pr_json" | jq -r '.title')
base_branch=$(echo "$pr_json" | jq -r '.baseRefName')
pr_body=$(echo "$pr_json" | jq -r '.body')
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
```

Print: `Merge readiness check for PR #<N>: <title>`

## Gate 1: Merge Conflicts

```bash
echo "$pr_json" | jq -r '.mergeable'
```

- `MERGEABLE` → PASS
- `CONFLICTING` → FAIL — "PR has merge conflicts. Rebase onto `$base_branch` required."
- `UNKNOWN` → WARN — "GitHub hasn't computed merge status yet. Retry in a moment."

Also check if branch is behind:
```bash
git fetch origin "$base_branch" --quiet
git rev-list --count HEAD..origin/$base_branch
```
If > 0: WARN — "Branch is N commits behind `$base_branch`. Rebase recommended."

## Gate 2: CI Status

```bash
gh pr checks "$pr_number" --json name,bucket,link --jq '[.[] | {name, bucket, link}]'
```

- All `bucket == "pass"` → PASS
- Any `bucket == "fail"` → FAIL — list failed check names with links
- Any `bucket == "pending"` → WARN — "N checks still running"
- Any `bucket == "cancel"` → WARN — "N checks cancelled"

## Gate 3: Review Status

### 3a: GitHub review decision

```bash
echo "$pr_json" | jq -r '.reviewDecision'
```

- `APPROVED` → PASS
- `CHANGES_REQUESTED` → FAIL
- `REVIEW_REQUIRED` → WARN — "No approvals yet"
- `null` or empty → WARN — "No required reviewers configured"

### 3b: Unresolved review threads

Use the fetch-review-threads script from maintain-pr:

```bash
threads=$(bash "$(dirname ${CLAUDE_SKILL_DIR})"/maintain-pr/scripts/fetch-review-threads.sh "$owner" "$repo" "$pr_number")
```

Count and categorize:
- **CodeRabbit blocker/critical/major** (`is_coderabbit == true`): extract severity from comment body. Any CRITICAL or MAJOR → FAIL.
- **Human unresolved threads** (`is_coderabbit == false`): any unresolved → FAIL.
- **CodeRabbit minor/info only**: WARN — "N minor suggestions unresolved"
- No unresolved threads → PASS

## Gate 4: Jira Adherence

Extract Jira issue key from PR title or body:
```bash
jira_key=$(echo "$pr_title $pr_body" | grep -oE '[A-Z]+-[0-9]+' | head -1)
```

- No Jira key found → FAIL — "No Jira issue referenced in PR title or body"
- Key found → fetch the issue and its hierarchy:

```bash
${CLAUDE_SKILL_DIR}/scripts/fetch-jira-tree.sh "$jira_key"
```

This returns the issue, its parent chain, and a computed tier. Check:
- Issue exists (no error in output) → PASS for linkage
- Issue status is not `Closed` or `Done` → PASS (still active)
- Issue has a description (`has_description == true`) → PASS
- Issue has an assignee → PASS (or WARN if unassigned)

Save the output — it's reused in Gate 8 for tier classification.

## Gate 5: Test Coverage

Check if the PR includes test files:

```bash
gh pr diff "$pr_number" --name-only | grep -E '\.(test|spec|cy)\.(ts|tsx|js|jsx)$'
```

Also check the PR body for test explanation:
- PR has test file changes → PASS
- PR body mentions testing in "Test Impact" section → PASS
- Neither → WARN — "No test files changed and no test explanation in PR body"

For non-code PRs (docs, config only), skip this gate.

## Gate 6: PR Body Health

Check the PR body against the template requirements:

1. **Description section**: `## Description` present with content (not just template comments) → PASS / FAIL
2. **Testing section**: `## How Has This Been Tested?` present with content → PASS / FAIL
3. **Test Impact section**: `## Test Impact` present with content → PASS / FAIL
4. **Checklist items**: count checked `- [x]` vs unchecked `- [ ]` boxes
   - All checked → PASS
   - Some unchecked → WARN — "N/M checklist items unchecked"
   - No checklist at all → FAIL
5. **Jira link**: issue URL like `https://issues.redhat.com/browse/` present → PASS / FAIL
6. **Screenshots** (if UI change): check for image links when PR touches `.tsx`/`.css` files → WARN if missing

## Gate 7: Code Style Review

This is an agentic check — read the changed files and assess:

```bash
gh pr diff "$pr_number"
```

Scan for:
- Large files (> 500 line changes in a single file) → WARN
- Console.log / debug statements left in → WARN
- TODO/FIXME/HACK comments added → WARN
- Inline styles in React components (should use CSS modules or PatternFly) → WARN
- Any `eslint-disable` or `ts-ignore` added → WARN
- Import of deprecated APIs → WARN

Report each finding with file and line. This gate is WARN-only, never FAIL.

## Gate 8: PR Tier Classification

Classify the PR's priority tier based on its Jira issue hierarchy. See [tier-definitions.md](references/tier-definitions.md) for full definitions.

Use the output from Gate 4's `fetch-jira-tree.sh` call (already fetched). If no Jira key was found, this is Tier 4.

The script walks the parent chain (issue → epic → initiative → RFE/strategy) and computes the tier automatically:

```json
{
  "issue": {"key": "RHOAIENG-12345", "type": "Story", "priority": "Major", ...},
  "hierarchy": [
    {"key": "RHOAIENG-12345", "type": "Story"},
    {"key": "RHOAIENG-100", "type": "Epic"},
    {"key": "RHOAIENG-50", "type": "Initiative"}
  ],
  "hierarchy_path": "Story > Epic > Initiative",
  "tier": 2,
  "tier_reason": "Linked to Initiative via: Story > Epic > Initiative"
}
```

Display the tier with rationale from the script output:
```
Tier: <tier> (<Strategic/Critical/Standard/Untracked>)
Rationale: <tier_reason>
Hierarchy: <hierarchy_path>
```

Tier labels: 1=Strategic, 2=Critical, 3=Standard, 4=Untracked

## Report

Produce a summary table:

```
╔══════════════════════════════════════════════════════════════╗
║  Merge Readiness Report — PR #<N>                          ║
║  <PR title>                                                ║
║  Tier: <1-4> (<Strategic/Critical/Standard/Untracked>)     ║
╠══════════════════════════════════════════════════════════════╣
║  Gate                 │ Status │ Details                    ║
╠═══════════════════════╪════════╪════════════════════════════╣
║  Merge Conflicts      │ PASS   │ Clean, up to date         ║
║  CI Status            │ FAIL   │ Lint failed (link)        ║
║  Reviews              │ WARN   │ 2 minor CR suggestions    ║
║  Jira Adherence       │ PASS   │ RHOAIENG-12345 (active)   ║
║  Test Coverage        │ PASS   │ 3 test files changed      ║
║  PR Body Health       │ WARN   │ 2/5 checklist unchecked   ║
║  Code Style           │ WARN   │ 1 console.log found       ║
╠═══════════════════════╪════════╪════════════════════════════╣
║  Overall              │ FAIL   │ 1 blocking gate           ║
╚══════════════════════════════════════════════════════════════╝

Blocking issues:
1. CI: Lint check failed — https://github.com/...

Warnings:
1. Reviews: 2 minor CodeRabbit suggestions unresolved
2. PR Body: Checklist items 3, 5 unchecked
3. Style: console.log at src/app/pages/Foo.tsx:42
```

### Verdict

- Any FAIL gate → **NOT READY** — list blocking issues
- All PASS, no WARN → **READY TO MERGE**
- All PASS, some WARN → **READY WITH WARNINGS** — list warnings
