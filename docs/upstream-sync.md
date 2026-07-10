# Upstream Sync Guide

This document explains how to sync upstream changes into odh-dashboard's monorepo packages.

## Overview

Several odh-dashboard packages (e.g., `model-registry`, `notebooks`) contain a copy of code from an upstream repository. The subtree sync scripts keep this copy up to date by applying upstream commits as incremental patches.

There are two sync methods:

| Method | Script | Use case |
|--------|--------|----------|
| **PR sync** | `update-subtree` | Sync from the official upstream repo (or test an upstream PR) |
| **Local sync** | `update-subtree-local` | Sync from a local clone of the upstream repo |

Both scripts live in `packages/app-config/scripts/` and are invoked via npm workspace scripts.

## How It Works

Each package with an upstream subtree has a `subtree` config block in its `package.json`:

```json
{
  "subtree": {
    "repo": "https://github.com/kubeflow/model-registry.git",
    "branch": "main",
    "src": "clients/ui",
    "target": "upstream",
    "commit": "5ea29b0d7d1638634880651f10c48d368af84344"
  }
}
```

- **repo** -- upstream GitHub repository URL
- **branch** -- upstream branch to track
- **src** -- subdirectory within the upstream repo to sync (e.g., `clients/ui`)
- **target** -- directory within the package where upstream code lives (e.g., `upstream/`)
- **commit** -- SHA of the last synced upstream commit

The scripts compare the stored `commit` against the target branch, generate `git format-patch` patches for each new commit, filter them to the `src` subdirectory, transform paths, and apply them with `git apply --3way --index` into the `target` directory. Each upstream commit produces a corresponding monorepo commit.

## Method 1: PR Sync (`update-subtree`)

Use PR sync to pull changes from the official upstream repository.

### When to Use

- Regular sync to bring upstream changes into odh-dashboard
- Testing an upstream PR before it merges (PR test mode)

### Basic Usage

```bash
# From the repository root
npm run update-subtree -w packages/model-registry
```

This fetches the upstream repo, finds all new commits since the last sync, and applies them.

### PR Test Mode

To test an upstream PR's changes before the PR merges:

```bash
npm run update-subtree -w packages/model-registry -- --pr=https://github.com/kubeflow/model-registry/pull/1234
```

This temporarily overrides the `package.json` config to point at the PR's branch, applies the changes, then marks all commits with `[DO NOT MERGE - PR TEST SYNC]`. After testing, discard this branch.

### Using the Claude Code Skill

The `/upstream-sync` Claude Code skill automates the full PR sync workflow:

```text
/upstream-sync model-registry
/upstream-sync model-registry https://github.com/kubeflow/model-registry/pull/1234
```

