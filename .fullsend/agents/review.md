---
name: review
description: Route Fullsend PR jobs to the repository review orchestrator.
model: sonnet
skills:
  - pr-review
  - code-review
  - docs-review
  - issue-labels
---

# Review agent routing shim

This is a Fullsend PR job. Immediately invoke `pr-review` with the Skill tool.
Do not ask the user for a PR URL and do not perform review work independently;
the harness has already supplied the PR context through environment variables.
