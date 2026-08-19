---
name: envtest-debug
description: "Debug envtest integration test failures in the Dashboard Module Controller. Analyzes test output, identifies failure patterns, reads relevant test code, and suggests fixes. Use when envtest tests fail locally or in CI."
argument-hint: "<paste failing test output or 'ci' to fetch from latest CI run>"
---

# envtest Debug

Diagnoses envtest integration test failures by analyzing output, reading the failing test code, and matching against known failure patterns.

## Arguments

`$ARGUMENTS` — one of:
- Pasted test output (multi-line failure log) — analyze directly
- `ci` — fetch the latest CI run output for the `dashboard-operator-tests` workflow
- `ci <run-id>` — fetch a specific CI run's output
- Empty — print usage and stop

If no arguments are provided, print:
```
Usage: /envtest-debug <paste failing test output>
       /envtest-debug ci
       /envtest-debug ci <run-id>

Examples:
  /envtest-debug ci
  /envtest-debug <paste the FAIL output from make test-integration>
```

## Workflow

### Step 1: Obtain failure output

**If `$ARGUMENTS` starts with `ci`:**

```bash
# Fetch the latest run of the operator tests workflow
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')

if [ -n "$RUN_ID" ]; then
  gh run view "$RUN_ID" --repo "$owner/$repo" --log-failed 2>&1 | head -500
else
  run_id=$(gh run list --repo "$owner/$repo" --workflow="dashboard-operator-tests.yml" --status=failure --limit=1 --json databaseId --jq '.[0].databaseId')
  if [ -z "$run_id" ]; then
    echo "No failed runs found for dashboard-operator-tests.yml"
    # Try completed runs with the envtest step failing
    run_id=$(gh run list --repo "$owner/$repo" --workflow="dashboard-operator-tests.yml" --limit=5 --json databaseId --jq '.[0].databaseId')
  fi
  gh run view "$run_id" --repo "$owner/$repo" --log-failed 2>&1 | head -500
fi
```

**If `$ARGUMENTS` is pasted output:** Use it directly.

### Step 2: Parse the failure

Extract from the test output:
- **Failing test name** (e.g., `TestIntegration_StandaloneEnableModule`)
- **Error message** (the line after `--- FAIL:`)
- **Assertion failures** (lines with `assert` or `require` errors)
- **Panic stack traces** (if any)
- **envtest setup errors** (lines mentioning `envtest`, `setup-envtest`, `KUBEBUILDER_ASSETS`)

### Step 3: Read the failing test

Read the integration test file to understand what the failing test does:

```bash
# The integration tests live here
cat dashboard-operator/internal/controller/integration_test.go
```

Find the specific failing test function and trace its logic:
1. What manifests does it create? (check `createIntegrationManifests` args)
2. What Dashboard CR state does it set up? (check `newDashboard` and spec modifications)
3. What does it reconcile? (check `reconcile` calls)
4. What does it assert? (check `assert` / `require` statements)

### Step 4: Classify the failure

Match against known patterns:

**Category A: envtest Setup Failures**
- `failed to start envtest` → Binary download issue or port conflict
- `no kind is registered for` → Missing scheme registration in TestMain
- `failed to install CRD` → CRD YAML missing or malformed (run `make manifests`)

**Category B: Resource State Failures**
- `already exists` → Previous test didn't clean up. Check `cleanupModuleResources` is called
- `not found` → Resource wasn't created by reconciler. Check manifest paths and kustomize overlays
- `expected N deployments, got M` → Module enablement logic changed. Check `modules.go` registry

**Category C: Reconciliation Failures**
- `reconcile returned error` → Check the error message for the root cause (usually manifest rendering or SSA)
- `context deadline exceeded` → Timeout in cleanup or reconciliation. Check for resource finalizers blocking deletion
- `status mismatch` → Reconciler updated status differently than expected. Check status conditions logic

**Category D: Federation Config Failures**
- `federation entry not found` → Module not generating federation config. Check `module_deploy.go`
- `unexpected federation entries` → Disabled module still has entries. Check GC logic in reconcileStandalone

**Category E: CI Environment Issues**
- `setup-envtest: command not found` → `make setup-envtest` wasn't run. Check CI workflow step ordering
- `connection refused` → envtest apiserver didn't start. Could be a port conflict in CI or resource exhaustion
- `signal: killed` → OOM on CI runner. Check if tests are leaking resources

### Step 5: Read related source files

Based on the failure category, read the relevant source:

- **Module enablement**: `dashboard-operator/internal/controller/modules.go`
- **Standalone deployment**: `dashboard-operator/internal/controller/module_deploy.go`
- **Reconciler pipeline**: `dashboard-operator/internal/controller/dashboard_reconciler.go`
- **Manifest actions**: `dashboard-operator/internal/controller/actions.go`
- **CRD types**: `dashboard-operator/api/v1alpha1/dashboard_types.go`
- **Makefile targets**: `dashboard-operator/Makefile` (the `test-integration` and `setup-envtest` targets)

### Step 6: Suggest a fix

Based on the diagnosis, provide:

1. **Root cause** — What went wrong and why
2. **Fix** — Specific code changes to resolve the issue
3. **Verification** — How to verify the fix locally:
   ```bash
   cd dashboard-operator
   make test-integration
   ```
4. **Prevention** — If applicable, suggest adding a check or improving cleanup to prevent recurrence

## Known Issues Reference

| Issue | Symptom | Resolution |
|-------|---------|------------|
| setup-envtest version | `no matching version found` | v0.24.0 was the first standalone release — v0.23.x doesn't exist. Use v0.24.1+ |
| K8s version mismatch | `unsupported version` | Pinned to `1.31.x` in Makefile — don't use `latest` |
| CRD not regenerated | `no kind is registered` for Dashboard | Run `make generate && make manifests` |
| Shared namespace pollution | `already exists` on second test | Each test must call `cleanupModuleResources` in cleanup |
| Route CRD not installed | `no matches for kind "Route"` | Route v1 is added to scheme but CRD isn't installed in envtest (expected — tests don't create Routes) |
