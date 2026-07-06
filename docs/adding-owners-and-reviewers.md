# Adding Approvers and Reviewers

This guide explains how to add a new team's approvers and reviewers to the ODH Dashboard repository.

## Overview

The repository uses two files to manage code ownership:

- **`OWNERS`** — Defines which files/directories each team owns and which alias groups can approve/review them
- **`OWNERS_ALIASES`** — Defines the actual GitHub usernames for each approver/reviewer group

## Authorization Model

There are two different workflows depending on your situation:

| Scenario                  | Who Can Approve                                    | What You Can Change                                 |
| ------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| **New team onboarding**   | `general-approvers` or `managers-backup-approvers` | Add your team to both `OWNERS` and `OWNERS_ALIASES` |
| **Existing team updates** | Your own team's approvers                          | Modify only your team's section in `OWNERS_ALIASES` |

### New Team Onboarding (Bootstrap)

If your team is **not yet listed** in the `OWNERS` file, you'll need approval from `general-approvers` or `managers-backup-approvers` to be added. This is a one-time bootstrap process.

1. Create a PR adding your team to `OWNERS_ALIASES` and `OWNERS`
2. Request a review from someone in `general-approvers` (see list in `OWNERS_ALIASES`)
3. Once approved and merged, your team can self-manage future changes

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

### 2. Add File Path Rules to `OWNERS`

Open `OWNERS` and add a filter block that maps your code paths to your team:

```yaml
filters:
  # ... existing filters ...

  # Your Team Name
  'path/to/your/code/.*':
    approvers:
      - your-team-approvers
    reviewers:
      - your-team-reviewers
    labels:
      - 'area/your-team'
```

**Path pattern examples:**

- Single directory: `'packages/your-package/.*'`
- Multiple paths: `'(frontend/src/pages/yourFeature|packages/your-package)/.*'`
- Specific file types: `'frontend/src/.*\.test\.ts'`

**About labels:**

The `labels` field automatically applies GitHub labels to PRs that touch matching files. Before using a label in your OWNERS filter:

1. Check if the label already exists in the [repository's labels](https://github.com/opendatahub-io/odh-dashboard/labels)
2. If it doesn't exist, request a repository admin to create it before merging your PR
3. Use the naming convention `area/your-team` for team-specific labels

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

1. Commit your changes to both `OWNERS` and `OWNERS_ALIASES`
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

However, the `OWNERS` file **can** reference aliases defined in `OWNERS_ALIASES`.

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

### Step 2: Add file path filter to OWNERS

```yaml
# Feature Store
'packages/feature-store/.*':
  approvers:
    - feature-store-approvers
  reviewers:
    - feature-store-reviewers
  labels:
    - 'area/feature-store'
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
