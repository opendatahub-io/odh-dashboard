---
name: ci-flake-classifier
description: "Classify CI failures on a PR as flaky or genuine using cross-PR recurrence, rerun detection, and symptom pattern matching. Use when a PR has failing CI checks and you need to know which are real regressions vs known flaky tests."
argument-hint: "<PR number> [--deep] [--since Nd]"
---

# CI Flake Classifier

Classifies CI failures on a PR as **flaky** or **genuine** by layering four signals:

1. **Cross-PR check recurrence** — same CI job failed on other recent PRs (high)
2. **Cross-PR test recurrence** — same specific test name failed on other PRs (very high, `--deep` only)
3. **Rerun detection** — check failed then passed on same commit SHA (high)
4. **Symptom pattern matching** — error matches known flaky patterns like Cypress timeouts, ECONNRESET (moderate)

## Arguments

`$ARGUMENTS` — one of:
- A PR number (e.g. `1234`) — classify that PR's CI failures
- A PR number with `--deep` (e.g. `1234 --deep`) — also fetch logs from other PRs for test-level matching (slower, stronger signal)
- A PR number with `--since Nd` (e.g. `1234 --since 14d`) — widen the scan window (default: 7d)
- Empty — print usage and stop

If no arguments are provided, print:
```
Usage: /ci-flake-classifier <PR number> [--deep] [--since Nd]

Examples:
  /ci-flake-classifier 1234
  /ci-flake-classifier 1234 --deep
  /ci-flake-classifier 1234 --since 14d
```

## Prerequisites

- `gh` CLI — authenticated and available
- `python3` — available in PATH

## Execution

### Step 1: Parse arguments and detect repo

```bash
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
```

### Step 2: Run the classifier

Build the command from `$ARGUMENTS`:

```bash
python3 scripts/classify-ci-failures.py $ARGUMENTS --repo "$owner/$repo"
```

If `--repo` was already provided in `$ARGUMENTS`, don't add it again.

Capture the JSON output from stdout. Progress messages go to stderr.

### Step 3: Interpret and present results

Parse the JSON output. The key fields:

```json
{
  "classifications": [
    {
      "check_name": "...",
      "classification": "flaky | suspected_flaky | external_unknown | genuine | deterministic | unknown",
      "confidence": "certain | high | moderate | low",
      "signals": [{"type": "...", "strength": "...", "detail": "..."}],
      "occurrences": 1,
      "failing_tests": [{"name": "...", "file": "...", "error": "..."}]
    }
  ],
  "summary": {
    "total_failures": 3,
    "flaky": 1, "suspected_flaky": 0, "external_unknown": 1,
    "genuine": 1, "deterministic": 0, "unknown": 0
  },
  "scan": {"prs_scanned": 28, "window_days": 7}
}
```

### Step 4: Generate the report

```
## CI Failure Classification — PR #<number>

**<N> failures classified** — <scanned> PRs scanned (<window>d window)

| Check | Classification | Confidence | Signals |
|-------|---------------|------------|---------|
| <check_name> | ⚠️ Flaky | High | <signal details> |
| <check_name> | ❌ Genuine | High | No recurrence or symptom match |
| <check_name> | ⚠️ External | Low | External CI — logs not accessible |
| <check_name> | 🔧 Deterministic | Certain | Build/lint/type-check (never flaky) |

### Flaky Details
<For each flaky/suspected_flaky, list the signals and any failing test names>

### Genuine Failures
<For each genuine, list the failing tests — these need investigation>

### Recommendation
- <N> flaky — safe to rerun or ignore
- <N> genuine — investigate before merging
- <N> external — check Konflux/Prow UI manually
```

## Classification Legend

| Classification | Icon | Meaning | Blocks merge? |
|---------------|------|---------|---------------|
| `flaky` | ⚠️ | Strong signal: recurrence or rerun detected | No |
| `suspected_flaky` | ⚠️ | Moderate signal: symptom pattern match only | No |
| `external_unknown` | ⚠️ | External CI (Konflux/Prow) — logs not accessible | No |
| `genuine` | ❌ | No flaky signals — likely a real regression | **Yes** |
| `deterministic` | 🔧 | Build/lint/type-check — never flaky | **Yes** |
| `unknown` | ❓ | GHA check but couldn't extract test details | **Yes** |

## Signal Strength

| Signal | Strength | What it means |
|--------|----------|---------------|
| `test_recurrence` | Very high | Same test name failed on 2+ other PRs |
| `check_recurrence` | High | Same CI job failed on 2+ other PRs |
| `rerun_detected` | High | Failed then passed on same commit SHA |
| `symptom` | Moderate | Error matches known flaky pattern |
| `external_ci` | None | External CI system — informational only |

`flaky` requires at least one high/very-high signal. `suspected_flaky` has moderate signals only.
