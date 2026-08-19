# envtest Integration Tests

## Overview

The Dashboard Module Controller uses [envtest](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/envtest) for integration testing. envtest is part of the controller-runtime project and spins up a **real kube-apiserver and etcd** locally — no full cluster or container runtime required. This lets tests exercise the complete reconciliation loop against an actual Kubernetes API, catching issues that unit tests with fake clients would miss.

## How It Differs from Unit Tests

| Aspect | Unit Tests (`make test`) | Integration Tests (`make test-integration`) |
|--------|--------------------------|---------------------------------------------|
| K8s API | Fake client or no client | Real kube-apiserver + etcd |
| CRDs | Not installed | Installed from `config/crd/bases/` |
| Build tag | None | `//go:build integration` |
| Speed | Fast (~seconds) | Slower (~30-60s for setup + tests) |
| What they test | Individual functions, helpers | Full reconcile loop, SSA deployment, status updates |
| External deps | None | `setup-envtest` binary (downloaded automatically) |

## Running Locally

```bash
cd dashboard-operator
make test-integration
```

This will:

1. Download the `setup-envtest` tool (if not already present) to `bin/setup-envtest-v0.24.1`
2. Use `setup-envtest` to download kube-apiserver and etcd binaries for K8s `1.31.x`
3. Run `go test` with `-tags=integration` on `./internal/controller/...`

### Prerequisites

- **Go >= 1.26** (matching `go.mod`)
- **Network access** on first run (to download envtest binaries — cached afterwards in `~/.local/share/kubebuilder-envtest/`)
- No cluster connection needed

### Manual Binary Management

If you need to manage envtest binaries manually:

```bash
# List available versions
./bin/setup-envtest-v0.24.1 list

# Download a specific version
./bin/setup-envtest-v0.24.1 use 1.31.x

# Show the binary path
./bin/setup-envtest-v0.24.1 use 1.31.x -p path
```

## CI

The integration tests run in the `dashboard-operator-tests.yml` GitHub Actions workflow. A failure in this step will block the merge.

The workflow only triggers on changes to `dashboard-operator/**` or `manifests/**`, so it won't affect PRs that don't touch operator code.

## Writing New Integration Tests

### Build Tag

Every integration test file must start with the build tag:

```go
//go:build integration
```

This ensures integration tests are excluded from `make test` (which runs `go test ./...` without the tag) and only run via `make test-integration`.

### Test Structure

Integration tests use `TestMain` for shared envtest setup:

```go
func TestMain(m *testing.M) {
    // 1. Build scheme (clientgo + v1alpha1 + routev1)
    // 2. Create envtest.Environment with CRD paths
    // 3. Start the environment
    // 4. Create a k8s client
    // 5. Create the test namespace
    // 6. Run tests
    // 7. Stop the environment
}
```

Individual tests follow the naming convention `TestIntegration_<Scenario>`:

```go
func TestIntegration_StandaloneEnableModule(t *testing.T) {
    // 1. Create test manifests (createIntegrationManifests)
    // 2. Create a Dashboard CR (newDashboard)
    // 3. Reconcile
    // 4. Assert expected state (deployments, services, federation config)
    // 5. Clean up (deleteDashboard, cleanupModuleResources)
}
```

### Helper Functions

The test file provides reusable helpers:

| Helper | Purpose |
|--------|---------|
| `createIntegrationManifests(t, slugs)` | Creates a temp directory with minimal kustomize manifests |
| `newDashboard(spec)` | Creates a Dashboard CR with the given spec |
| `reconcile(t, r)` | Runs one reconciliation cycle with the given reconciler |
| `getDashboard(t)` | Fetches the current Dashboard CR |
| `deleteDashboard(t)` | Deletes the Dashboard CR with timeout |
| `cleanupModuleResources(t)` | Removes all labeled test resources from the integration namespace |
| `listDeployments(t, componentLabel)` | Lists deployments by component label |
| `listServices(t, componentLabel)` | Lists services by component label |
| `getFederationConfigMap(t)` | Gets the federation-config ConfigMap |
| `parseFederationEntries(t, cm)` | Parses federation entries from the ConfigMap |
| `findFederationEntry(entries, name)` | Finds a specific entry by module name |
| `disableAllModulesExcept(enabled...)` | Returns a Modules map with all modules disabled except the listed ones |

### Namespace Isolation

All integration tests share a single namespace (`integration-test`). Each test must clean up its resources after running. Use `cleanupModuleResources` to remove deployments, services, and configmaps created by the reconciler.

## Debugging Failures

If integration tests fail in CI or locally, use the `/envtest-debug` Claude Code skill for guided troubleshooting:

```
/envtest-debug <paste failing test output>
```

### Common Failure Patterns

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `failed to start envtest` | Missing envtest binaries | Run `make setup-envtest`, check network access |
| `failed to create client` | Scheme registration issue | Ensure all required types are added to the scheme |
| `context deadline exceeded` | Slow CI runner or resource contention | Increase timeouts, check for leaked resources from previous tests |
| `already exists` | Resource not cleaned up from previous test | Add cleanup in test teardown, check `cleanupModuleResources` |
| `not found` after reconcile | CRD not installed or SSA ownership conflict | Verify CRD paths in `envtest.Environment`, check field ownership |

## K8s API Version

The envtest binaries are pinned to K8s `1.31.x` in the Makefile. This matches the K8s API version used in production. To update:

1. Change the version in `dashboard-operator/Makefile` (`test-integration` target)
2. Run `make test-integration` to download the new binaries
3. Verify all tests pass with the new version

## Further Reading

- [controller-runtime envtest docs](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/envtest)
- [setup-envtest tool](https://pkg.go.dev/sigs.k8s.io/controller-runtime/tools/setup-envtest)
- [Dashboard Module Controller docs](dashboard-operator.md)
- [Operator controller patterns](./../.claude/rules/operator-controller.md) (agentic rule)
