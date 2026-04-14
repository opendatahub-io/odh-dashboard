---
name: upstream-sync-local
description: Sync upstream changes from a local repository clone. Pass a package name, local repo path, and branch as arguments. Supports cherry-pick (--commit=SHA) and range (--up-to=SHA) modes.
---

# Upstream Sync Local

Sync upstream changes from a local clone of the upstream repository into the monorepo.

This command orchestrates the local sync process: running the update-subtree-local script, resolving conflicts, running tests, and summarizing results. Unlike `/upstream-sync`, this does NOT create a PR — the branch is for local testing only.

## Arguments

- `$ARGUMENTS` — Required. Must include:
  - A package name (e.g. `model-registry`, `notebooks`)
  - A local repository path (absolute or relative path to the upstream clone)
  - A branch name in the local repository

  Optional flags (appended after the three required arguments):
  - `--commit=SHA` — Cherry-pick a single commit
  - `--up-to=SHA` — Apply all commits from current up to this commit

  Examples:
  - `model-registry /path/to/local/model-registry feature/my-changes`
  - `model-registry /path/to/local/model-registry main --commit=abc1234`
  - `model-registry /path/to/local/model-registry main --up-to=def5678`

## Resolving the Package

Packages with upstream subtrees have a `subtree` field in their `package.json` under `packages/<name>/package.json`.

1. Use the first argument as `<package-name>`.
2. Verify the package exists by reading `packages/<package-name>/package.json`.
3. Confirm it has a `subtree` config block and an `update-subtree-local` script.

If the package does not exist or lacks the required config, report the error and list available packages:

```bash
grep -rl '"subtree"' packages/*/package.json | sed 's|packages/||;s|/package.json||'
```

## Validating the Local Repo

Before running the sync:

1. Verify the local repo path exists and is a git repository:
   ```bash
   git -C <local-repo-path> rev-parse --is-inside-work-tree
   ```

2. Verify the branch exists in the local repo:
   ```bash
   git -C <local-repo-path> rev-parse --verify <branch>
   ```

3. If either check fails, report a clear error message with the expected format.

## Workflow

### Phase 1: Setup

1. Run `git branch --show-current` to get the current branch name.
2. Run `git status` to check for uncommitted changes.

**If on `main`:**
- Ensure working directory is clean.
- Ask the user what branch name to use for the local sync test, or suggest one (e.g., `test/local-sync-<pkg>-YYYY-MM-DD`).
- Create and switch to the branch: `git checkout -b <branch-name>`

**If on an existing branch:**
- Ask user if they want to continue on this branch or switch to main and start fresh.
- If continuing, check for unresolved conflicts and handle accordingly.

### Phase 2: Run Sync Script

Run the update-subtree-local script from the repository root:

```bash
npm run update-subtree-local -w packages/<package-name> -- \
  --local-repo=<local-repo-path> \
  --branch=<branch>
```

**With optional flags:**

```bash
# Cherry-pick a single commit
npm run update-subtree-local -w packages/<package-name> -- \
  --local-repo=<local-repo-path> \
  --branch=<branch> \
  --commit=<sha>

# Sync up to a specific commit
npm run update-subtree-local -w packages/<package-name> -- \
  --local-repo=<local-repo-path> \
  --branch=<branch> \
  --up-to=<sha>
```

**Continuing after conflict resolution:**

```bash
npm run update-subtree-local -w packages/<package-name> -- \
  --local-repo=<local-repo-path> \
  --branch=<branch> \
  --continue
```

Parse the output to detect:
- **Success messages** like "Applied commit X/Y: ..."
- **Conflict detection**: Look for "Conflict detected" in output
- **Completion**: Look for "Already up-to-date" or successful completion of all commits
- **DO NOT MERGE warnings**: The script automatically adds safety markers

### Phase 3: Conflict Resolution

When conflicts are detected:

1. **Identify conflicting files**: Run `git status` and look for files under "Unmerged paths".

2. **For each conflicting file**:
   - Read the file to find conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Analyze what "ours" (HEAD) contains vs what "theirs" (incoming) contains
   - Explain the conflict to the user and suggest a resolution strategy
   - Offer to apply the suggested resolution OR let the user handle it manually

3. **After resolution**:
   - Stage the resolved files: `git add <file1> <file2> ...`
   - Continue the sync:
     ```bash
     npm run update-subtree-local -w packages/<package-name> -- \
       --local-repo=<local-repo-path> \
       --branch=<branch> \
       --continue
     ```
   - Repeat this phase if more conflicts are encountered

### Phase 4: Run Tests

After the sync completes successfully, run tests. Check which test scripts are available in the package's upstream frontend:

```bash
cd packages/<package-name>/upstream/frontend && cat package.json | grep -E '"test:|"type-check'
```

Run whichever of these are available:

```bash
cd packages/<package-name>/upstream/frontend && npm run test:unit
```

```bash
cd packages/<package-name>/upstream/frontend && npm run test:type-check
```

Report results to the user. If there are failures, let the user decide how to proceed.

### Phase 5: Summary

Report the sync results to the user:

```markdown
## Local Sync Complete

**Package:** <package-name>
**Source:** <local-repo-path> @ <branch>
**Commits applied:** <count>
**Branch:** <branch-name>

### Applied Commits
- <commit-hash> <commit-message>
- ...

### Test Results
- Unit tests: <pass/fail>
- Type check: <pass/fail>

### ⚠️ DO NOT MERGE Warning
This branch contains `[DO NOT MERGE - LOCAL SYNC]` commits.
The `DO_NOT_MERGE_SYNCED_FROM_LOCAL` flag has been set in package.json.

**This branch is for local testing only.** After validating:
1. Discard this branch
2. Open the upstream PR
3. After the upstream PR merges, create a fresh branch from main
4. Run a normal PR sync: `/upstream-sync <package-name>`
```

## Error Handling

### Invalid package name
Report available packages and ask user to try again.

### Local repo path does not exist
Report the error and ask for the correct path.

### Branch does not exist
Report the error, list available branches in the local repo, and ask user to specify.

### Build failures
Report the failure, show relevant output, and let user decide how to proceed.

### Sync already up to date
Report that no new commits were found and the package is already synced to the latest commit on the specified branch.
