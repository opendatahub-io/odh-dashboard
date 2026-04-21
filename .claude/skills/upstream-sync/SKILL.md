---
name: upstream-sync
description: Sync upstream changes for a package and open a PR. Pass a package name as the first argument (e.g. model-registry or notebooks) or be prompted to choose. Optionally pass a PR URL to do a temporary test sync.
---

# Upstream Sync

Sync upstream changes for a package and open a PR.

This command orchestrates the entire sync process: branch creation, running the update-subtree script, resolving conflicts, running tests, and opening a PR.

## Arguments

- `$ARGUMENTS` — Optional. Can be:
  - A package name (e.g. `model-registry`, `notebooks`) — runs a normal sync for that package
  - A package name followed by a PR URL (e.g. `model-registry https://github.com/kubeflow/model-registry/pull/1234`) — runs a PR test sync
  - A PR URL alone (e.g. `https://github.com/kubeflow/model-registry/pull/1234`) — infers the package from the URL's repo
  - Empty — prompts the user to choose a package

## Resolving the Package

Packages with upstream subtrees have a `subtree` field in their `package.json` under `packages/<name>/package.json`.

1. If the user provided a package name argument, use it directly as `<package-name>`.
2. If the user provided only a PR URL, infer the package by matching the URL's GitHub owner/repo against the `subtree.repo` field in each package's `package.json`.
3. If no argument was provided, discover all packages with a `subtree` config:
   ```bash
   grep -rl '"subtree"' packages/*/package.json | sed 's|packages/||;s|/package.json||'
   ```
   Present the list to the user and ask which package to sync.

Once the package is identified, read `packages/<package-name>/package.json` to get the `subtree` config. Extract the upstream GitHub `<owner>/<repo>` from the `subtree.repo` URL.

## PR Test Mode

If the user passes a PR URL as an argument (e.g. `/upstream-sync model-registry https://github.com/kubeflow/model-registry/pull/1234`), this is a **temporary test sync** to validate an upstream PR's changes in odh-dashboard before the upstream PR merges. The differences from a normal sync are noted inline below with **[PR Test Mode]** markers.

## Workflow

### Phase 1: Setup

First, check the current branch state:

1. Run `git branch --show-current` to get the current branch name
2. Run `git status` to check for uncommitted changes or unresolved conflicts

**If on a `<pkg>-sync-*` or `tmp-sync-pr-*` branch:**
- Continue with the existing branch (supports resuming a sync in progress)
- If there are unresolved conflicts (files in "Unmerged paths"), proceed to Phase 3
- If there are staged changes ready to continue, proceed to Phase 2 with `--continue`

