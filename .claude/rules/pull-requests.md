# Pull Request Creation

When creating a pull request targeting `opendatahub-io/odh-dashboard`, you **MUST** use the PR template at `.github/pull_request_template.md` as the PR body structure. Read the template, fill in every section following the HTML comment instructions within it, and include the full checklist. This rule does not apply to PRs targeting other repositories.

## Agent-Specific Guidance

- **Honesty over completeness.** Only check `[x]` checklist items you can substantiate. If you didn't add tests, leave that box unchecked and explain why in the Test Impact section. If you only ran automated checks (lint, type-check), do not check "manually tested."
- **Post-merge items stay unchecked.** The "After the PR is posted & before it merges" items are human tasks — leave them as `[ ]`.
- **UI section is conditional.** If the change has no UI impact, omit the "If you have UI changes" checklist items entirely rather than leaving them unchecked.
- **No bare summaries.** Never skip the template and use a plain paragraph as the PR body. Reviewers expect the full structure.
