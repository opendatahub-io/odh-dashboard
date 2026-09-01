---
name: upstream-test-recommender
description: "Analyze a cypress_found_bug Jira issue, identify the upstream repo, audit its test infrastructure, classify the bug, and recommend a specific test using the repo's own tools. With --implement, generate the test code."
argument-hint: "<JIRA-KEY> [--implement] [--repo <org/repo>] | --parity [--area <feature-area>]"
---

# Upstream Test Recommender

Analyzes a Dashboard-detected upstream bug and produces an actionable test recommendation for the upstream team that caused it.

**Before starting, read [`repo-profiles.md`](repo-profiles.md).** It contains per-repo test infrastructure details, bug class mappings, and test recipe templates.

## Arguments

`$ARGUMENTS` — one of:

- A Jira key (e.g. `RHOAIENG-82376`) — analyze that bug
- A Jira key with `--implement` (e.g. `RHOAIENG-82376 --implement`) — also generate the test code
- A Jira key with `--repo org/repo` — override auto-detected repo
- `--parity` (no Jira key) — run backend/frontend test parity mode
- `--parity --area <feature-area>` — restrict the parity scan to one area
- A full Jira URL — extract the key from the URL path
- Empty — print usage and stop

If no arguments are provided, print:

```text
Usage: /upstream-test-recommender <JIRA-KEY> [--implement] [--repo <org/repo>]
       /upstream-test-recommender --parity [--area <feature-area>]

Examples:
  /upstream-test-recommender RHOAIENG-82376
  /upstream-test-recommender RHOAIENG-82376 --implement
  /upstream-test-recommender RHOAIENG-82376 --repo opendatahub-io/odh-model-controller
  /upstream-test-recommender --parity
  /upstream-test-recommender --parity --area model-serving
```

## Prerequisites

- **Jira access** — Atlassian MCP (`mcp-atlassian`) connected and authenticated. Fetch issues with `jira_get_issue` / `jira_search` only. Do **not** read `~/.cursor/mcp.json`, print tokens or emails, or call the Jira REST API with curl/`JIRA_API_TOKEN`.
- **GitHub access** — `gh` CLI authenticated for cloning upstream repos
- **Go** — for auditing Go test infrastructure (most upstream repos are Go)

## Execution

### Step 1: Parse arguments

Parse flags from `$ARGUMENTS` **before** requiring a Jira key:

