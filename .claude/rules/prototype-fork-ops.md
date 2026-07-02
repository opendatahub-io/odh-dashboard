# Prototype Fork Operations

Shared procedures for the `prototype-*` skill family. Referenced by `/prototype-spec` and `/prototype-tickets`.

## Prerequisites

- **Red Hat VPN** — prototype (`*.pages.redhat.com`) and GitLab (`gitlab.cee.redhat.com`) are internal
- **SSH key for GitLab** — `ssh -T git@gitlab.cee.redhat.com` must succeed
- **Atlassian MCP connected** — for reading/creating Jira tickets at `redhat.atlassian.net`

## Jira key extraction

`--ticket` and `--epic` accept both bare keys and full URLs:
- `RHOAIENG-12345` → use as-is
- `https://redhat.atlassian.net/browse/RHOAIENG-12345` → extract `RHOAIENG-12345`

Extract with: match `[A-Z]+-\d+` from the end of the URL path.

## Procedure 1: Clone or update the fork

Extract the **owner and project name** from the SSH URL to create a unique cache path per designer.

- SSH: `git@gitlab.cee.redhat.com:ralombar/rhoai-rachel.git` → `ralombar/rhoai-rachel`
- HTTPS: `https://gitlab.cee.redhat.com/ralombar/rhoai-rachel.git` → `ralombar/rhoai-rachel`
- Nested groups: `git@gitlab.cee.redhat.com:group/subgroup/project.git` → `group/subgroup/project` (full namespace)

**Validate each path segment:**
- Must contain only `[a-zA-Z0-9_-]`
- Must not contain `..` (path traversal)
- Must not be empty

If the URL is HTTPS instead of SSH, accept it — git clone works with both.

Cache directory: `~/.cache/rhoai-prototype-reader/forks/<owner>/<project-name>/`

This prevents cache collisions when different designers fork the same upstream repo (e.g., `ralombar/rhoai-rachel` vs `rleboull/rhoai` cache to different directories).

**IMPORTANT: Always use `git -C <path>` for every git command — never `cd` into the fork directory.** The working directory must stay at the project root.

```bash
FORK_DIR="$HOME/.cache/rhoai-prototype-reader/forks/<owner>/<project-name>"
mkdir -p "$HOME/.cache/rhoai-prototype-reader/forks/<owner>"

if [ -d "$FORK_DIR/.git" ]; then
  # Verify the repo isn't corrupt (handles interrupted previous clones)
  if git -C "$FORK_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    git -C "$FORK_DIR" fetch origin 2>&1
  else
    echo "Corrupt cache detected, re-cloning..."
    rm -rf "$FORK_DIR"
    git clone <fork-ssh-url> "$FORK_DIR" 2>&1
  fi
else
  # Clean up partial clone artifacts if any
  [ -d "$FORK_DIR" ] && rm -rf "$FORK_DIR"
  git clone <fork-ssh-url> "$FORK_DIR" 2>&1
fi
```

### Clone failure diagnostics

- **"Connection timed out" or hangs** → Not on VPN:
  > **Cannot reach `gitlab.cee.redhat.com`.** Connect to the Red Hat VPN and try again.

- **"Permission denied (publickey)"** → SSH key not set up:
  > **SSH authentication failed.** Run `ssh -T git@gitlab.cee.redhat.com` to test.
  > If that fails, set up your SSH key: https://docs.gitlab.com/ee/user/ssh.html

- **"Repository not found" or 404** → Wrong URL or fork was deleted:
  > **Fork not found at `<ssh-url>`.** Check the URL at https://gitlab.cee.redhat.com/uxd/prototypes/rhoai/-/forks

- **Any other error** → Print the error and stop.

### Checkout and upstream setup

