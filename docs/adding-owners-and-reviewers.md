# Adding Approvers and Reviewers

This guide explains how to add a new team's approvers and reviewers to the ODH Dashboard repository.

## Overview

The repository uses `OWNERS` files plus one root `OWNERS_ALIASES`:

- **`OWNERS` files** — Define which files/directories each team owns and which alias groups can approve/review them. Packages, manifest modules, and `distributions/` each have their own.
- **`OWNERS_ALIASES`** — Defines the actual GitHub usernames for each approver/reviewer group. It lives at the repo root and can be used from any `OWNERS` file.

## Package ownership

Every directory under `packages/` must have its own `OWNERS` file:

```yaml
approvers:
  - your-team-approvers
reviewers:
  - your-team-reviewers
labels:
  - area/your-team
  - area/components
options:
  no_parent_owners: true
```

`options.no_parent_owners: true` is required. Without it, Prow inherits the root `OWNERS` catch-all, which makes `general-approvers` valid approvers for every package and defeats per-package ownership. It also stops inheritance of root labels and reviewers, so copy any labels the package needs (including `area/components`) into this file.

Aliases are defined once in the repository-root `OWNERS_ALIASES` and can be referenced from any nested `OWNERS` file. Alias-to-alias references are not supported.

Root `OWNERS` filters are only for paths that no scoped `OWNERS` file covers (for example `frontend/src/...` areas). Several scopes set `options.no_parent_owners: true` — `packages/<name>/`, `manifests/` (including `manifests/modules/<module>/`), `distributions/`, and `dashboard-operator/`. Those scopes disable root ownership for every path beneath them, so a root filter there would be ignored and the two lists would drift. Add ownership to the scoped `OWNERS` file instead.

Manifest modules follow the same pattern: create `manifests/modules/<module>/OWNERS` with the owning team's approvers/reviewers, the module's `area/*` label(s), `area/manifests`, and `options.no_parent_owners: true`. `manifests/OWNERS` covers the remaining manifests directories with `area/manifests` and `platform-reviewers`. `distributions/` also has its own `OWNERS` with `no_parent_owners: true`.

Do not add `OWNERS` files under `packages/*/upstream/`: synced upstream copies interfere with package ownership and should be excluded from the subtree sync instead.

## Authorization Model

There are two different workflows depending on your situation:

| Scenario                  | Who Can Approve                                                                                         | What You Can Change                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **New team onboarding**   | `general-approvers` or `managers-backup-approvers` (plus `platform-approvers` for new manifest modules) | Add your team to `OWNERS_ALIASES` plus the relevant `OWNERS` file (package, manifest module, or root filter) |
| **Existing team updates** | Your own team's approvers                                                                               | Modify only your team's section in `OWNERS_ALIASES`                                                          |

### New Team Onboarding (Bootstrap)

If your team is **not yet listed** in `OWNERS_ALIASES` and the relevant `OWNERS` file, you'll need approval from `general-approvers` or `managers-backup-approvers` to be added. This is a one-time bootstrap process.

1. Create a PR adding your team to `OWNERS_ALIASES` and the relevant `OWNERS` file(s)
2. Request a review from someone in `general-approvers` (see list in `OWNERS_ALIASES`)
3. Once approved and merged, your team can self-manage future changes

> **Manifest modules:** before its own `OWNERS` file merges, a new `manifests/modules/<module>/` directory is covered by `manifests/OWNERS`, which sets `options.no_parent_owners: true` and lists `platform-approvers` as approvers. The manifest portion of a module onboarding PR therefore also needs approval from `platform-approvers`; `general-approvers` membership alone does not cover it. Request both reviews in the same PR.

### Existing Team Self-Management

Once your team is listed in the `OWNERS_ALIASES` approvers filter (in the `OWNERS` file), your approvers can approve changes to your own section in `OWNERS_ALIASES` without needing external approval. This allows teams to:

- Add/remove team members
- Promote reviewers to approvers
- Update GitHub usernames

## Prerequisites

