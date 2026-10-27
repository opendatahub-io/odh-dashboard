# Security audit triage

How dependency CVE signals fit together in this repo.

## Surfaces

| Surface | What it does |
| --- | --- |
| **Weekly security audit** (GitHub Issue) | Inventory of high/critical (and Go) findings on `main`. Report-only for vulns (does not fail unrelated CI). |
| **Dependabot PRs** (`dependencies` label) | **Security updates only** (CVE remediation, security-grouped PRs). |
| **Renovate PRs** (`dependencies` + `renovate/<tier>` labels) | All version updates — see [Renovate](#renovate). Low-risk tiers auto-merge. |
| **PR gates** (`dependency-validation.yml`, `go-vulnerability-validation.yml`) | Block *new* advisories introduced by a dep-touching PR. |
| **`ok-to-skip-audit`** | Explicit bypass for an accepted PR-time finding (see `audit-bypass-notice.yml`). |
| **`dependabot-needs-human`** | Auto-merge eligible Dependabot or Renovate PR is stuck on red CI — needs a person. |

## Invariants

- **Scanner errors ⇒ not clean.** Missing matrix summaries, pnpm `{"error":…}`, or govulncheck failures keep the weekly issue **open**. A failed scan must never look like a clean bill of health.
- Root `/` `pnpm audit` is a **workspace** scan and may list packages also covered by intentionally separate upstream npm locks; treat `/` rows accordingly.

## Weekly issue buckets

Classification comes from `pnpm audit` / `govulncheck` metadata and is **advisory** (not a guarantee the bump is safe here).

1. **Actionable** — fix available without a major bump → prefer Dependabot / auto-merge.
2. **Major-only** — fix exists but is a major bump → intentional upgrade.
3. **No fix** — nothing to bump yet → wait, accept in Human notes, or track separately.
4. **Needs human** — open Dependabot/Renovate PR with `dependabot-needs-human`.

## Out of scope for the weekly scan

Upstream-synced trees (`packages/model-registry/upstream/`, `packages/notebooks/upstream/`) and packages not listed in `.github/dependabot.yml` (e.g. `autox-core`) are excluded. Track those via RHOAIENG-59135 / upstream sync.

## Renovate

Renovate (`.github/renovate.json5`, self-hosted via `.github/workflows/renovate.yml`, app `odh-dashboard-agent`) owns **version updates** for npm, Go modules, GitHub Actions and Dockerfile base images. Dependabot keeps **security updates** only (`open-pull-requests-limit: 0` in `.github/dependabot.yml`), so the two bots never propose the same change.

**When things happen**

- Runs daily at 02:00 UTC. New PRs are only opened on **Monday before 04:00 UTC**; other runs rebase/refresh existing PRs and close superseded ones.
- At most 10 Renovate PRs are open at once. Patch tiers are created first.
- *Run workflow* → `force_updates` opens PRs immediately; `dry_run` writes nothing. Every run uploads a full debug log (`renovate-log` artifact).

**Update tiers** — each tier is one PR and one revert unit:

| Label | Contents | Merge |
| --- | --- | --- |
| `renovate/npm-patch`, `renovate/go-patch` | patch updates (14d / 3d cooldown) | **auto** |
| `renovate/npm-minor`, `renovate/go-minor` | minor updates of deps already ≥ 1.0.0 | **auto** |
| `renovate/npm-minor-pre1`, `renovate/go-minor-v0` | minor updates of 0.x deps | human |
| `renovate/actions` | GitHub Actions non-major + digest refresh | human |
| `renovate/docker` | Dockerfile base-image versions (digests stay downstream with MintMaker) | human |
| `renovate/go-digests` | Go pseudo-version bumps | human |
| `renovate/major` | one PR per major update (30d npm / 14d Go cooldown) | human |

Replacement PRs (package renames), pnpm itself, React majors, `pnpm-workspace.yaml` overrides, and packages exact-pinned there (PatternFly, rspack, webpack, …) are disabled; upgrade those by hand. Issues are disabled on this repo, so there is no Dependency Dashboard.

**Auto-merge** — `.github/workflows/renovate-auto-merge.yml` applies `lgtm` + `approved` (Tide then merges after CI) only when all of these hold:

1. the PR is authored by `odh-dashboard-agent[bot]`;
2. it carries exactly one eligible tier label, added by that app;
3. **every commit is attributable to that app** — this is what makes the diff check meaningful, and it is why `platformCommit` is enabled in `renovate.json5`. Branches must accept pushes from the app and **nobody else**;
4. `.github/scripts/renovate-automerge-check.js` — run from the base branch — confirms from the diff that only manifests/lockfiles changed, nothing under `/upstream/`, no dependencies added or removed, no new or altered non-registry resolutions, no graph entry changed outside the update (an unchanged package may only follow a bumped dependency), no indirect Go version bump, and that every direct change matches the tier;
5. the PR head is unchanged when the labels are applied.

A crash in validation removes the labels this workflow added instead of leaving them behind, and a human's `/lgtm` or `/approve` is never removed. Use `/hold` to stop an eligible PR. The checker has a test suite (`pnpm run test:renovate-automerge`, also run by `renovate-auto-merge-check-tests.yml`); add a case there before changing its rules.

**Troubleshooting**

- *PR not rebased / stuck on an old version* — download the `renovate-log` artifact and search for the branch name. `Cannot force-push to this branch` means a branch protection rule covers `renovate/*`; Renovate must be able to force-push its own branches.
- *Eligible PR reports "commits not attributable to odh-dashboard-agent"* — `platformCommit` is off, or the app token lost `contents: write`. The check fails closed on purpose; fix the attribution rather than the check.
- *Need an update now* — *Run workflow* with `force_updates`. To re-create a closed PR, delete its `renovate/*` branch and rename the old PR.
- *Rollback* — disable the Renovate workflow and revert the cutover PR; Dependabot version updates come back with the old `dependabot.yml`. Disabling the workflow **alone** leaves Dependabot muted (`open-pull-requests-limit: 0`), i.e. no dependency updates at all.

## Transitive dependency CVEs

Prefer Dependabot security PRs when possible. For transitive-only pins, use the root `overrides` configuration in `pnpm-workspace.yaml` and regenerate `pnpm-lock.yaml` with `pnpm install` (RHOAIENG-57882) so the lockfile stays aligned.

## Local fixture tests

```bash
./scripts/security-audit/test-security-audit.sh
```

