---
description: Pull request creation guidelines for odh-dashboard — must use PR template
globs: 
alwaysApply: false
---

# Pull Request Creation

When creating a pull request targeting `opendatahub-io/odh-dashboard`, use `.github/pull_request_template.md` and fill every **required** section (Problem, Solution, Evidence) using the instruction footer in that file. This rule does not apply to PRs targeting other repositories.

The PR **description** is the **sole source of truth** for review: put goals, constraints, and proof there; do not rely on Jira, chat, or comments as substitutes. If a thread changes the ask or a rebuttal, fold it into this description. A linked Jira is still evaluated for alignment — justify any departure in the description. Keep the description present-tense and current with the branch head.

## Agent-Specific Guidance

- **Use the template shape.** Keep the empty headings; uncomment the top `Fixes:` comment when there is a tracker link; uncomment `## Justifications` only when needed.
- **Substance over placeholders.** Fill Problem, Solution, and Evidence with real content — no TBD or placeholder text.
- **Evidence must be reproducible.** Include the steps you took, not only the outcome. Call out automated coverage that protects the change, or briefly explain when new tests are not appropriate. For UI or flow changes, attach or link screenshots, GIFs, and/or video. Redact tokens, passwords, and cluster credentials.
- **No bare summaries.** Never skip the template and use a plain paragraph as the PR description. Reviewers expect the Problem / Solution / Evidence structure.