- `--implement` → generate test code (default: recommendation only)
- `--repo org/repo` → skip repo auto-detection; use this repo
- `--parity` → enter [Backend/Frontend Test Parity Mode](#backendfrontend-test-parity-mode); do **not** require a Jira key
- `--area <feature-area>` → valid only with `--parity`. Must match a **Team flag** or an `dashboard-area-*` suffix from [`repo-profiles.md`](repo-profiles.md). If omitted in parity mode, scan all areas. If supplied without `--parity`, or if the value is unknown, print usage and stop.

If `--parity` is present, skip Jira-key validation and continue at parity mode.

Otherwise extract the Jira key. If a full URL is provided, extract the key using pattern `[A-Z]+-\d+`. If no key is present, print usage and stop.

### Step 2: Fetch the Jira issue

Call `jira_get_issue` with `fields=summary,description,labels,priority,status,fixVersions,comment,issuelinks` and `comment_limit=50`.

If the call fails with an auth or connection error, stop and report:

> Atlassian MCP is not available or not authenticated. This skill requires the Atlassian MCP to fetch Jira issue details. Please configure and authenticate the Atlassian MCP server.

Do not fall back to curl, environment-variable credentials, or reading local MCP config files. Never print `JIRA_API_TOKEN`, `JIRA_EMAIL`, bearer tokens, or other secrets.

Extract from the issue:

- **Summary** — the bug title
- **Description** — full bug details (ADF format, extract text content)
- **Labels** — especially `dashboard-area-*` labels
- **Priority** — Blocker/Critical/Major/etc.
- **Fix versions** — which RHOAI version
- **Comments** — often contain root cause analysis, fix PRs, stack traces
- **Issue links** — linked PRs, related issues

### Step 3: Identify the upstream repo

Use these signals in priority order:

1. **`--repo` flag** — if the user provided it, use it and skip the remaining signals.
2. **Fix PR in comments/links** — search comments for GitHub PR URLs (`github.com/<org>/<repo>/pull/`). This is the most reliable auto-detect signal.
3. **Label mapping** — match `dashboard-area-*` labels to repos using `repo-profiles.md`.
4. **Summary/description keywords** — match operator names, CRD kinds, pod names against the keyword lists in `repo-profiles.md`.

If two or more profiles match and the only hits are **shared signals** (see `repo-profiles.md` Disambiguation), do **not** pick a repo. Require a unique keyword, a unique fix PR, or ask the user.

If no repo can be identified, ask the user:

```text
Could not determine the upstream repo from the Jira issue.
Which repo caused this bug? (e.g., opendatahub-io/odh-model-controller)
```

### Step 4: Clone or update the upstream repo

```bash
CACHE_DIR="$HOME/.cache/upstream-test-recommender/repos"
REPO_DIR="$CACHE_DIR/$ORG/$REPO"
mkdir -p "$CACHE_DIR/$ORG"

if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch origin 2>&1
  git -C "$REPO_DIR" checkout main 2>/dev/null || git -C "$REPO_DIR" checkout master 2>/dev/null
  git -C "$REPO_DIR" pull --ff-only 2>/dev/null || git -C "$REPO_DIR" reset --hard origin/HEAD
else
  gh repo clone "$ORG/$REPO" "$REPO_DIR" 2>&1
fi

REVISION=$(git -C "$REPO_DIR" rev-parse HEAD)
```

Record `$REVISION` with the audit findings. The audit skill reuses cached audits only when this SHA still matches.

### Step 5: Audit the repo's test infrastructure

Scan the repo for test capabilities. Run these checks:

```bash
# 1. envtest presence
grep -r "envtest" "$REPO_DIR" --include="*.go" -l 2>/dev/null | wc -l

# 2. Test framework (Ginkgo vs go test)
grep -r "ginkgo\|gomega\|Describe(\|It(" "$REPO_DIR" --include="*.go" -l 2>/dev/null | head -5

# 3. RBAC manifests — start from the profile path, then fall back
find "$REPO_DIR/config/rbac" -name "*.yaml" 2>/dev/null

# 4. CRD manifests
find "$REPO_DIR/config/crd" -name "*.yaml" 2>/dev/null

# 5. Webhook manifests
find "$REPO_DIR/config/webhook" -name "*.yaml" 2>/dev/null

# 6. Manager entrypoint
find "$REPO_DIR" -path "*/cmd/*/main.go" -o -path "*/main.go" 2>/dev/null | head -5

# 7. Existing test files
find "$REPO_DIR" -name "*_test.go" 2>/dev/null | wc -l

# 8. CI workflows
ls "$REPO_DIR/.github/workflows/" 2>/dev/null

# 9. Makefile test targets
grep -E "^test|^e2e|^integration" "$REPO_DIR/Makefile" 2>/dev/null | head -10
```

**envtest uses real RBAC (the #1 gap)** — do **not** treat a keyword hit of `ClusterRole`, `ServiceAccount`, or `RoleBinding` in `*_test.go` as proof. Search tests **and** helpers (files under `test/`, `pkg/`, not only `*_test.go`). Record `yes` only when **all** of the following are demonstrated:

1. The test (or helper) creates a ServiceAccount.
2. It binds the **shipped** Role or ClusterRole from the profile's RBAC manifests (not a test-only role and not cluster-admin).
3. It starts the manager or a test client using that ServiceAccount's credentials.

Otherwise record `unknown`. Record `no` only when tests clearly run as cluster-admin / the default envtest client with no SA restriction.

Record in a structured format:

- Has envtest: yes/no (count of references)
- Test framework: ginkgo/go-test/none
- Has RBAC manifests: yes/no (path from the profile or `find`)
- Has CRDs: yes/no (path)
- Has webhooks: yes/no (path)
- envtest uses real RBAC: yes/no/unknown (**this is the critical gap**)
- CI system: GitHub Actions/Prow/other
- Test file count
- Audited revision: `$REVISION`

### Step 6: Classify the bug

Use only the **canonical** classes in the table below. Map profile-specific terms from `repo-profiles.md` through the [alias table](repo-profiles.md#profile-aliases--canonical-class) **before** emitting a class or applying batch filters.

| Canonical class | Signature |
|---|---|
| **RBAC violation** | CrashLoopBackOff, "Forbidden", missing verbs/resources in ClusterRole |
| **Finalizer deadlock** | Resource stuck Terminating, finalizer not removed on parent deletion |
| **CRD schema drift** | "validation error", field not in CRD spec, admission rejected |
| **Deploy prerequisite** | Component not Ready, missing CRD, missing namespace, missing configmap |
| **Behavioral regression** | Something stopped working that used to work (labels not applied, resources not created) |
| **Webhook conflict** | Duplicate webhook names, resource mutation failures |
| **EnvoyFilter scoping** | OOM, 401/503 errors, filters applied to wrong gateway |
| **Config drift** | EnvoyFilter/NetworkPolicy changes breaking other components |
| **Resource leak** | OOM kills, memory growth over time |
| **API mismatch** | Naming conventions changed, resources moved to different namespace |

Do not emit profile-only names (`CRD watch failure`, `bootstrap failure`, `CRD ordering`, `gateway OOM`, and so on) as the output class.

### Step 7: Generate the recommendation

Produce a structured recommendation with these sections:

```markdown
## Upstream Test Recommendation: <JIRA-KEY>

### Bug Summary
<one-line summary from Jira>

### Classification
- **Bug class:** <canonical class from Step 6>
- **Detection layer:** <Operator Startup | envtest | Runtime Integration | Static Analysis>
- **Upstream repo:** <org/repo>
- **Confidence:** <High | Medium | Low> — <why>

### Root Cause
<2-3 sentences explaining what went wrong and why upstream tests didn't catch it>

### Why Upstream Tests Missed This
<specific gap in the repo's test infrastructure from Step 5>
Example: "envtest runs with cluster-admin access (24 test files, 0 load the shipped ClusterRole).
The missing `get` verb on `apiservers.config.openshift.io` is invisible because the test client
bypasses RBAC entirely."

### Recommended Test
<specific test recommendation using the repo's OWN framework>

**Test type:** <envtest | unit test | static lint | CI check>
**Framework:** <ginkgo/go-test/script — whatever the repo already uses>
**File location:** <where to add it in the repo>
**Estimated effort:** <~N lines of Go/script>

### Test Description
<plain-English description of what the test should do>

### Past Incidents
<list of Jira keys with the same root cause pattern, if any>
```

### Step 8: Generate test code (--implement only)

If `--implement` was specified, generate the actual test code.

**Resolve setup from the selected profile and the checked-out repo before writing code:**

1. RBAC manifest path (e.g. `config/rbac/role.yaml` vs `config/rbac/`).
2. Test framework (Ginkgo vs `testing.T` / testify vs none).
3. Whether the repo already uses envtest.

Match existing test files (imports, helpers, setup). The snippets below are **examples** for envtest + testify repos. For Ginkgo repos, emit `Describe`/`It`. For repos without envtest (see profiles: kserve, feast, maas), generate a test in that repo's existing style — do not invent `config/rbac/role.yaml` + envtest unless the recommendation is to add envtest.

**For RBAC violation bugs (the most common), envtest + testify shape:**

```go
// test/integration/rbac_contract_test.go
func TestManagerStartsWithShippedRBAC(t *testing.T) {
    // rbacManifestPath comes from the repo profile / checked-out manifests.
    role := loadClusterRole(t, rbacManifestPath)

    env := &envtest.Environment{
        CRDDirectoryPaths: []string{"config/crd/bases"},
    }
    cfg, err := env.Start()
    require.NoError(t, err)
    t.Cleanup(func() { _ = env.Stop() })

    // Create a ServiceAccount bound only to this ClusterRole
    // (not cluster-admin)
    restrictedCfg := restrictToRole(t, cfg, role)

    mgr, err := ctrl.NewManager(restrictedCfg, ctrl.Options{
        Scheme: scheme,
    })
    require.NoError(t, err, "manager should start with shipped RBAC")

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    startErr := make(chan error, 1)
    go func() {
        startErr <- mgr.Start(ctx)
    }()

    select {
    case <-mgr.Elected():
        cancel()
        err := <-startErr
        if err != nil && err != context.Canceled {
            require.NoError(t, err)
        }
    case err := <-startErr:
        require.NoError(t, err, "manager exited before becoming ready")
    case <-ctx.Done():
        t.Fatal("timed out waiting for manager to become ready")
    }
}
```

Do **not** call `require.NoError` / `t.FailNow` from the goroutine that runs `mgr.Start`. Assert in the test goroutine so an RBAC startup error cannot hang on `<-mgr.Elected()`.

**For finalizer deadlock bugs:**

```go
func TestFinalizerHandlesParentDeletion(t *testing.T) {
    // Create parent and child resources
    parent := &v1.ParentResource{...}
    child := &v1.ChildResource{...}

    require.NoError(t, k8sClient.Create(ctx, parent))
    require.NoError(t, k8sClient.Create(ctx, child))

    // Delete parent first (before child)
    require.NoError(t, k8sClient.Delete(ctx, parent))

    // Assert parent eventually terminates (finalizer removed)
    require.Eventually(t, func() bool {
        err := k8sClient.Get(ctx, client.ObjectKeyFromObject(parent), parent)
        return apierrors.IsNotFound(err)
    }, 30*time.Second, 1*time.Second, "parent should terminate after child cleanup")
}
```

**For CRD schema drift bugs:**

```go
func TestCRDAcceptsRealValues(t *testing.T) {
    cr := &v1.MyCRD{
        Spec: v1.MyCRDSpec{
            // Concrete production-like value from the bug (rendered Helm
            // output, customer CR, or CRD example). k8sClient.Create does
            // not render Helm — never leave {{ .Values.* }} placeholders.
            Field: "real-production-value",
        },
    }
    err := k8sClient.Create(ctx, cr)
    require.NoError(t, err, "CRD should accept real-world field values")
}
```

### Step 9: Present results

Output the recommendation in the format from Step 7. If `--implement` was used, also output the test code in a fenced code block with the target file path.

End with:

```text
Questions? #forum-rhods-dashboard on Slack
Full analysis: .agentready/Dashboard Integration Gap Analysis.html
```

## Backend/Frontend Test Parity Mode

When invoked with `--parity` instead of a Jira key, the skill runs in test parity mode:

```text
/upstream-test-recommender --parity [--area <feature-area>]
```

This mode:

1. **Scans Cypress E2E test files** in `packages/cypress/cypress/tests/e2e/`
2. **For each test file**, identifies which upstream operators/CRDs it exercises (from `cy.intercept`, API calls, resource creation)
3. **Maps each E2E test to upstream repos** using the repo profiles
4. **Checks whether the upstream repo has a corresponding backend test** covering the same integration surface
5. **Outputs a parity report** showing:
   - E2E tests with upstream backend coverage: count + list
   - E2E tests WITHOUT upstream backend coverage: count + list (these are the gaps)
   - Recommended tests to close the gaps

If `--area` is set, limit the scan and mapping to that team/area from `repo-profiles.md`.

### Parity scan logic

```bash
# Find all E2E test files
find packages/cypress/cypress/tests/e2e -name "*.cy.ts" | sort

# For each file, extract upstream dependencies:
# - K8s resource kinds created/read (InferenceService, Notebook, etc.)
# - API endpoints called
# - Operators that must be running for the test to pass
```

Map each dependency to an upstream repo via `repo-profiles.md` keywords. Then check:

- Does that repo have envtest covering this resource kind?
- Does that repo test manager startup with real RBAC?
- Does that repo test the specific reconciliation path this E2E test exercises?

## Error Handling

- **Jira not accessible** → Print: "Atlassian MCP is not available or not authenticated. This skill requires the Atlassian MCP to fetch Jira issue details. Please configure and authenticate the Atlassian MCP server."
- **Repo clone fails** → Print: "Could not clone <org/repo>. Check your GitHub authentication (`gh auth status`)."
- **No Go in PATH** → Print: "Go not found. Install Go >= 1.21 to audit test infrastructure."
- **Repo not identified** → Ask the user (see Step 3).
- **Unknown `--area`** → Print usage and stop.