```bash
# Detect default branch (locale-independent — avoids parsing English "HEAD branch" text)
FORK_BRANCH=$(git -C "$FORK_DIR" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
if [ -z "$FORK_BRANCH" ]; then
  git -C "$FORK_DIR" remote set-head origin --auto 2>/dev/null
  FORK_BRANCH=$(git -C "$FORK_DIR" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
fi
git -C "$FORK_DIR" checkout "${FORK_BRANCH:-main}" 2>&1
if ! git -C "$FORK_DIR" pull origin "${FORK_BRANCH:-main}" --ff-only 2>/dev/null; then
  echo "Fast-forward pull failed (designer may have force-pushed). Resetting to origin."
  git -C "$FORK_DIR" reset --hard "origin/${FORK_BRANCH:-main}" 2>&1
fi

EXPECTED_UPSTREAM="git@gitlab.cee.redhat.com:uxd/prototypes/rhoai.git"
CURRENT_UPSTREAM=$(git -C "$FORK_DIR" remote get-url upstream 2>/dev/null || echo "")
if [ "$CURRENT_UPSTREAM" != "$EXPECTED_UPSTREAM" ]; then
  git -C "$FORK_DIR" remote remove upstream 2>/dev/null || true
  git -C "$FORK_DIR" remote add upstream "$EXPECTED_UPSTREAM"
fi
git -C "$FORK_DIR" fetch upstream 2>&1
git -C "$FORK_DIR" remote set-head upstream --auto 2>/dev/null || true
```

## Procedure 2: Detect upstream base branch