**If on `main`:**
- Ensure working directory is clean (no uncommitted changes)
- Run `git pull` to ensure main is up to date before starting the sync
- **[PR Test Mode]** Generate branch name: `tmp-sync-pr-<number>` (extract the PR number from the URL)
- **[Normal Mode]** Generate branch name: `<pkg>-sync-YYYY-MM-DD` (use today's date; `<pkg>` is a short prefix like `mr` for model-registry, `nb` for notebooks, etc.)
- Check if this branch already exists with `git branch --list <branch-name>`
  - If it exists, ask user if they want to create `<branch-name>-2` (or find next available suffix)
- Create and switch to the branch: `git checkout -b <branch-name>`

**If on any other branch:**
- Ask user if they want to switch to main and start a fresh sync, or abort

### Phase 2: Run Sync Script

Run the update-subtree script from the `packages/<package-name>` directory:

```bash
cd packages/<package-name> && npm run update-subtree
```

**[PR Test Mode]** Pass the `--pr` flag with the PR URL:
```bash
cd packages/<package-name> && npm run update-subtree -- --pr=<pr-url>
```

Or if continuing after conflict resolution:
```bash
cd packages/<package-name> && npm run update-subtree -- --continue
```

Parse the output to detect:
- **Success messages** like "Applied commit X/Y: ..."
- **Conflict detection**: Look for "Conflict detected" in output
- **Completion**: Look for "Already up-to-date" or successful completion of all commits
- **Upstream commit SHA**: The commit hash being synced to (appears in output and commit messages)

### Phase 3: Conflict Resolution

When conflicts are detected:

1. **Identify conflicting files**: Run `git status` and look for files under "Unmerged paths"

2. **Record conflict info** for later use in PR description:
   - The PR number and title (from the script's output message, e.g., "Commit message: Add tensor type filter (#2135)")
   - The specific file paths that have conflicts
   - The nature of the conflict (what caused it - e.g., import path conventions differ between upstream and downstream, overlapping changes to the same code section, etc.)
   - How the conflict was resolved (e.g., kept both features, maintained downstream conventions while incorporating upstream changes, etc.)

3. **For each conflicting file**:
   - Read the file to find conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Analyze what "ours" (HEAD) contains vs what "theirs" (incoming) contains
   - Explain the conflict to the user and suggest a resolution strategy
   - Offer to apply the suggested resolution OR let the user handle it manually

4. **After resolution**:
   - Stage the resolved files: `git add <file1> <file2> ...`
   - Continue the sync: `cd packages/<package-name> && npm run update-subtree -- --continue`
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

### Phase 5: Create PR

Ask the user if they're ready to open a PR. If not, exit gracefully.

**Extract PR information:**

1. Get all sync commits since main:
   ```bash
   git log main..HEAD --oneline
   ```

2. Extract PR numbers from commit messages - look for patterns like `(#XXXX)` in messages that contain "Update @odh-dashboard/<package-name>:"

3. Filter to only include commits with actual file changes (exclude commits that say "tracking" or "no file changes")

4. Get the upstream commit SHA from the latest sync commit or from `packages/<package-name>/package.json`

**Build PR content:**

First, read the PR template at `.github/pull_request_template.md` to get the current structure and "Request review criteria" checklist. The PR body should follow this template's structure.

**[Normal Mode]** Title format:
```text
Sync from <owner>/<repo> <7-char-sha>
```

**[PR Test Mode]** Title format:
```text
[DO NOT MERGE] Test sync for <owner>/<repo>#<pr-number>
```

Body sections (following the PR template structure):

**[PR Test Mode] Description section:**
```markdown
## Description

**This is a temporary test sync and should not be merged.**

This PR syncs the changes from [<owner>/<repo>#<pr-number>](https://github.com/<owner>/<repo>/pull/<pr-number>) into odh-dashboard so they can be tested before the upstream PR merges. The branch is available for local testing or CI validation.
```

Then include the "Conflicts Resolved" subsection (if any), "How Has This Been Tested?", "Test Impact", and "Request review criteria" sections as normal.

**[Normal Mode] Description section:**
```markdown
## Description

Sync to pull in changes from:
* https://github.com/<owner>/<repo>/pull/<PR1>
* https://github.com/<owner>/<repo>/pull/<PR2>
...

### Conflicts Resolved

The following conflicts were resolved during this sync:

**[#<PR> - <title>](https://github.com/<owner>/<repo>/pull/<PR>)**
- `<file path>`
- `<file path>`

*Nature of conflict:* <Brief explanation of what caused the conflict - e.g., import path differences, overlapping code changes, etc.>

*Resolution:* <Brief explanation of how the conflict was resolved - e.g., kept both features, maintained downstream conventions while adding upstream changes, etc.>
```

**If there were no conflicts**, omit the "Conflicts Resolved" subsection entirely.

**How Has This Been Tested? section:**
```markdown
## How Has This Been Tested?

Tested by running the federated <package-name> package locally, verifying existing behavior in the files this diff touches, and verifying the incoming changes.

Also ran available test scripts in `packages/<package-name>/upstream/frontend`.
```

**Test Impact section:**
```markdown
## Test Impact

Upstream changes include their own tests.
```

**Request review criteria section:**
Copy the "Request review criteria" section exactly as it appears in `.github/pull_request_template.md`, including all checklist items. It is not hard-coded here, read it from the template file to ensure it stays current.

**Push and create PR:**

1. Ask user for confirmation before pushing
2. Push the branch: `git push -u origin <branch-name>`
3. Create the PR:
   ```bash
   gh pr create --title "<title>" --body "<body>"
   ```
4. Report the PR URL to the user
5. **Only if in PR Test Mode** (the user passed a PR URL argument — the branch name starts with `tmp-sync-pr-`): immediately close the PR after creating it, since it exists only to share the branch and trigger CI:
   ```bash
   gh pr close <pr-number>
   ```
   **Do NOT close the PR in normal mode.** Normal sync PRs are meant to be reviewed and merged.
