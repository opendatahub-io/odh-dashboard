# Security audit triage

How dependency CVE signals fit together in this repo.

## Surfaces

| Surface | What it does |
| --- | --- |
| **Weekly security audit** (GitHub Issue) | Inventory of high/critical (and Go) findings on `main`. Report-only for vulns (does not fail unrelated CI). |
| **Dependabot PRs** (`dependencies` label) | Remediation path — bump packages (and security-grouped PRs). |
| **Renovate PRs** (`dependencies` label, trial) | Trial alongside Dependabot — see [Renovate trial](#renovate-trial-alongside-dependabot). Not auto-merged during the trial. |
| **PR gates** (`dependency-validation.yml`, `go-vulnerability-validation.yml`) | Block *new* advisories introduced by a dep-touching PR. |
| **`ok-to-skip-audit`** | Explicit bypass for an accepted PR-time finding (see `audit-bypass-notice.yml`). |
| **`dependabot-needs-human`** | Auto-merge eligible Dependabot PR is stuck on red CI — needs a person. |

## Invariants

- **Scanner errors ⇒ not clean.** Missing matrix summaries, pnpm `{"error":…}`, or govulncheck failures keep the weekly issue **open**. A failed scan must never look like a clean bill of health.
- Root `/` `pnpm audit` is a **workspace** scan and may list packages also covered by intentionally separate upstream npm locks; treat `/` rows accordingly.

## Weekly issue buckets

Classification comes from `pnpm audit` / `govulncheck` metadata and is **advisory** (not a guarantee the bump is safe here).

1. **Actionable** — fix available without a major bump → prefer Dependabot / auto-merge.
2. **Major-only** — fix exists but is a major bump → intentional upgrade.
3. **No fix** — nothing to bump yet → wait, accept in Human notes, or track separately.
4. **Needs human** — open Dependabot PR with `dependabot-needs-human`.

## Out of scope for the weekly scan

Upstream-synced trees (`packages/model-registry/upstream/`, `packages/notebooks/upstream/`) and packages not listed in `.github/dependabot.yml` (e.g. `autox-core`) are excluded. Track those via RHOAIENG-59135 / upstream sync.

## Renovate trial (alongside Dependabot)

Renovate (`.github/renovate.json5`, self-hosted via `.github/workflows/renovate.yml`) runs full-scope next to Dependabot. Division of labor during the trial:

- **Dependabot keeps auto-merge and the CVE-PR path** (`dependabot-auto-merge.yml` untouched; repo Dependabot alerts stay on). Renovate's `vulnerabilityAlerts`/`osvVulnerabilityAlerts` are off to avoid duplicate security PRs.
- **Renovate PRs are not auto-merged** — manual review is the evaluation. Expect some duplicate PRs; both bots touch `pnpm-lock.yaml`, first merge wins, the loser auto-closes.
- **Renovate groups** non-major JS/Go updates across the whole workspace into single PRs (Dependabot opens one PR per dependency per Go module).
- **Renovate covers Go modules missing from `dependabot.yml`** (`packages/data-registry/bff`, `packages/data-connect-hub/bff`, `pkg/tls`) — the weekly audit still discovers its scan directories from `dependabot.yml`, so those modules get updates but stay out of the weekly inventory until the discovery script is rewritten at cutover. `autox-core` stays excluded (RHOAIENG-59135).
- **Dockerfile base images**: Renovate manages *versions* upstream. Digests are pinned *downstream* by MintMaker on the downstream-only `Dockerfile.konflux*` files — the two sides never touch the same files, so upstream keeps `pinDigests` off.

Cutover once validated: remove the npm/gomod/github-actions ecosystems from `.github/dependabot.yml`, enable the commented-out automerge rule in `renovate.json5`, and extend `dependabot-auto-merge.yml` to act on the `automerge-eligible` label.

## Transitive dependency CVEs

Prefer Dependabot when possible. For transitive-only pins, use the root `overrides` configuration in `pnpm-workspace.yaml` and regenerate `pnpm-lock.yaml` with `pnpm install` (RHOAIENG-57882) so the lockfile stays aligned.

## Local fixture tests

```bash
./scripts/security-audit/test-security-audit.sh
```

