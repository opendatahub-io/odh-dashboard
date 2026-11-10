# Security and CVE Handling

How the Dashboard team keeps dependencies free of known vulnerabilities, and how to fix a CVE on
`main` or a release branch.

> **Note**: This doc covers the technical side (automation, commands, branches). Red Hat
> contributors can find the ticket process in the internal
> [Dashboard Security & CVE Handbook](https://redhat.atlassian.net/wiki/spaces/RHODS/pages/517997493).

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
| Dependabot | `pnpm-lock.yaml` + Go modules on `main` (security updates only) | Security PRs labelled `dependencies` | Review or let auto-merge land them |
| Renovate | Whole workspace, Go modules, GitHub Actions, Dockerfile base images (version updates) | Tiered PRs labelled `renovate/<tier>` | Review; low-risk tiers auto-merge (see [Renovate](#renovate)) |
| PR gates | Lockfile / `go.mod` changes in your PR | Failing check on the PR | Fix before merge, or bypass with `ok-to-skip-audit` |
| CVE remediation bot (`redhat-chai-bot`) | Open trackers for a release | `fix(cve): …` PRs, often batched, against `main` or release branches | Review like any PR; check each bump against this doc |
| Container Health Index | Grade of released images | A ticket per image | Usually a base-image bump (downstream Dockerfiles) |

> **Note**: Product Security scans the **source tree** as well as the image, so lockfiles under
> `packages/*/upstream/` and test-only dependencies can still produce trackers. See
> [When a CVE does not affect us](#when-a-cve-does-not-affect-us).

## Keeping `main` Clean

### Dependabot

Dependabot handles **security updates only** — version updates moved to Renovate
([#10416](https://github.com/opendatahub-io/odh-dashboard/pull/10416)). Configured in
[`.github/dependabot.yml`](../.github/dependabot.yml); `open-pull-requests-limit: 0` per ecosystem
disables version updates while keeping security updates.

- **npm**: a single entry for the workspace root (`/`) covers every package in
  [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).
- **gomod**: an explicit list of first-party Go modules. Upstream-synced modules are excluded.
- `target-branch` is deliberately omitted: Dependabot does not apply an entry's security-update
  settings when it is set, and every ecosystem already targets the default branch.
- Security PRs are opened as soon as an advisory is published. The `applies-to: security-updates`
  groups still shape them (`npm-security`, `patternfly-security`, `go-security`);
  version-update groups and cooldowns are inert.

### PR gates

| Workflow | Runs when | Fails when |
| --- | --- | --- |
| [`dependency-validation.yml`](../.github/workflows/dependency-validation.yml) | `pnpm-lock.yaml` changes | `pnpm audit --prod --audit-level=high` reports an advisory that is **not** on the base branch |
| [`go-vulnerability-validation.yml`](../.github/workflows/go-vulnerability-validation.yml) | any `go.mod` / `go.sum` changes (upstream modules skipped) | `govulncheck -json` reports a finding ID that is not on the base branch. Findings in required modules count, even when the vulnerable code is not called. |

Both are differential — they only block **new** findings, so existing debt does not block unrelated PRs.

### Auto-merge

Two workflows add `lgtm` + `approved` so Tide merges once CI is green:

- **Dependabot security PRs** — [`dependabot-auto-merge.yml`](../.github/workflows/dependabot-auto-merge.yml):
  - **Eligible**: npm or Go patch updates; minor updates of stable (≥ 1.0) packages.
  - **Not eligible**: major bumps, pre-1.0 minor bumps (including grouped PRs containing one),
    GitHub Actions updates.
  - **Closed automatically**: PRs touching `/upstream/` — fix upstream and sync back.
- **Renovate tier PRs** — [`renovate-auto-merge.yml`](../.github/workflows/renovate-auto-merge.yml):
  patch and stable-minor tiers only, after re-validating the PR (see [Renovate](#renovate)).

**Stuck on red CI**: [`dependabot-ci-attention.yml`](../.github/workflows/dependabot-ci-attention.yml)
adds `dependabot-needs-human` daily for Dependabot and Renovate PRs. Fix the breakage, rebase, or
replace with a manual PR.

### Renovate

Renovate ([`.github/renovate.json5`](../.github/renovate.json5), self-hosted via
[`renovate.yml`](../.github/workflows/renovate.yml), GitHub App `odh-dashboard-agent`) owns
**version updates** for npm, Go modules, GitHub Actions and Dockerfile base images. Dependabot
keeps **security updates** only. The two can still touch the same package: a security fix is a
normal version bump too, so an open Renovate PR can already move a package past an advisory. If a Dependabot security PR you
expected is missing, check open Renovate PRs before treating it as a failure.

- **Schedule**: runs daily, with a second Monday attempt so one dropped run does not cost a week.
  New PRs are only opened inside the **Monday before 04:00 UTC** window; other runs rebase/refresh
  existing PRs and close superseded ones. At most 10 Renovate PRs are open at once.
- **Manual runs**: *Run workflow* → `force_updates` opens PRs immediately; `dry_run` writes
  nothing. Every run uploads a full debug log (`renovate-log` artifact).
- **Tiers** — each tier is one PR and one revert unit:

  | Label | Contents | Merge |
  | --- | --- | --- |
  | `renovate/npm-patch`, `renovate/go-patch` | patch updates (14d / 3d cooldown) | **auto** |
  | `renovate/npm-minor`, `renovate/go-minor` | minor updates of deps already ≥ 1.0.0 | **auto** |
  | `renovate/npm-minor-pre1`, `renovate/go-minor-v0` | minor updates of 0.x deps | human |
  | `renovate/actions` | GitHub Actions non-major + digest refresh | human |
  | `renovate/docker` | Dockerfile base-image versions (digests stay downstream with MintMaker) | human |
  | `renovate/go-digests` | Go pseudo-version bumps | human |
  | `renovate/major` | one PR per major update (30d npm / 14d Go cooldown) | human |

- **Not managed by Renovate**: replacement PRs (package renames), pnpm itself, React majors,
  `pnpm-workspace.yaml` overrides, and packages exact-pinned there (PatternFly, rspack, webpack, …) —
  upgrade those by hand.
- **Auto-merge gate**: `renovate-auto-merge.yml` applies `lgtm` + `approved` only when the PR is
  authored by `odh-dashboard-agent[bot]`, carries exactly one eligible tier label, every commit is
  platform-verified and attributable to that app, and
  [`renovate-automerge-check.js`](../.github/scripts/renovate-automerge-check.js) — run from the
  base branch — confirms from the diff that only manifests/lockfiles changed, nothing under
  `/upstream/`, and every change matches the tier. A crash in validation removes the labels this
  workflow added instead of leaving them behind, and a human's `/lgtm` or `/approve` is never
  removed. Use `/hold` to stop an eligible PR.
- **Troubleshooting**: a PR stuck on an old version → download the `renovate-log` artifact and
  search for the branch name (`Cannot force-push to this branch` means a branch protection rule
  covers `renovate/*`). To re-create a closed PR, delete its `renovate/*` branch and rename the
  old PR.

### Labels

| Label | Meaning |
| --- | --- |
| `dependencies` | Dependabot security PR, or any Renovate PR (exempt from the stale bot) |
| `build` | Dependabot GitHub Actions security PR |
| `renovate/<tier>` | Renovate update tier (see [Renovate](#renovate)); patch and stable-minor tiers are auto-merge eligible |
| `lgtm` + `approved` | Auto-merge eligible; Tide merges when CI is green |
| `dependabot-needs-human` | Auto-merge PR (either bot) stuck on failing CI |
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
   contains the fix, then `pnpm install`. If the package is also pinned under `overrides:` in
   [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) (for example PatternFly or webpack), update that
   pin too, or the old version stays.
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
   - **Older npm layout** (per-package `package-lock.json`) — open a direct fix on that branch, in
     the owning package's directory:
     - **Direct dependency**: run `npm install <pkg>@<fixed-version>`. This raises the minimum
       version in `package.json` even when the fix is inside the current range. A plain
       `npm install` keeps the locked vulnerable version if it still satisfies the range.
     - **Transitive dependency**: add an npm `overrides` entry in `package.json`, then run
       `npm install`.
     - **Verify**: `npm ls <pkg>` shows only fixed versions, and `package-lock.json` changed.
1. Open the PR against the ODH `-fixes` branch, validate, merge, then bring the same change into
   the matching downstream `rhoai-*` branch.

> **Note**: The sustaining engineering team drives release-branch fixes and validation; the Dashboard
> team reviews and helps.

## When a CVE Does Not Affect Us

Images ship build output, not `node_modules`:

- **Main dashboard image** ([`Dockerfile`](../Dockerfile)): `frontend/public` (Rspack bundle) and
  `backend/dist` (esbuild bundle).
- **Package images** (`packages/*/Dockerfile*`, `distributions/*/Dockerfile*`): the frontend bundle
  plus, where present, a compiled Go BFF binary. Some packages build these from their `upstream/`
  tree (for example `packages/model-registry/Dockerfile.workspace`).

> **Warning**: Runtime dependencies are compiled **into** those bundles and binaries, so a vulnerable
> runtime package still ships even though `node_modules` does not. Treat runtime dependencies as
> affected unless the vulnerable code path is provably unused.

Common "not affected" cases:

- **Build- or test-only packages** (linters, Cypress, Jest, dev servers): the code never reaches the
  bundles. For build tools that produce the bundle (bundlers, minifiers, Babel plugins), also check
  that the flaw cannot change the build output.
- **Lockfiles that no image build uses**, including `upstream/` trees whose package does not build
  from them. Check the package's `Dockerfile*` before deciding.
- **Go code paths** that `govulncheck` reports as not reachable. Re-run it with the build tags the
  image uses first (for example `govulncheck -tags strictfipsruntime ./...` for BFFs built that way;
  see the package's `Dockerfile.workspace`), because a scan without tags can miss code that ships.
  The scan can also miss calls made through `reflect` or `unsafe`, so treat it as evidence, not
  proof.

Record the reasoning on the tracker before closing it as not affected.
Still bump the package on `main` when it is cheap — it keeps scanners quiet and future trackers away.

## Onboarding a New Package

- **npm**: add the package to `pnpm-workspace.yaml`. Dependabot, Renovate, and the PR gate cover it
  through the root lockfile. Avoid separate lockfiles — they are not covered by the PR gate.
- **Go module**: add its directory to the `gomod` list in `.github/dependabot.yml` so its security
  PRs get the `go-security` group and labels. Renovate and the govulncheck PR gate pick up new
  modules automatically.

## Known Gaps

- Go modules not yet listed in `dependabot.yml` (for example `packages/data-registry/bff`,
  `packages/data-connect-hub/bff`, `pkg/tls`) still get Dependabot security PRs, but without the
  `go-security` group or labels; Renovate covers their version updates.
- `packages/autox-core` is excluded from both bots; its CVEs are tracked in RHOAIENG-59135.
- Dependabot opens security PRs only against `main`; release branches rely on the sustaining
  engineering team.
