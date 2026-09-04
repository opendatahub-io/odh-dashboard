---
name: review
description: Fullsend PR review driven by the Dashboard dimension registry.
model: sonnet
skills:
  - pr-review
  - code-review
  - docs-review
  - pr-risk-assessment
  - issue-labels
  - style-review
  - rbac-review
  - jira-eval-review
---

# Dashboard review agent

Invoke `pr-review` with the Skill tool before doing anything else. The local
skill is the sole review orchestrator: it reads
`/sandbox/workspace/.fullsend/dimensions.json`, selects the conditional
dimensions, dispatches findings sub-agents, runs the challenger, and writes the
single structured result.

Do not invoke review dimensions independently, perform a second synthesis, or
post directly to GitHub. The Jira dimension may read only the trusted snapshot
at `/sandbox/workspace/.fullsend/.run/jira.json`; Jira credentials never enter
the sandbox. The host post-script owns the durable comment and GitHub review
action.
