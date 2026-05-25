# Step 1: Gather Context

Try to find a PR (unless `--local`):
- If a number/URL was given, use it
- Otherwise: `gh pr list --head "$(git branch --show-current)" --state open --json number --jq '.[0].number'`
- If found, fetch metadata: `gh pr view "$pr_number" --json title,headRefName,baseRefName,mergeable,mergeStateStatus,number,body,author,reviewDecision`

Get repo info:
```bash
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
```

**Check if local matches PR** (determines whether CI results are trustworthy):
```bash
pr_sha=$(gh pr view "$pr_number" --json headRefOid --jq '.headRefOid')
local_sha=$(git rev-parse HEAD)
has_changes=$(git status --porcelain)
```

If `pr_sha == local_sha` AND no uncommitted changes: **local is synced with PR**. CI results apply.
Otherwise: CI results don't apply — need to run checks locally.

Figure out base branch and affected packages:
```bash
# If PR exists, use gh (avoids merge-base issues in CI checkout):
gh pr diff "$pr_number" --name-only | cut -d'/' -f1-2 | sort -u
# If no PR, fall back to git:
git diff --name-only origin/${base_branch:-main} | cut -d'/' -f1-2 | sort -u
```

Extract Jira key from PR title/body, branch name, or recent commits:
```bash
grep -oE '[A-Z][A-Z0-9]+-[0-9]+' <<< "$pr_title $pr_body" | head -1 || git branch --show-current | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | head -1
```

**Efficiency:** Combine these into as few Bash calls as possible.
