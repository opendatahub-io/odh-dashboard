# Security and CVE Handling

How the Dashboard team keeps dependencies free of known vulnerabilities, and how to fix a CVE on
`main` or a release branch.

> **Note**: This doc covers the technical side (automation, commands, branches). Red Hat
> contributors can find the ticket process in the internal
> [Dashboard Security & CVE Handbook](https://redhat.atlassian.net/wiki/spaces/RHODS/pages/304027483).

## TL;DR

- **`main` is owned by the Dashboard team.** Keep it free of known CVEs; drain dependency PRs promptly.
- **Shipped z-stream releases are owned by the sustaining engineering team.** The Dashboard team
  reviews and helps with hard fixes (major bumps, code migrations).
- **Fix `main` first.** A release-only fix is never a substitute for leaving `main` vulnerable
  (unless the CVE does not apply to `main` — record that on the tracker).
- **Put the CVE ID in the commit message** so fixes can be found with `git log --grep=CVE-YYYY-NNNNN`.

## Where CVE Signals Come From

| Signal | Scans | Shows up as | Action |
| --- | --- | --- | --- |
| Product Security trackers | Released images and their source, per release stream | A tracker per affected image and release | Fix on `main`, then on supported release branches |
| Snyk | Downstream `red-hat-data-services/odh-dashboard` `main` | A ticket per finding, closed automatically when Snyk stops reporting it | Fix on `main` |
| Dependabot | `pnpm-lock.yaml` + Go modules on `main` | PRs labelled `dependencies` | Review or let auto-merge land them |
| Renovate (trial) | Whole workspace, Go modules, GitHub Actions, Dockerfile base images | PRs labelled `dependencies` | Manual review only (see [Renovate trial](#renovate-trial)) |
| PR gates | Lockfile / `go.mod` changes in your PR | Failing check on the PR | Fix before merge, or bypass with `ok-to-skip-audit` |
| CVE remediation bot (`redhat-chai-bot`) | Open trackers for a release | `fix(cve): …` PRs, often batched, against `main` or release branches | Review like any PR; check each bump against this doc |
| Container Health Index | Grade of released images | A ticket per image | Usually a base-image bump (downstream Dockerfiles) |

> **Note**: Product Security scans the **source tree** as well as the image, so lockfiles under
> `packages/*/upstream/` and test-only dependencies can still produce trackers. See
> [When a CVE does not affect us](#when-a-cve-does-not-affect-us).

## Keeping `main` Clean

### Dependabot

Configured in [`.github/dependabot.yml`](../.github/dependabot.yml); all updates target `main` only.

- **npm**: a single entry for the workspace root (`/`) covers every package in
  [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).
- **gomod**: an explicit list of first-party Go modules. Upstream-synced modules are excluded.
- **Settings apply to version updates only.** Every entry sets `target-branch`, so
  [GitHub ignores the file's settings for security updates](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-security-updates).
  Security PRs are opened as soon as an advisory is published, one per dependency, for any
  manifest with an open alert. The `*-security` groups and the cooldown do not apply to them.

### PR gates

| Workflow | Runs when | Fails when |
| --- | --- | --- |
| [`dependency-validation.yml`](../.github/workflows/dependency-validation.yml) | `pnpm-lock.yaml` changes | `pnpm audit --prod --audit-level=high` reports an advisory that is **not** on the base branch |
| [`go-vulnerability-validation.yml`](../.github/workflows/go-vulnerability-validation.yml) | any `go.mod` / `go.sum` changes (upstream modules skipped) | `govulncheck -json` reports a finding ID that is not on the base branch. Findings in required modules count, even when the vulnerable code is not called. |

Both are differential — they only block **new** findings, so existing debt does not block unrelated PRs.

### Auto-merge

[`dependabot-auto-merge.yml`](../.github/workflows/dependabot-auto-merge.yml) adds `lgtm` + `approved`
so Tide merges once CI is green.

- **Eligible**: npm or Go patch updates; minor updates of stable (≥ 1.0) packages.
- **Not eligible**: major bumps, pre-1.0 minor bumps (including grouped PRs containing one),
  GitHub Actions updates.
- **Closed automatically**: PRs touching `/upstream/` — fix upstream and sync back.
- **Stuck on red CI**: [`dependabot-ci-attention.yml`](../.github/workflows/dependabot-ci-attention.yml)
  adds `dependabot-needs-human` daily. Fix the breakage, rebase, or replace with a manual PR.

### Renovate trial

Renovate ([`.github/renovate.json5`](../.github/renovate.json5), self-hosted via
[`renovate.yml`](../.github/workflows/renovate.yml)) runs alongside Dependabot during the trial:

- **Dependabot keeps auto-merge and the CVE path.** Renovate's vulnerability alerts are off to avoid
  duplicate security PRs.
- **Renovate PRs are never auto-merged**; manual review is the evaluation.
- **Groups** non-major JS and Go updates across the workspace into single PRs, and covers Go modules
  missing from `dependabot.yml`.
- **Dockerfile base images**: Renovate bumps versions upstream; digests are pinned downstream by
  MintMaker in `Dockerfile.konflux*`.
- **Duplicates are expected**: both bots touch `pnpm-lock.yaml`; first merge wins and the other closes.

The cutover plan is documented at the top of `renovate.json5`.

### Labels

| Label | Meaning |
| --- | --- |
| `dependencies` | Dependabot npm/Go PR, or any Renovate PR (exempt from the stale bot) |
| `build` | Dependabot GitHub Actions PR |
| `lgtm` + `approved` | Auto-merge eligible; Tide merges when CI is green |
| `dependabot-needs-human` | Auto-merge PR stuck on failing CI |
| `ok-to-skip-audit` | Accepts a PR-gate finding. At merge, [`audit-bypass-notice.yml`](../.github/workflows/audit-bypass-notice.yml) comments with the accepted `pnpm audit` findings. Go findings are not included. |

Use `ok-to-skip-audit` only for an explicitly accepted risk (for example, no fix exists yet) and
explain why in the PR description. For a Go finding, list the accepted vulnerability IDs there too,
because the merge notice does not record them.

## Fixing a CVE Manually

Use this when no bot PR exists, a bump needs code changes, or you are fixing a tracker directly.

### npm (pnpm workspace)

```bash
pnpm why -r <pkg>                     # who pulls it in, and which versions
pnpm audit --prod --audit-level=high  # what the PR gate will see
```

1. **Direct dependency** — bump it in the owning `package.json` with the smallest version that
   contains the fix, then `pnpm install`.
1. **Transitive dependency** — prefer bumping the parent. If the parent has no fixed release, add a
   pin under `overrides:` in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) (use the
   `parent>child` form to scope it), then `pnpm install`.
1. Commit `pnpm-lock.yaml` together with the manifest change — CI fails on a dirty lockfile.
1. Verify: `pnpm why -r <pkg>` shows only fixed versions, then run lint, type-check, tests, and build.

> **Warning**: Overrides force a version on every consumer. Check the parent's supported range and
> remove the override once the parent ships a fixed release.

### Go modules

```bash
cd <module-dir>
govulncheck ./...                     # reachable vulnerabilities, with call stacks
govulncheck -json ./... | jq -r 'select(.finding) | .finding.osv' | sort -u   # IDs the PR gate compares
go get <module>@<fixed-version>
go mod tidy
```

- **Standard-library CVEs**: bump the `go` / `toolchain` directive in `go.mod`. Make sure the
  builder image used by the module's Dockerfile provides that Go version.
- Run the module's tests and build (`make test` / `make build` where available).

### Upstream-synced code

`packages/*/upstream/` trees are synced from other repositories (see [Upstream Sync](upstream-sync.md)).
Fix the dependency upstream first, then sync. Bots and PR gates skip these trees on purpose.

### Commit and PR conventions

```text
fix(deps): bump <pkg> to <version> (CVE-YYYY-NNNNN)
```

- One commit can list several CVE IDs; keep CVE bumps separate from unrelated changes so they
  cherry-pick cleanly.
- Link the Jira tracker in the PR description (`Fixes: <jira-url>`).

## Fixing CVEs on Release Branches

Every z-stream fix flows in one direction — never skip the ODH branch or cherry-pick straight from
`main` to RHOAI:

```text
main ──► ODH v<X.Y.Z>-fixes (opendatahub-io) ──► RHOAI rhoai-<X.Y> (red-hat-data-services) ──► errata
```

1. Confirm the fix is on `main`: `git log --grep="CVE-YYYY-NNNNN" upstream/main`.
1. Check the release branch's package manager (`packageManager` in its root `package.json`):
   - **Same layout as `main` (pnpm)** — cherry-pick the `main` commit.
   - **Older npm layout** (per-package `package-lock.json`) — open a direct fix on that branch.
     For a direct dependency, raise its range in the owning `package.json` if the fixed version is
     outside it. For a transitive one, add an npm `overrides` entry. Then regenerate that
     package's `package-lock.json` with `npm install`.
1. Open the PR against the ODH `-fixes` branch, validate, merge, then bring the same change into
   the matching downstream `rhoai-*` branch.

> **Note**: The sustaining engineering team drives release-branch fixes and validation; the Dashboard
> team reviews and helps.

## When a CVE Does Not Affect Us

Images ship build output, not `node_modules`:

- **Main dashboard image** ([`Dockerfile`](../Dockerfile)): `frontend/public` (Rspack bundle) and
  `backend/dist` (esbuild bundle).
- **Package images** (`packages/*/Dockerfile`, `distributions/*/Dockerfile`): the frontend bundle
  plus, where present, a compiled Go BFF binary.

> **Warning**: Runtime dependencies are compiled **into** those bundles and binaries, so a vulnerable
> runtime package still ships even though `node_modules` does not. Treat runtime dependencies as
> affected unless the vulnerable code path is provably unused.

Common "not affected" cases:

- **Build- or test-only packages** (bundlers, linters, Cypress, Jest, dev servers): the code never
  reaches the bundles.
- **Upstream-synced trees** or lockfiles that no image build uses.
- **Go code paths** that `govulncheck` reports as not reachable. Re-run it with the build tags the
  image uses first (for example `govulncheck -tags strictfipsruntime ./...` for BFFs built that way;
  see the package's `Dockerfile.workspace`), because a scan without tags can miss code that ships.

Record the reasoning on the tracker before closing it as not affected.
Still bump the package on `main` when it is cheap — it keeps scanners quiet and future trackers away.

## Onboarding a New Package

- **npm**: add the package to `pnpm-workspace.yaml`. Dependabot, Renovate, and the PR gate cover it
  through the root lockfile. Avoid separate lockfiles — they are not covered by the PR gate.
- **Go module**: add its directory to the `gomod` list in `.github/dependabot.yml`. The govulncheck
  PR gate and Renovate pick up new modules automatically.

## Known Gaps

- Go modules not yet listed in `dependabot.yml` (for example `packages/data-registry/bff`,
  `packages/data-connect-hub/bff`, `pkg/tls`) get no Dependabot version updates; Renovate covers
  them during the trial.
- Dependabot security PRs are not grouped (see [Dependabot](#dependabot)), so one advisory can
  open several PRs.
- `packages/autox-core` is excluded from both bots; its CVEs are tracked in RHOAIENG-59135.
- Dependabot opens security PRs only against `main`; release branches rely on the sustaining
  engineering team.