See the [Claude Code Skills](#claude-code-skills) section below for details.

## Method 2: Local Sync (`update-subtree-local`)

Use local sync to test changes from a local clone of the upstream repository before they are merged upstream.

### When to Use

- Testing a local upstream branch in the monorepo context
- Developing upstream + midstream changes simultaneously
- Validating that upstream changes integrate correctly before opening an upstream PR

### Basic Usage

```bash
# Sync all new commits from a local branch
npm run update-subtree-local -w packages/model-registry -- \
  --local-repo=/path/to/local/model-registry \
  --branch=feature/my-changes
```

### Available Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--local-repo=PATH` | Yes | Path to the local upstream repository (absolute or relative) |
| `--branch=BRANCH` | Yes | Branch in the local repository to sync from |
| `--commit=SHA` | No | Apply only this specific commit (cherry-pick mode) |
| `--up-to=SHA` | No | Apply all commits from current up to this commit (range mode) |
| `--continue` | No | Resume after resolving conflicts |

### Examples

```bash
# Sync all new commits from a branch
npm run update-subtree-local -w packages/model-registry -- \
  --local-repo=/path/to/local/model-registry \
  --branch=feature/new-ui

# Cherry-pick a single commit
npm run update-subtree-local -w packages/model-registry -- \
  --local-repo=/path/to/local/model-registry \
  --branch=main \
  --commit=abc1234

# Sync up to a specific commit
npm run update-subtree-local -w packages/model-registry -- \
  --local-repo=/path/to/local/model-registry \
  --branch=main \
  --up-to=def5678

# Continue after resolving conflicts
npm run update-subtree-local -w packages/model-registry -- \
  --local-repo=/path/to/local/model-registry \
  --branch=feature/new-ui \
  --continue
```

### DO NOT MERGE Safety

Local sync automatically:

1. Adds a `DO_NOT_MERGE_SYNCED_FROM_LOCAL` flag to `package.json`
2. Prefixes all sync commits with `[DO NOT MERGE - LOCAL SYNC]`
3. Shows a warning banner after completion

These changes exist only for local testing. After validating, discard the branch. Once the upstream changes merge officially, create a fresh branch and run a normal PR sync.

### Using the Claude Code Skill

The `/upstream-sync-local` Claude Code skill automates the local sync workflow:

```text
/upstream-sync-local model-registry /path/to/local/model-registry feature/my-changes
```

See the [Claude Code Skills](#claude-code-skills) section below for details.

## Resolving Conflicts

Both sync methods stop when a patch cannot be applied cleanly. The script reports which commit caused the conflict and provides resolution steps.

### Conflict Resolution Workflow

1. **Find conflict markers** in the target directory:

   ```bash
   # Look for git conflict markers (exclude node_modules and binaries)
   grep -rn '<<<<<<' packages/<package-name>/upstream/ --include='*.ts' --include='*.tsx' --include='*.go' --include='*.yaml'

   # Look for script-injected markers
   grep -rn 'PATCH FAILED' packages/<package-name>/upstream/ --include='*.ts' --include='*.tsx' --include='*.go'
   ```

2. **Resolve each conflict** by editing the files:
   - Review what the patch intended to change
   - Apply the changes manually
   - Remove all conflict marker lines

3. **Verify your changes**:

   ```bash
   git diff packages/<package-name>
   ```

4. **Stage resolved files**:

   ```bash
   git add packages/<package-name>
   ```

5. **Continue the sync**:

   ```bash
   # For PR sync
   npm run update-subtree -w packages/<package-name> -- --continue

   # For local sync (must pass --local-repo and --branch again)
   npm run update-subtree-local -w packages/<package-name> -- \
     --local-repo=/path/to/local/upstream-repo \
     --branch=feature/my-changes \
     --continue
   ```

6. If more conflicts appear, repeat from step 1.

### Common Conflict Scenarios

- **Import path differences**: Upstream uses different import conventions than downstream. Keep downstream conventions while incorporating the upstream change.
- **Overlapping changes**: Both upstream and downstream modified the same code. Merge both sets of changes.
- **File not in monorepo**: Upstream added or modified a file that doesn't exist in the monorepo. Decide whether to include it or skip it.

## Differences Between the Two Methods

| Aspect | PR Sync | Local Sync |
|--------|---------|------------|
| Source | Clones upstream repo from GitHub | Reads from a local directory |
| Network | Requires internet access | Works offline |
| Commit prefix | `[DO NOT MERGE - PR TEST SYNC]` (PR mode) | `[DO NOT MERGE - LOCAL SYNC]` |
| Package.json flag | `DO_NOT_MERGE_OVERRIDDEN_FOR_PR` (PR mode) | `DO_NOT_MERGE_SYNCED_FROM_LOCAL` |
| Use case | Official syncs, upstream PR testing | Local development, pre-merge testing |
| Branch naming | `<pkg>-sync-YYYY-MM-DD` or `tmp-sync-pr-<N>` | Any branch name (your choice) |

## Recommended Workflow

### Developing upstream changes alongside midstream

1. Create a feature branch in the upstream repo and make your changes
2. Create a branch in odh-dashboard (e.g., `git checkout -b test/my-upstream-feature`)
3. Run local sync to bring upstream changes into the monorepo:
   ```bash
   npm run update-subtree-local -w packages/model-registry -- \
     --local-repo=/path/to/local/model-registry \
     --branch=feature/my-changes
   ```
4. Test the integration locally
5. Open the upstream PR
6. After the upstream PR merges, discard the odh-dashboard test branch
7. Create a fresh branch from main and run a normal PR sync

### Regular upstream sync

1. Check sync status: `/upstream-sync-status model-registry`
2. Run sync: `/upstream-sync model-registry`
3. Resolve any conflicts
4. Run tests
5. Open a PR

## Claude Code Skills

Three Claude Code skills automate the sync workflows. All are available via slash commands.

### `/upstream-sync`

Orchestrates the full PR sync workflow: branch creation, running the script, conflict resolution, tests, and PR creation.

```text
# Normal sync
/upstream-sync model-registry

# Test an upstream PR
/upstream-sync model-registry https://github.com/kubeflow/model-registry/pull/1234
```

### `/upstream-sync-local`

Orchestrates local sync from a local upstream repository clone.

```text
# Sync all new commits from a branch
/upstream-sync-local model-registry /path/to/local/model-registry feature/my-changes

# Cherry-pick a single commit
/upstream-sync-local model-registry /path/to/local/model-registry main --commit=abc1234

# Sync up to a specific commit
/upstream-sync-local model-registry /path/to/local/model-registry main --up-to=def5678
```

### `/upstream-sync-status`

Checks whether a package's upstream copy is up to date.

```text
/upstream-sync-status model-registry
```

## Discovering Packages with Subtree Config

To find all packages that support upstream sync:

```bash
grep -rl '"subtree"' packages/*/package.json | sed 's|packages/||;s|/package.json||'
```

## Troubleshooting

### "does not exist in index" errors

This happens when a patch modifies a file that exists in the upstream repo but not in the monorepo's git index. The local sync script handles this automatically by pre-populating the index with base blob objects. If you still encounter this error, ensure you are using the latest version of the script.

### Three-way merge failures

The scripts use `git apply --3way` which requires the base blob objects from the upstream repo. The PR sync script handles this by cloning the upstream repo. The local sync script handles this by adding the local repo as a temporary git remote and fetching its objects.

### "DO NOT MERGE" commits left over

If you see `[DO NOT MERGE - LOCAL SYNC]` commits in your branch, you ran a local sync. These should never be merged to main. Create a fresh branch from main and run a normal PR sync after the upstream changes are merged.

### Partial sync (some commits applied, then conflict)

The `--continue` flag picks up where the script left off. After resolving conflicts, stage files and run with `--continue`. The script tracks progress in `package.json`'s `subtree.commit` field, which is updated after each successfully applied commit.