> **Important:** All users listed in `OWNERS_ALIASES` must be members of the [opendatahub-io](https://github.com/orgs/opendatahub-io/people) GitHub organization. The CI will block merges if any listed users are not org members.

Before adding new approvers/reviewers:

1. Ensure all team members have accepted their invitation to the `opendatahub-io` organization
2. Verify their GitHub usernames are correct

## Step-by-Step Guide

### 1. Add Your Team to `OWNERS_ALIASES`

Open `OWNERS_ALIASES` and add two new aliases for your team — one for approvers and one for reviewers:

```yaml
aliases:
  # ... existing aliases ...

  # Your Team Name
  your-team-approvers:
    - github-username-1
    - github-username-2
  your-team-reviewers:
    - github-username-1
    - github-username-2
    - github-username-3
```

**Guidelines:**

- Use lowercase with hyphens for alias names (e.g., `gen-ai-approvers`)
- Approvers should be a smaller, senior subset of reviewers
- Add a comment above your aliases describing the team/area

### 2. Add Ownership

**Packages:** create `packages/<your-package>/OWNERS` using the template in [Package ownership](#package-ownership). Do not add a package path filter to the root `OWNERS`.

**Manifests modules:** create `manifests/modules/<your-module>/OWNERS` with the same approvers/reviewers as the package, plus `area/manifests`, the module's area label, and `options.no_parent_owners: true`.

**Other areas:** add a filter block to the root `OWNERS` only for paths where no scoped `OWNERS` file applies. Only scopes that leave parent ownership enabled can pick up a root filter; `packages/<name>/`, `manifests/` (including `manifests/modules/<module>/`), `distributions/`, and `dashboard-operator/` all set `options.no_parent_owners: true`, so extend their `OWNERS` file instead of adding a root filter beneath them:

```yaml
filters:
  # ... existing filters ...

  # Your Team Name
  'frontend/src/pages/yourFeature/.*':
    approvers:
      - your-team-approvers
    reviewers:
      - your-team-reviewers
    labels:
      - area/your-team
```

**Path pattern examples** (root filters, paths with no scoped owners only):

- Single directory: `'frontend/src/pages/yourFeature/.*'`
- Multiple paths: `'(frontend/src/pages/yourFeature|frontend/src/plugins/yourPlugin)/.*'`
- Specific file types: `'frontend/src/.*\.test\.ts'`

**About labels:**

The `labels` field applies GitHub labels to PRs that touch matching files. Labels must already exist in the [repository's labels](https://github.com/opendatahub-io/odh-dashboard/labels); if not, create it before merging (repo maintainers can use `gh label create`). Use the naming convention `area/your-team`; package OWNERS should also include `area/components`, and manifest module OWNERS must include `area/manifests`.

### 3. Request Addition to OWNERS_ALIASES Approvers (New Teams Only)

> **Note:** This step requires approval from `general-approvers` or `managers-backup-approvers` since new teams cannot approve their own initial addition. This is the "bootstrap" step.

To enable your team to self-manage their section in `OWNERS_ALIASES` going forward, add your approvers alias to the `OWNERS_ALIASES` filter in the `OWNERS` file:

```yaml
filters:
  'OWNERS_ALIASES':
    approvers:
      - general-approvers
      - managers-backup-approvers
      # ... other existing approvers ...
      - your-team-approvers # Add your team here
```

**Why is this needed?**

- Without this, only `general-approvers` can approve changes to your team's aliases
- With this, your own approvers can add/remove team members without external approval
- This is a one-time setup; once added, your team is self-sufficient for future member changes

### 4. Create a PR and Verify

1. Commit your changes to `OWNERS_ALIASES` and the relevant `OWNERS` file(s)
2. Open a PR
3. If the CI fails with "invalid-owners-file", check that all usernames are org members
4. Once users are added to the org, comment `/verify-owners` to re-run the check

## Common Issues

### "OWNERS file contains untrusted users"

This error means one or more GitHub usernames in `OWNERS_ALIASES` are not members of the `opendatahub-io` organization. Solutions:

- Have an org admin invite the users
- Remove non-org-members from the aliases
- After fixing, comment `/verify-owners` on the PR

### Nested Aliases Don't Work

You **cannot** reference one alias from another alias in `OWNERS_ALIASES`:

```yaml
# ❌ This does NOT work
all-approvers:
  - team-a-approvers
  - team-b-approvers

# ✅ This works - list actual usernames
all-approvers:
  - user1
  - user2
```

However, any `OWNERS` file (including nested ones) can reference aliases defined in the root `OWNERS_ALIASES`.

## Example: Adding a New "Feature Store" Team

### Step 1: Add to OWNERS_ALIASES

```yaml
# Feature Store
feature-store-approvers:
  - alice
  - bob
feature-store-reviewers:
  - alice
  - bob
  - charlie
  - dana
```

### Step 2: Add a package OWNERS file

Create `packages/feature-store/OWNERS` (see [Package ownership](#package-ownership)):

```yaml
approvers:
  - feature-store-approvers
reviewers:
  - feature-store-reviewers
labels:
  - area/feature-store
  - area/components
options:
  no_parent_owners: true
```

### Step 3: Add to OWNERS_ALIASES approvers filter in OWNERS

```yaml
'OWNERS_ALIASES':
  approvers:
    - general-approvers
    - managers-backup-approvers
    # ... existing approvers ...
    - feature-store-approvers # NEW: enables self-management
```

### Step 4: Get approval and merge

Since this is a new team, request review from someone in `general-approvers`. After merge, the Feature Store team can manage their own aliases independently.

## Questions?

Reach out to the platform team or existing approvers listed in `general-approvers` for help.