**IMPORTANT:** Run Procedures 1 and 2 in the SAME bash command (or ensure Procedure 1's `fetch upstream` completed before running Procedure 2). If they run in separate bash calls, the upstream refs may not be available yet.

**If `--base <branch>` was provided**, use it directly (skip auto-detection):
```bash
if [ -n "$EXPLICIT_BASE" ]; then
  if git -C "$FORK_DIR" rev-parse --verify "upstream/$EXPLICIT_BASE" >/dev/null 2>&1; then
    DEFAULT_BRANCH="$EXPLICIT_BASE"
  else
    echo "ERROR: upstream/$EXPLICIT_BASE does not exist."
    echo "Available: $(git -C "$FORK_DIR" branch -r --list 'upstream/*' | sed 's|upstream/||' | tr '\n' ', ')"
    # Stop here
  fi
fi
```

**Otherwise, auto-detect** the branch the fork was actually based on. The upstream's current default branch may have moved (e.g., `3.5` → `3.6`) after the designer forked, so diffing against the default produces a noisy diff full of upstream changes.

Auto-detection uses `git merge-base` distance — the upstream branch whose merge-base is closest to the fork HEAD is the one the designer forked from:

```bash
# Ensure upstream refs exist
if ! git -C "$FORK_DIR" branch -r --list 'upstream/*' 2>/dev/null | grep -q 'upstream/'; then
  git -C "$FORK_DIR" fetch upstream 2>&1
  git -C "$FORK_DIR" remote set-head upstream --auto 2>/dev/null || true
fi

# Auto-detect: find the upstream branch with the shortest distance to fork HEAD
BEST_BRANCH=""
BEST_DISTANCE=999999
for branch in $(git -C "$FORK_DIR" branch -r --list 'upstream/*' 2>/dev/null | sed 's|.*upstream/||' | grep -v HEAD); do
  base=$(git -C "$FORK_DIR" merge-base HEAD "upstream/$branch" 2>/dev/null)
  if [ -n "$base" ]; then
    distance=$(git -C "$FORK_DIR" rev-list --count "$base..HEAD" 2>/dev/null || echo 999999)
    if [ "$distance" -lt "$BEST_DISTANCE" ]; then
      BEST_DISTANCE=$distance
      BEST_BRANCH=$branch
    fi
  fi
done

if [ -n "$BEST_BRANCH" ]; then
  DEFAULT_BRANCH="$BEST_BRANCH"
else
  # Fallback: upstream HEAD or versioned branches
  DEFAULT_BRANCH=$(git -C "$FORK_DIR" symbolic-ref refs/remotes/upstream/HEAD 2>/dev/null | sed 's|refs/remotes/upstream/||')
  if [ -z "$DEFAULT_BRANCH" ]; then
    for branch in $(git -C "$FORK_DIR" branch -r --list 'upstream/*' 2>/dev/null | sed 's|upstream/||' | grep -oE '(v?|release[-/]?)[0-9]+\.[0-9]+' | sort -t. -k1,1Vr -k2,2Vr | head -5) main master; do
      if git -C "$FORK_DIR" rev-parse --verify "upstream/$branch" >/dev/null 2>&1; then
        DEFAULT_BRANCH="$branch"
        break
      fi
    done
  fi
fi
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"
```

**Log the detected base** so the developer knows what's being compared:
```bash
echo "=== Diffing fork against upstream/$DEFAULT_BRANCH (auto-detected) ==="
```

## Procedure 3: Get changed files and handle zero-diff

```bash
git -C "$FORK_DIR" diff upstream/$DEFAULT_BRANCH...HEAD --name-only -- src/
```

**If the diff returns zero files**, the designer may be working on a feature branch. Check:

```bash
git -C "$FORK_DIR" branch -r --list 'origin/*' | grep -v HEAD
```

Ask: "The fork's default branch has no changes vs upstream. The designer may be working on a different branch. Which branch should I check?" List the available branches.

If the developer specifies a branch, checkout that branch and re-run the diff.

If no branch has changes vs upstream, stop:
> **No design changes found.** The fork appears identical to upstream on all branches. Confirm the fork URL is correct, or ask the designer which branch contains their work.

## Procedure 4: CLI fast scan (optional — requires prototype-reader CLI)

If the prototype-reader CLI is available at `~/.cache/rhoai-prototype-reader/cli/`, run `read-design` on the fork for a structured inventory of changes before reading TSX files manually. This is a **fast first pass** — it parses the git diff and returns feature areas, PF components, and scenario labels in seconds, without reading full files.

```bash
CLI_DIR="$HOME/.cache/rhoai-prototype-reader/cli"
if [ -f "$CLI_DIR/dist/bin/cli.js" ]; then
  node "$CLI_DIR/dist/bin/cli.js" read-design "$FORK_DIR" --base "$DEFAULT_BRANCH" --remote upstream --pretty 2>&1
fi
```

**Output** (`DesignDiffResult` JSON):
```json
{
  "fork": { "owner": "ralombar", "branch": "launcher" },
  "baseBranch": "3.5",
  "featureAreas": [
    {
      "name": "Develop & Train",
      "newComponents": ["Select", "Checkbox", "ExpandableSection"],
      "newScenarios": ["Default (happy path)", "4b — Key collision"],
      "filesChanged": ["src/app/DevelopTrain/Workbenches/CreateWorkbenchProductForm.tsx"]
    }
  ],
  "summary": "5 files changed across 2 feature areas, 12 PF components used"
}
```

**How to use the output:**
- `featureAreas[].filesChanged` → prioritize which TSX files to read fully in Step 4
- `featureAreas[].newComponents` → know which PF components to expect before reading
- `featureAreas[].newScenarios` → pre-populated scenario list (verify against full TSX reading)
- `summary` → quick overview for the developer

**If the CLI is not available or `read-design` fails**, skip this step — the manual diff + TSX reading in subsequent steps covers everything. This is a performance optimization, not a requirement.

## URL-to-directory mapping

Map prototype URL paths to fork source directories:

| URL path segment | Source directory | Area label |
|---|---|---|
| `/develop-train/` | `src/app/DevelopTrain/` | Develop & Train |
| `/settings/` | `src/app/Settings/` | Settings |
| `/ai-hub/` | `src/app/AIHub/` | AI Hub |
| `/projects/` | `src/app/Projects/` | Projects |
| `/gen-ai-studio/` | `src/app/GenAIStudio/` | Gen AI Studio |
| `/observe/` | `src/app/ObserveMonitor/` | Observe & Monitor |
| `/home/` | `src/app/Home/` | Home |
| `/dashboard/` | `src/app/Dashboard/` | Dashboard |
| `/connections/` | `src/app/Connections/` | Connections |

## URL validation

**If the URL doesn't match `https://rhoai-*-*.pages.redhat.com/...`**, warn:
> This URL doesn't look like a standard RHOAI prototype URL. Expected format: `https://rhoai-<name>-<id>.pages.redhat.com/...`. Proceeding anyway, but DOM extraction may not work.

## Jira MCP error handling

When a Jira MCP call fails:

- **Tool not available** → Stop:
  > **Jira access not configured.** This skill needs the Atlassian MCP server. Set it up in your Claude Code settings, or provide the ticket details manually.

- **404** → Stop:
  > **Ticket `<key>` not found.** Check the ticket key is correct and you have access to the project.

- **403** → Stop:
  > **No permission to read `<key>`.** Ask your team lead to grant you access, or paste the ticket details manually.

- **429 or 5xx** → Stop:
  > **Jira temporarily unavailable (HTTP [status]).** Wait a moment and try again, or paste the ticket details manually.

- **"IP address" permission error or MCP connection drop** → The Atlassian MCP session may have expired or disconnected. Ask the user:
  > **Jira MCP connection lost.** Run `/mcp` in Claude Code to reconnect the Atlassian server, then tell me to retry.
  
  Do NOT retry automatically in a loop — wait for the user to confirm the MCP is reconnected.
