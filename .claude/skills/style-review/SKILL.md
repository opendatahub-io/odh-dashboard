---
name: style-review
description: Review code for custom styling convention violations in ODH Dashboard against css-patternfly.md rules. Checks PF priority order, wrapper compliance, and class naming conventions. Use when asked to review code, audit styling, or review a PR for convention compliance.
---

# Style Convention Review — ODH Dashboard

Audits custom styling changes against the project's conventions. The core principle is that custom CSS should be the last resort — the entire mod-arch-shared and theme-aware component system exists to avoid it. When custom styles do appear, this review checks they followed the right process.

## Inputs

The user may provide:

- **No arguments** — review files changed versus `main` by running `git diff main --name-only -- '*.scss' '*.css' '*.tsx'`, **excluding** any `**/upstream/**` paths.
- **A file or directory path** — review only those files (still exclude `**/upstream/**` paths).
- **A PR number (`#N`)** — run `gh pr diff N` to get changed files and review only those (skip any paths under `upstream/`).
- **A branch name** — validate the branch ref matches `^[A-Za-z0-9._/][A-Za-z0-9._/-]*$` (anchored, no leading hyphens, no whitespace or shell metacharacters), then resolve it with `git rev-parse --verify <branch>` before use; if it resolves cleanly, run `git diff "main...<branch>" -- '*.scss' '*.css' '*.tsx'` using the validated ref and filter out any `upstream/` paths from the results.

## Phase 1: Load reference data

1. `.claude/rules/css-patternfly.md` — priority order, token rules, wrapper components, class naming. **The "Priority order" section is the core rule for Check 1; the "PF Wrapper Components" section is the reference for Check 2; the "Custom Class Naming" section is the reference for Check 3.**

## Phase 2: Run checks

### Check 1: PF priority order — was custom styling necessary?

This is the most important check. The priority order from `css-patternfly.md` exists because the dashboard uses PatternFly components and mod-arch-shared wrappers as the primary styling system. Custom SCSS or inline styles should only appear when PF genuinely cannot do it.

For every custom SCSS block or inline style introduced, verify the **"Priority order"** from `css-patternfly.md` was followed.

Flag SCSS or inline styles where a PF prop, layout component, or utility class would have been sufficient. For SCSS that IS appropriate (step 4), also flag any hardcoded values that should be PF tokens.

**If PF genuinely cannot do it:** flag as Info in the report. Do NOT create GitHub issues, Jira tickets, or modify source files — only report the gap. The report entry should recommend the developer:

1. Open a PF upstream issue describing the gap
2. Open a RHOAIENG follow-up Jira linking it
3. Add a tracking comment above the custom style, e.g.:

```scss
// TODO: PF gap — remove when https://github.com/patternfly/patternfly/issues/XXXX is resolved
// RHOAIENG follow-up: https://issues.redhat.com/browse/RHOAIENG-XXXXX
```

### Check 2: PF wrapper component compliance

Flag raw PatternFly components where the project's wrappers should be used instead. These wrappers encapsulate theme-aware behavior and shared patterns — bypassing them means the component won't behave correctly in all themes.

Use the wrapper mapping table in the **"PF Wrapper Components"** section of `.claude/rules/css-patternfly.md` as the authoritative reference.

**Detection procedure for each TSX file:**

1. Parse the file's import declarations. For each import, record the specifier names and the source module (e.g. `import { FormSection } from '@patternfly/react-core'`).
2. Only consider imports whose source starts with `@patternfly/` (e.g. `@patternfly/react-core`, `@patternfly/react-table`).
3. For each wrapper entry in the mapping table, check whether the PF component name appears as an import specifier from a `@patternfly/*` source in this file. If it does, and the JSX tree uses that imported identifier, flag it.
4. **Skip the wrapper's own implementation file** — do not flag the file that defines the project wrapper itself (e.g. `components/pf-overrides/FormSection.tsx` legitimately imports PF `FormSection`).

### Check 3: Custom class naming convention

Scan SCSS and TSX files for custom CSS class names. Use the **"Custom Class Naming"** section of `css-patternfly.md` as the authoritative reference for naming conventions. Ignore PF classes (`pf-v6-*`, `pf-v5-*`, `pf-c-*`, `pf-m-*`).

Flag class names where:

- **Missing required prefix** — block-level class has no namespace prefix per the location rules in `css-patternfly.md`.
- **Wrong BEM separator** — element uses single underscore or hyphen instead of double underscore (`__`).
- **Non-standard modifier** — uses `--modifier` or `is-modifier` instead of `m-{modifier}` / `{prefix}-m-{modifier}`.
- **Non-standard utility** — uses an unprefixed utility name instead of `{prefix}-u-{name}`.

## Phase 3: Generate report

```md
## Convention Review — ODH Dashboard

### Summary
- Files reviewed: N
- Violations found: N
- By severity: N critical, N warning, N info

### Critical (must fix)
### Warning (should fix)
### Info (PF gap — developer follow-up needed)

---

**[SEVERITY] Check N: Description**
- File: `path/to/file.scss`
- Line: NN
- Found: `the problematic code`
- Fix: `the corrected code`
- Why: Brief explanation referencing the specific rule

For each Info finding, include a **Developer action** block:
- [ ] Open a PatternFly upstream issue at https://github.com/patternfly/patternfly/issues describing the gap
- [ ] Open a RHOAIENG Jira linking the PF issue
- [ ] Add a tracking comment above the custom style (see template in Check 1)
```

### Severity classification

| Severity | Criteria |
|---|---|
| Critical | Hardcoded tokenizable values in SCSS or inline styles where PF tokens exist (e.g., colors, spacing, sizing, typography, radii) |
| Warning | Custom SCSS/inline styles where a PF prop, layout component, or utility class would suffice; missing wrapper where one clearly applies; custom class name that doesn't follow the naming convention |
| Info | Genuine PF gap — report the gap and recommend the developer open a PF upstream issue and RHOAIENG follow-up (do not create them) |

If there are no violations, confirm the files pass and note any well-structured patterns worth preserving.
