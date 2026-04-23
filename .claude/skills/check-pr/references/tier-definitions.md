# PR Tier Definitions

Classification of PRs by strategic alignment, derived from Jira issue hierarchy.

## Hierarchy

```
RFE / Strategy
  -> Initiative (top-level strategic goal)
    -> Epic (deliverable body of work)
      -> Story / Task / Bug (individual work items)
        -> PR (code change)
```

## Tier 1 — Strategic / Blocker

PR is linked to a Jira issue that meets ANY of:
- Issue is a child of an Epic that is a child of an RFE or Strategy
- Issue has priority = Blocker
- Issue has `fix_version` or `target_version` set for an upcoming release
- Issue type is RFE itself

These are the highest-priority PRs — directly tied to strategic delivery or release-blocking.

## Tier 2 — Critical / Initiative-aligned

PR is linked to a Jira issue that meets ANY of:
- Issue has priority = Critical
- Issue is a child of an Epic that is a child of an Initiative (but not RFE/Strategy)
- Issue is tagged with a specific component that maps to a key deliverable

These are important PRs that support tracked initiatives.

## Tier 3 — Standard work

PR is linked to a Jira issue that:
- Has a legitimate issue type (Bug, Story, Task)
- Is NOT linked to an Epic or Initiative
- Has priority = Major or lower
- Has a clear description and acceptance criteria

These are normal maintenance, bug fixes, or stories not tied to strategic goals.

## Tier 4 — Untracked

PR meets ANY of:
- No Jira issue linked
- Jira issue has no Epic parent
- Jira issue has no description or vague summary
- PR body doesn't reference any issue tracker

These are "vibe coded" PRs — potentially valuable but not tracked in any roadmap.

## How to determine tier

1. Extract Jira issue key from PR body (e.g., `RHOAIENG-12345`)
2. Fetch the issue via Jira API
3. Check issue priority (Blocker → Tier 1, Critical → Tier 2)
4. Check parent: `issue.fields.parent` gives the Epic
5. Check Epic's parent: fetch Epic, check its parent for Initiative/RFE
6. Check `fixVersions` and `customfield_*` for target versions
7. If no Jira link at all → Tier 4
