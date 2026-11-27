---
name: test-impact-review
description: "Assess whether a pull request or local change has assurance-grade test impact: durable automation, efficient tier, deep testing evidence, and the visual proof the change requires. Use when reviewing test impact, automation sufficiency, test efficiency, visual evidence, or merge readiness."
argument-hint: "[PR number | path | branch]"
---

# Test Impact Review

Assurance-grade readiness check for how the change is tested. Scores **Automation**, **Efficiency**, **Evidence depth**, and **Visual evidence**. This is narrower than a test run and is a readiness check only (not a code-finding producer): it judges durable automation, tier/efficiency, and whether the available proof covers the change and protects feature integrity while those tests stay green. Available proof means author-supplied description evidence, committed automation in the diff, plus suites that required PR status checks run for the changed packages; this skill judges whether that combined proof is adequate for the actual changes.

## Invocation contract

This skill owns the test-impact criteria, the declared check ids, and the status mapping. A caller may provide an invocation meta-prompt that changes context acquisition, output format, and side-effect rules, but not these criteria. Without one, use the direct CLI defaults and return the Markdown report in [Report](#report).

## Inputs and direct CLI defaults

The caller may supply a PR body, changed paths, a base branch, and/or enough of the diff and relevant source/test files. Treat supplied values as authoritative.

Otherwise:

- With a PR number, fetch body and changed paths, then obtain enough of the diff and nearby tests to score applicable aspects:

```bash
gh pr view <PR> --json body --jq .body
gh pr diff <PR> --name-only
gh pr diff <PR>
```

- With a file or directory path, review that target and its nearby tests when identifiable. There is no PR body unless the caller provides one.
- With a branch name, validate and resolve it, then inspect `git diff main...<branch>` (names and content as needed).
- With no argument, use `git diff main` (names and content as needed).

**Required-CI suites are presumed to run and gate.** Unit tests, type checks, lint, and Cypress run under required PR status checks, so treat them as executed and gated — a scoring presumption, not a verified fact. Do not verify it, enumerate the workflows, infer additional coverage from tests that happen to exist in the tree, or fail, warn, or report “could not verify” because no caller supplied coverage information. The presumption covers only what those standard suites run; manual or cluster checks, scripts, and suites outside required CI still need author proof.

Do **not** pass Evidence depth from the test tree alone when the description omits testing proof — unless required-CI suites cover the change under the presumption above (see Evidence depth below).

When the caller supplies a Review context file, read the attached-image entries
it lists. Those paths are host-captured copies of images in the PR body and
thread; do not fetch external URLs. Direct CLI invocation has no such copies,
so visual proof cannot be inspected there — record that rather than assuming it.

## Review procedure

Classify changed paths (product code vs docs / manifests / generated / lockfiles / CI config). Then score the four aspects below. Evaluate substance in the PR body end-to-end (ignore HTML comments); testing proof may appear under any heading, but a heading alone is not enough.

**Do not** treat “a `.test.` / `.spec.` / `.cy.` file changed” as an automatic pass. **Do not** treat a substantive testing rationale in the PR description alone as an automatic pass — use it as input to Evidence depth.

### 1. Automation

Is there enough durable test automation for the future to cover the feature, including edge cases?

- Product-code changes that need automation but lack adequate coverage (including edge cases) → ❌, **unless** the PR description provides a **sufficient constraint justification** (see below) → ⚠️.
- Coverage present but thin / missing important edges → ⚠️.
- Adequate durable automation for the change → ✅.
- **➖** when there is no product behavior under test (e.g. docs-only, localization/translation strings, pure lockfile/manifest/generated with nothing sensible to unit- or mock-test). Do not require new test files for those heads.

**Constraint justification (Automation):** the author may explain in the PR body — typically under `## Evidence` alongside their other testing proof — why durable test automation could not or should not be added for this change (e.g. the surface is not automatable, the change is infrastructure/workflow-only with no testable behavior, or tests would provide no value for the specific type of change). A sufficient justification must state **which constraint** applies, **why** automation is inappropriate or impossible here, and **what alternative verification** exists. When sufficient, score ⚠️ (acknowledged waiver) instead of ❌ — never ✅, which would imply automation exists. Note in the Evidence cell that the score was adjusted based on the author's constraint justification.

### 2. Efficiency

Are tests written efficiently? Call out duplication. Prefer unit tests over Cypress mock. Reserve mock/e2e-style tests for flows or application-level testing, not isolated component-level checks.

- **Heavy Cypress dependence with little or no unit tests → ❌**, unless the PR description **explicitly justifies** that mix (why units are not appropriate and Cypress is the right tier) → ⚠️. The justification must explain which constraint makes unit tests inappropriate and why Cypress is the correct tier for this change. Note in the Evidence cell when the score was adjusted.
- Milder wrong-tier, duplication, or efficiency issues → ⚠️.
- Efficient tier mix for the change → ✅.
- **➖** when there is nothing to place on the pyramid (Automation is ➖; or there are no tests to evaluate for tier/efficiency — including when Automation is ❌ for missing coverage, or ⚠️ solely from a constraint justification with no tests present). Do not score Efficiency when the suite is empty, even if Automation was waived to ⚠️.

### 3. Evidence depth

Dig into available testing evidence (author-supplied and required-CI suites, plus related automation): does it sufficiently cover the changes that were made, and will feature integrity hold so long as those tests continue to pass?

- **Required-CI suites need no author call-out.** Treat them as proving themselves, per the [required-CI presumption](#inputs-and-direct-cli-defaults). Do not fail, warn, or report “could not verify” because the description does not restate that run, and never ask the author to paste CI output into prose. This skill does not inspect CI status or confirm the checks are green — the merge gate does that; do not add a CI row or caveat here.
- **Committed automation counts as runtime proof.** A unit, component, or Cypress test that drives the changed scenario and asserts the outcome is evidence depth even before it executes: read its steps and judge whether it covers the change. Do not downgrade because the test “has not run” locally or CI has not reported — required-CI status checks and the merge gate own execution. When such automation covers the flow, an author-reported manual check is optional and neither stronger nor additionally required.
- **Author-supplied proof is still required for what required CI cannot show:** cluster or manual checks, suites outside required CI, and test-quality judgments (see Automation and Efficiency). Missing proof for any of these stays ❌ as below.
- **Visual proof is scored by the [Visual evidence](#4-visual-evidence) aspect**, not here. `none` in that triage waives only the visual artifact; other Evidence depth proof may still be required.
- Testing proof **not called out in the PR description** → ❌, even when the tree already has good automation. Silent “tests exist in the tree” is not enough. Exception: suites covered by required CI, per the first bullet.
- Proof present but does not cover the changed behavior, or green tests would not protect integrity → ❌.
- Proof present but thin / partially matched to the change → ⚠️.
- Proof in the description adequately covers the change and supports integrity-while-green → ✅.
- **Still scored** for docs, manifests, lockfiles, CI config, and similar: require verification proof (install/deploy check, override rationale, etc.) that fits the change. Verification performed by required CI satisfies this where it covers the change, and for non-behavioral edits (localization strings, docs, formatting) an explicit scope statement such as “localization only; no behavior change” is sufficient. Otherwise the proof belongs in the description. Missing proof → ❌.
- **➖** only when no PR body is available (cannot evaluate description call-out). Do **not** mark the whole check ➖ merely because the head is docs/manifest/lockfile-only.

### 4. Visual evidence

Score the visual artifact this head requires, using the [visual-evidence triage](#visual-evidence-triage) below. Name the triage class in the summary so a reader can see why an artifact was or was not required.

- **Inspect attached images before crediting them.** When the change produces UI or visual behavior and the PR body or thread carries screenshots, open the local copies listed in the context file and judge whether they depict the changed behavior. A media link, filename, or caption alone is not evidence. If a listed image is missing, unreadable, or unrelated to the claim, do not credit it.
- Class `none` → ➖.
- The accepted artifact for the class is present and shows the change → ✅.
- The accepted artifact is missing → ⚠️. Absence alone is never ❌.
- An artifact is attached but does not show the change → ❌.
- An artifact is attached but cannot be inspected → `could-not-verify`, with `Could not verify image evidence: <detail>` in the summary.
- **Stills prove static state only.** A screenshot can show rendering, layout, and a selected state; it cannot demonstrate first paint, live OS or media-query transitions, interaction, or sequence. Do not let a still close a gap that needs a recording or an automated test.

### Visual-evidence triage

Decide what artifact could falsify this head before asking for one. Classify the change itself, not its file extension and not the package it lives in. The resulting class decides what this aspect requires and which status it may return.

**Gate:** could a visual artifact (still or recording) fail while every committed assertion that actually covers this change still passes? If no → `none`. If yes → choose `screenshot` or `recording` from the table. Mixed heads take the strongest class: `recording` > `screenshot` > `none`.

| Class | Qualifies when | Accepted artifact |
| --- | --- | --- |
| `screenshot` | CSS/SCSS, `className`, inline style, PatternFly token or theme, icon or asset swap; new or restructured DOM that changes flow (wrappers, layout containers, toggle content, grids, nav); a new surface or empty state; spacing, alignment, or responsive/density behavior | A still, GIF, or linked image of the **changed surface in its real state**. A committed assertion that pins the visual outcome (layout, computed style, or visual snapshot) also satisfies; a className- or string-only assertion does not. |
| `recording` | Interaction-only behavior with no resting-state change: keyboard, focus, clipboard, undo/redo, drag, request ordering, hover/tooltip timing | A recording or short video/GIF of the interaction, **or** a committed test that drives the same interaction and asserts its outcome. A still alone never satisfies. When the committed test satisfies the artifact, keep class `recording` (met) — do not reclassify as `none`. |
| `none` | Text already pinned by an exact-string or accessible-name assertion (a picture of the same string is weaker); a replacement no longer than the original (no truncation/wrap risk to inspect); logic or error-path whose success state is "no UI"; nothing rendered changes | No visual artifact. Name the covering assertion when one exists. This only waives the visual artifact. |

Rules:

- With changed paths but no diff content, classify on what the paths and body actually show; do not infer a visual change from a path alone.
- This triage scopes what this check requires. Repository definition-of-done expectations for authors are separate; do not convert them into a review failure.

## Status mapping

The mappings in this section apply to the direct-CLI Markdown report only.

For the single-row report, overall status follows the applicable aspects (ignore ➖), in this precedence: any ❌ → failed; else any `could-not-verify` → could not verify; else any ⚠️ → warning; else passed when at least one aspect was scored. If every aspect is ➖, the check is not applicable. An attached but uninspectable artifact is `could-not-verify`, so it can never roll up to passed.

| Status | Meaning |
| --- | --- |
| ✅ passed | Every applicable aspect is ✅ |
| ⚠️ warning | At least one applicable aspect is ⚠️, and every other applicable aspect is ✅ or ⚠️ |
| ❌ failed | At least one applicable aspect is ❌ |
| ❔ could not verify | No aspect failed, and at least one applicable aspect is `could-not-verify` (e.g. an attached artifact that could not be opened). The direct-CLI report cannot confirm the requirement, so it must not claim passed. |
| ➖ not applicable | Nothing to review (e.g. empty change and no PR body), or every aspect is ➖ |

## Check ids

Each id below names an aspect this skill scores. When the caller supplies declared checks (`Output checks`), return one object per id under the caller's check output contract; without declared checks, return the single-row Markdown report in [Report](#report).

| Declared id | Aspect | Statuses it may return |
| --- | --- | --- |
| `test-impact-automation` | Automation | `pass`, `warning`, `fail`, `not-applicable` |
| `test-impact-efficiency` | Efficiency | `pass`, `warning`, `fail`, `not-applicable` |
| `test-impact-evidence` | Evidence depth | `pass`, `warning`, `fail`, `not-applicable` |
| `test-impact-visual` | Visual evidence | `pass`, `warning`, `fail`, `not-applicable`, `could-not-verify` |

## Report

```md
## Test Impact Review

**Status:** ✅ passed | ⚠️ warning | ❌ failed | ❔ could not verify | ➖ not applicable

| Item | Status | Evidence |
| --- | --- | --- |
| Automation | <status> | <summary> |
| Efficiency | <status> | <summary> |
| Evidence depth | <status> | <summary> |
| Visual evidence | <status> | <summary, naming the triage class> |
```
