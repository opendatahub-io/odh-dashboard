---
description: Pull request creation guidelines for odh-dashboard — must use PR template
globs: 
alwaysApply: false
---

# Pull Request Creation

When creating a pull request targeting `opendatahub-io/odh-dashboard`, use `.github/pull_request_template.md` and fill every **REQUIRED** section from its HTML comment instructions. This rule does not apply to PRs targeting other repositories.

The PR description is the **sole source of truth** for review: put goals, constraints, and proof in the body; do not rely on Jira, chat, or comments as substitutes. A linked Jira is still evaluated for alignment with the description — justify any departure in the body. Keep the body present-tense and current with the branch head.

## Agent-Specific Guidance

- **Substance over placeholders.** Fill Problem, Solution, and Evidence with real content. Drop unused optional content (including Justifications when it does not apply) — no TBD or placeholder text.
- **Evidence must be reproducible.** Include the steps you took, not only the outcome. Call out automated coverage that protects the change, or briefly explain when new tests are not appropriate. For UI or flow changes, attach or link screenshots, GIFs, and/or video.
- **No bare summaries.** Never skip the template and use a plain paragraph as the PR body. Reviewers expect the Problem / Solution / Evidence structure.
