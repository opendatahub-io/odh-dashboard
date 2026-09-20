# Security audit triage

How dependency CVE signals fit together in this repo.

## Surfaces

| Surface | What it does |
| --- | --- |
| **Weekly security audit** (GitHub Issue) | Inventory of high/critical (and Go) findings on `main`. Report-only for vulns (does not fail unrelated CI). |
| **Dependabot PRs** (`dependencies` label) | Remediation path — bump packages (and security-grouped PRs). |
| **PR gates** (`dependency-validation.yml`, `go-vulnerability-validation.yml`) | Block *new* advisories introduced by a dep-touching PR. |
| **`ok-to-skip-audit`** | Explicit bypass for an accepted PR-time finding (see `audit-bypass-notice.yml`). |
| **`dependabot-needs-human`** | Auto-merge eligible Dependabot PR is stuck on red CI — needs a person. |

## Invariants

- **Scanner errors ⇒ not clean.** Missing matrix summaries, npm `{"error":…}`, or govulncheck failures keep the weekly issue **open**. A failed scan must never look like a clean bill of health.
- Root `/` npm audit is a **workspace** scan and may list packages also covered by nested frontend locks; treat `/` rows accordingly.

## Weekly issue buckets

Classification comes from `npm audit` / `govulncheck` metadata and is **advisory** (not a guarantee the bump is safe here).

1. **Actionable** — fix available without a major bump → prefer Dependabot / auto-merge.
2. **Major-only** — fix exists but is a major bump → intentional upgrade.
3. **No fix** — nothing to bump yet → wait, accept in Human notes, or track separately.
4. **Needs human** — open Dependabot PR with `dependabot-needs-human`.

## Out of scope for the weekly scan

Upstream-synced trees (`packages/model-registry/upstream/`, `packages/notebooks/upstream/`) and packages not listed in `.github/dependabot.yml` (e.g. `autox-core`) are excluded. Track those via RHOAIENG-59135 / upstream sync.

## Transitive npm CVEs

Prefer Dependabot when possible. For transitive-only pins, use root `overrides` and `npm run sync:overrides` (RHOAIENG-57882) so lockfiles stay aligned.

## Local fixture tests

```bash
./scripts/security-audit/test-security-audit.sh
```

