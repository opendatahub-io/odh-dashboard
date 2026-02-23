---
name: model-registry-upstream-sync
description: Sync upstream changes from kubeflow/model-registry and open a PR. Assist user with conflicts and document their nature in the PR.
---

# Model Registry Sync

Sync upstream changes from kubeflow/model-registry and open a PR.

This command orchestrates the entire sync process: branch creation, running the update-subtree script, resolving conflicts, running tests, and opening a PR.

## Workflow

### Phase 1: Setup

First, check the current branch state:

1. Run `git branch --show-current` to get the current branch name
2. Run `git status` to check for uncommitted changes or unresolved conflicts

**If on an `mr-sync-*` branch:**
- Continue with the existing branch (supports resuming a sync in progress)
- If there are unresolved conflicts (files in "Unmerged paths"), proceed to Phase 3
- If there are staged changes ready to continue, proceed to Phase 2 with `--continue`

**If on `main`:**
- Ensure working directory is clean (no uncommitted changes)
- Generate branch name: `mr-sync-YYYY-MM-DD` (use today's date)
- Check if this branch already exists with `git branch --list mr-sync-YYYY-MM-DD`
  - If it exists, ask user if they want to create `mr-sync-YYYY-MM-DD-2` (or find next available suffix)
- Create and switch to the branch: `git checkout -b <branch-name>`

**If on any other branch:**
- Ask user if they want to switch to main and start a fresh sync, or abort

### Phase 2: Run Sync Script

Run the update-subtree script from the `packages/model-registry` directory:

```bash
cd packages/model-registry && npm run update-subtree
```

Or if continuing after conflict resolution:
```bash
cd packages/model-registry && npm run update-subtree -- --continue
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
   - Continue the sync: `cd packages/model-registry && npm run update-subtree -- --continue`
   - Repeat this phase if more conflicts are encountered

### Phase 4: Run Tests

After the sync completes successfully, run tests:

```bash
cd packages/model-registry/upstream/frontend && npm run test:unit
```

```bash
cd packages/model-registry/upstream/frontend && npm run test:type-check
```

Report results to the user. If there are failures, let the user decide how to proceed.

### Phase 5: Create PR

Ask the user if they're ready to open a PR. If not, exit gracefully.

**Extract PR information:**

1. Get all sync commits since main:
   ```bash
   git log main..HEAD --oneline
   ```

2. Extract PR numbers from commit messages - look for patterns like `(#XXXX)` in messages that contain "Update @odh-dashboard/model-registry:"

3. Filter to only include commits with actual file changes (exclude commits that say "tracking" or "no file changes")

4. Get the upstream commit SHA from the latest sync commit or from `packages/model-registry/package.json`

**Build PR content:**

First, read the PR template at `.github/pull_request_template.md` to get the current structure and "Request review criteria" checklist. The PR body should follow this template's structure.

Title format:
```
Sync from kubeflow/model-registry <7-char-sha>
```

Body sections (following the PR template structure):

**Description section:**
```markdown
## Description

Sync to pull in changes from:
* https://github.com/kubeflow/model-registry/pull/<PR1>
* https://github.com/kubeflow/model-registry/pull/<PR2>
...

### Conflicts Resolved

The following conflicts were resolved during this sync:

**[#<PR> - <title>](https://github.com/kubeflow/model-registry/pull/<PR>)**
- `<file path>`
- `<file path>`

*Nature of conflict:* <Brief explanation of what caused the conflict - e.g., import path differences, overlapping code changes, etc.>

*Resolution:* <Brief explanation of how the conflict was resolved - e.g., kept both features, maintained downstream conventions while adding upstream changes, etc.>
```

**If there were no conflicts**, omit the "Conflicts Resolved" subsection entirely.

**How Has This Been Tested? section:**
```markdown
## How Has This Been Tested?

Tested by running backend, frontend and the federated MR package separately as described below, verifying existing behavior in the files this diff touches, and verifying the incoming changes.

Also ran unit tests: `npm run test:unit`
and ran type check: `npm run test:type-check`
(both in `packages/model-registry/upstream/frontend`)

Process to run everything locally this way:
* Create `.env.development.local` and copy the contents of `.env.development` to it. Change the backend port to 4020 to avoid conflicts with the upstream running.
* `oc login` to a cluster with ODH installed
* Run both `frontend` and `backend` folders with `npm run start:dev` after running `npm install` on odh-dashboard root repository
* Before continuing, install [kubectl](https://kubernetes.io/docs/tasks/tools/) and [golang](https://go.dev/doc/install)
* With these two terminal tabs open, open a third terminal tab, go to `packages/model-registry/upstream` and run `make dev-install-dependencies` followed by `PORT=9100 make dev-start-federated INSECURE_SKIP_VERIFY=true`
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
