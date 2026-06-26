# CI Flake Classifier — Preflight Integration

Preflight-specific guidance for consuming the `/ci-flake-classifier` skill. For the full skill definition, output schema, and signal types, see `.claude/skills/ci-flake-classifier/SKILL.md`.

## When to Run

Run when a PR exists, is synced, and `analyze-ci.sh` reports failures (`bucket: "fail"`). Skip if the PR is not synced — CI results don't apply to the current code.

## How to Call

```bash
python3 scripts/classify-ci-failures.py "$pr_number"
```

## Status Mapping

| Classification | Preflight Status | Blocks Verdict? |
|---------------|-----------------|-----------------|
| `flaky` | ⚠️ | No |
| `suspected_flaky` | ⚠️ | No |
| `external_unknown` | ⚠️ | No |
| `genuine` | ❌ | **Yes** |
| `deterministic` | ❌ | **Yes** |
| `unknown` | ❌ | **Yes** |

## Verdict Impact

- **All failures non-blocking** (`flaky`, `suspected_flaky`, `external_unknown`) → READY WITH WARNINGS
- **Any blocking failure** (`genuine`, `deterministic`, `unknown`) → NOT READY
- **Mix** → NOT READY, but clearly separate flaky from real in the report

## Fallback

If the classifier is unavailable or fails, fall back to reporting raw CI status as ❌:

```markdown
| CI | ❌ | N failing (classifier unavailable — reporting raw status) |
```
