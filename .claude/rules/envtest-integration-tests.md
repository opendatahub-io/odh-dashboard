---
description: Conventions for envtest integration tests in the Dashboard Module Controller
globs: "dashboard-operator/internal/controller/*integration*"
alwaysApply: false
paths:
  - "dashboard-operator/internal/controller/*integration*"
---

# envtest Integration Test Patterns

Rules for writing and maintaining envtest integration tests in `dashboard-operator/internal/controller/`. For unit test patterns, see `operator-controller.md`. For general testing strategy, see `testing-standards.md`.

## Build Tag

Every integration test file **must** start with:

```go
//go:build integration
```

This separates integration tests from unit tests. `make test` runs unit tests only; `make test-integration` runs integration tests with the tag.

## File Naming

Use `*_integration_test.go` for integration test files. This makes the build tag redundant for discoverability but the tag is still required for the build system.

## Test Naming

Prefix all test functions with `TestIntegration_`:

```go
func TestIntegration_StandaloneEnableModule(t *testing.T) { ... }
func TestIntegration_InterModuleDependency(t *testing.T) { ... }
```

This convention distinguishes integration tests from unit tests in output and allows selective runs with `-run TestIntegration`.

## TestMain Pattern

Integration tests share a single `TestMain` that sets up the envtest environment:

```go
func TestMain(m *testing.M) {
    s := runtime.NewScheme()
    // Add all required schemes: clientgoscheme, v1alpha1, routev1
    
    testEnv = &envtest.Environment{
        CRDDirectoryPaths: []string{
            filepath.Join("..", "..", "config", "crd", "bases"),
        },
        Scheme: s,
    }
    cfg, err := testEnv.Start()
    // Create k8s client, create test namespace
    
    code := m.Run()
    testEnv.Stop()
    os.Exit(code)
}
```

Do **not** create separate `TestMain` functions. All integration tests in the package share the same envtest environment.

## Test Structure

Each integration test follows a consistent pattern:

1. **Create manifests** — Use `createIntegrationManifests(t, moduleSlugs)` to build a temp dir with minimal kustomize manifests
2. **Create the Dashboard CR** — Use `newDashboard(spec)` with a `DashboardSpec`
3. **Reconcile** — Call `reconcile(t, r)` with the reconciler to run one cycle
4. **Assert state** — Check deployments, services, federation config, status
5. **Clean up** — Delete the Dashboard CR and call `cleanupModuleResources`

```go
func TestIntegration_Example(t *testing.T) {
    manifests := createIntegrationManifests(t, []string{"gen-ai"})

    r := &ctrlpkg.DashboardReconciler{
        Client:                k8sClient,
        Scheme:                k8sClient.Scheme(),
        ManifestsBasePath:     manifests,
        Platform:              cluster.OpenDataHub,
        Namespace:             integrationNamespace,
        ApplicationsNamespace: integrationNamespace,
    }

    dashboard := newDashboard(v1alpha1.DashboardSpec{
        DeploymentMode: v1alpha1.DeploymentModeStandalone,
        Gateway:        &v1alpha1.GatewaySpec{Domain: "test.example.com"},
        Modules:        disableAllModulesExcept("genAi"),
    })

    require.NoError(t, k8sClient.Create(ctx, dashboard))

    t.Cleanup(func() {
        deleteDashboard(t)
        cleanupModuleResources(t)
    })

    reconcile(t, r)
    reconcile(t, r)

    // Assert
    deps := listDeployments(t, "gen-ai")
    assert.Len(t, deps, 1)
}
```

## Helper Functions

Reuse the existing helpers instead of writing ad-hoc K8s operations:

| Helper | Use For |
|--------|---------|
| `createIntegrationManifests(t, slugs)` | Building temp kustomize layout with core + module manifests |
| `newDashboard(spec)` | Creating a Dashboard CR with the given DashboardSpec |
| `reconcile(t, r)` | Running one reconciliation cycle with the given reconciler |
| `getDashboard(t)` | Fetching current Dashboard CR state |
| `deleteDashboard(t)` | Deleting Dashboard CR with finalizer removal and timeout |
| `cleanupModuleResources(t)` | Removing all labeled resources from the integration namespace |
| `listDeployments(t, componentLabel)` / `listServices(t, componentLabel)` | Listing resources by component label |
| `getFederationConfigMap(t)` | Getting the federation-config ConfigMap |
| `parseFederationEntries(t, cm)` / `findFederationEntry(entries, name)` | Parsing and querying federation config |
| `disableAllModulesExcept(enabled...)` | Returns a Modules map with all modules disabled except the listed ones |

## Common Pitfalls

### Resource Cleanup

Every test **must** clean up resources it creates. The tests share a single namespace, so leftover resources from one test cause `already exists` errors in the next.

```go
t.Cleanup(func() {
    deleteDashboard(t)
    cleanupModuleResources(t)
})
```

### Singleton CR Name

All tests use the singleton `v1alpha1.DashboardInstanceName`. Each test must delete the CR (via `deleteDashboard`) before the next test can create one.

### Reconcile Returns

Check the `ctrl.Result` from `reconcile` — a `RequeueAfter` with no error means the reconciler is waiting for something (e.g., Route admission). An error return means the reconcile failed.

### No Mocking

Integration tests should **not** mock any Kubernetes interactions. The whole point is to test against a real API server. If you need to control external state, create the resources in the test setup.

### Scheme Registration

If your test uses a new API type, add it to the scheme in `TestMain`. Missing scheme registrations cause "no kind is registered" errors at runtime.

## Running and Debugging

```bash
# Run all integration tests
make test-integration

# Run a specific test
KUBEBUILDER_ASSETS="$(./bin/setup-envtest-v0.24.1 use 1.31.x -p path)" \
  go test -v -race -tags=integration -count=1 -run TestIntegration_StandaloneEnableModule ./internal/controller/...

# Verbose output with test logs
KUBEBUILDER_ASSETS="$(./bin/setup-envtest-v0.24.1 use 1.31.x -p path)" \
  go test -v -race -tags=integration -count=1 ./internal/controller/... 2>&1 | tee test-output.log
```

For CI failures, use the `/envtest-debug` skill to diagnose issues.
