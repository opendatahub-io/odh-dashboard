---
name: upstream-sync-status
description: Check whether odh-dashboard's copy of an upstream package is up to date, and show any unsynced commits. Pass a package name as an argument (e.g. model-registry or notebooks) or be prompted to choose.
---

# Upstream Sync Status

Check whether `odh-dashboard`'s copy of an upstream package is up to date.

## Arguments

- `$ARGUMENTS` — Optional package name (e.g. `model-registry`, `notebooks`). If not provided, ask the user which package to check.

## Resolving the Package

Packages with upstream subtrees have a `subtree` field in their `package.json` under `packages/<name>/package.json`.

1. If the user provided a package name argument, use it directly as `<package-name>`.
2. If no argument was provided, discover all packages with a `subtree` config:
   ```bash
   grep -rl '"subtree"' packages/*/package.json | sed 's|packages/||;s|/package.json||'
   ```
   Present the list to the user and ask which package to check.

Once the package is identified, all references below use `<package-name>` for the directory under `packages/` and the subtree config from `packages/<package-name>/package.json`.

## Workflow

### Step 0: Check local main branch status

Before checking upstream, verify that the local `main` branch is up to date with `opendatahub-io/odh-dashboard` main. The canonical remote for this repo is `upstream` (not `origin`, which is the user's fork):

```bash
git fetch upstream main
```

Compare the local `main` ref with `upstream/main`:

```bash
git rev-parse main
git rev-parse upstream/main
```

If they differ, count how many commits the local branch is behind:

```bash
git rev-list --count main..upstream/main
```

Include this status in the report output (Step 5). If the local branch is behind, warn the user and suggest running `git pull upstream main` before proceeding with a sync.

### Step 1: Read subtree config from GitHub

Fetch `packages/<package-name>/package.json` from the `main` branch of `opendatahub-io/odh-dashboard` on GitHub:

```bash
gh api "repos/opendatahub-io/odh-dashboard/contents/packages/<package-name>/package.json?ref=main" --jq '.content' | base64 -d
```

Extract the `subtree` object from the JSON. It contains:
- `repo` — the upstream GitHub repo URL (e.g. `https://github.com/kubeflow/model-registry.git`)
- `branch` — the upstream branch to track (e.g. `main`)
- `src` — the subdirectory in the upstream repo (e.g. `clients/ui`; may be empty string for whole-repo syncs)
- `commit` — the SHA of the last synced upstream commit

Parse the GitHub owner/repo from the `repo` URL (strip `https://github.com/` prefix and `.git` suffix).

### Step 2: Get commits since last sync from GitHub API

Use `gh api` to compare the synced commit against the upstream branch:

```bash
gh api "repos/<owner>/<repo>/compare/<commit>...<branch>" --jq '[.commits[].sha]'
```

### Step 3: Filter to commits touching the subtree src directory

If `src` is a non-empty string, filter commits to only those touching files under the `src` path:

For each commit SHA returned, check whether it touches files under the `src` path:

```bash
gh api "repos/<owner>/<repo>/commits/<sha>" --jq '[.files[].filename]'
```

Keep only commits where at least one file starts with the `src` prefix.

If `src` is an empty string, all commits are relevant (the entire repo is synced).

### Step 4: Get PR details for each relevant commit

Extract the PR number from each commit message (look for `(#XXXX)` pattern). For each PR number, fetch details:

```bash
gh api "repos/<owner>/<repo>/pulls/<pr_number>" --jq '{author: .user.login, merged_at: .merged_at}'
```

### Step 5: Output the report

Output a report with a title and a summary table.

**If there are no unsynced commits:**

```markdown
## <Package-Name> Sync Status

odh-dashboard's copy of the <package-name> upstream is up to date at commit `<short-sha>`.
```

**If there are unsynced commits:**

```markdown
## <Package-Name> Sync Status

odh-dashboard's copy of the <package-name> upstream is not up to date. There are **N commits** on `<owner>/<repo>` `<branch>` (since synced commit `<short-sha>`) that touch `<src>`:

| Commit | PR | Author | Merged | Description |
|--------|----|--------|--------|-------------|
| `<short-sha>` | [#XXXX](https://github.com/<owner>/<repo>/pull/XXXX) | author | YYYY-MM-DD | commit message without PR ref |
...
```

- The Commit column shows the first 11 characters of the SHA.
- The PR column is a markdown link to the pull request on GitHub.
- The Author column is the GitHub username of the PR author.
- The Merged column is the merge date (YYYY-MM-DD).
- The Description column is the first line of the commit message with the trailing `(#XXXX)` removed.

If `src` is empty, omit the "that touch `<src>`" clause from the summary.

**Local branch status (always shown after the upstream report):**

If local `main` matches `upstream/main`:
```markdown
Local `main` is up to date with `upstream/main` (`opendatahub-io/odh-dashboard`).
```

If local `main` is behind:
```markdown
**Warning:** Local `main` is **N commits behind** `upstream/main` (`opendatahub-io/odh-dashboard`). Run `git pull upstream main` to update before syncing.
```

### Step 6: Offer to sync

If there are unsynced commits, ask the user if they would like to run `/upstream-sync <package-name>` to sync the changes. If the local `main` branch is also behind `upstream/main`, remind the user that a `git pull upstream main` will be needed first (the sync skill handles this automatically).
