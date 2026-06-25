# CI Flake Classifier Integration

How preflight consumes `scripts/classify-ci-failures.py` to distinguish flaky tests from genuine regressions.

## When to Run

Run the classifier when a PR exists, is synced (local SHA matches PR SHA), and `analyze-ci.sh` reports one or more failures (`bucket: "fail"`).

If the PR is not synced, skip — CI results don't apply to the current code.

## How to Call

```bash
python3 scripts/classify-ci-failures.py "$pr_number"
```

The script outputs JSON to stdout and progress messages to stderr. Parse the JSON output.

For deeper analysis (slower — fetches logs from other PRs to match specific test names):

```bash
python3 scripts/classify-ci-failures.py "$pr_number" --deep
```

Use `--deep` when multiple test checks failed and check-level signals are ambiguous.

## Output Schema

```json
{
  "pr_number": 1234,
  "head_sha": "abc123...",
  "classifications": [
    {
      "check_name": "...",
      "classification": "flaky | suspected_flaky | external_unknown | genuine | deterministic | unknown",
      "confidence": "certain | high | moderate | low",
      "signals": [
        {"type": "...", "strength": "...", "detail": "..."}
      ],
      "failing_tests": [
        {"name": "...", "file": "..." , "error": "..."}
      ]
    }
  ],
  "summary": {
    "total_failures": 3,
    "flaky": 1,
    "suspected_flaky": 0,
    "genuine": 1,
    "deterministic": 1,
    "unknown": 0
  },
  "scan": {
    "prs_scanned": 28,
    "window_days": 7
  }
}
```

## Classification to Preflight Status

| Classification | Preflight Status | Blocks Verdict? |
|---------------|-----------------|-----------------|
| `flaky` | ⚠️ | No |
| `suspected_flaky` | ⚠️ | No |
| `external_unknown` | ⚠️ | No |
| `genuine` | ❌ | **Yes** |
| `deterministic` | ❌ | **Yes** |
| `unknown` | ❌ | **Yes** |

`external_unknown` is for checks from external CI systems (e.g. Konflux) where logs are not accessible via GitHub API. These are non-blocking because the classifier has no way to determine if the failure is genuine, and blocking on them would permanently gate every PR with an external CI flake.

## Verdict Impact

- **All failures are `flaky`, `suspected_flaky`, or `external_unknown`** → READY WITH WARNINGS (not NOT READY)
- **Any `genuine`, `deterministic`, or `unknown`** → NOT READY
- **Mix** → NOT READY, but clearly separate flaky from real in the report

## Rendering in the CI Check Row

Include the classification and evidence in the CI row's Details column. Examples:

- Mixed: `37 passed · 2 failed: 1 genuine ❌, 1 flaky ⚠️ (seen on 3 other PRs)`
- All flaky: `37 passed · 2 failed (all likely flaky — see details)`

When there are flaky failures, include evidence in a collapsible details section so reviewers can verify:

```markdown
**Flaky CI details:**
- `<check name>` — <signal detail from the classifier output>
```

## Signal Types

| Signal | Strength | Meaning |
|--------|----------|---------|
| `test_recurrence` | Very high | Same test name failed on 2+ other PRs |
| `check_recurrence` | High | Same CI job failed on 2+ other PRs |
| `rerun_detected` | High | Failed then passed on same commit SHA |
| `symptom` | Moderate | Error matches known flaky pattern |

`flaky` requires at least one high/very-high signal. Moderate-only produces `suspected_flaky`.

## Fallback

If the classifier is not available, fails, returns malformed JSON, or times out — fall back to reporting raw CI status as ❌ (the pre-classifier behavior). Log the reason:

```markdown
| CI | ❌ | N failing (classifier unavailable — reporting raw status) |
```
