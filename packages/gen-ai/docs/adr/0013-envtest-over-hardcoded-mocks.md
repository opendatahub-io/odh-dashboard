# Envtest Over Hardcoded Mocks for Kubernetes Test Data

* Date: 2026-02-19
* Authors: Eder Ignatowicz

## Context and Problem Statement

The BFF's Kubernetes mock layer (`k8smocks`) originally mixed two strategies: envtest for a real API server and hardcoded return values in mock methods. For example, `GetNamespaces` returned a hardcoded list of namespace names that didn't correspond to any namespaces actually created in envtest. Similarly, ConfigMap data for MCP servers and vector stores was inlined as Go string literals inside `base_testenv.go`.

This caused several problems:
1. Tests could pass with mock data that didn't exist in the cluster — hiding integration bugs
2. Adding new test data required editing Go source code instead of data files
3. Namespace names returned by `GetNamespaces` didn't match the namespaces seeded in envtest, so tests exercising namespace-scoped resources couldn't verify end-to-end behavior

## Decision Drivers

* Tests should exercise the same code paths as production (read from real K8s API server)
* Test fixtures should be editable without modifying Go source
* Mock methods should query envtest when possible, not return hardcoded values
* Idiomatic Go: `testdata/` directory and `go:embed` for fixture loading

## Considered Options

* **Option 1**: Keep hardcoded mock data in Go source
  - Fast to write but drifts from reality; test data scattered across method bodies
* **Option 2**: Query envtest for all mock methods (chosen where feasible)
  - Tests validate real K8s API behavior; single source of truth for test data
* **Option 3**: External test database or fixture server
  - Overkill for ConfigMap and namespace data

## Decision Outcome

Chosen option: "Query envtest where feasible, load fixtures from `testdata/` files via `go:embed`", because it keeps test data in editable files, ensures mock methods exercise real K8s API paths, and follows Go conventions.

### Rules Applied

1. **Mock methods should query envtest** when the underlying data is seeded in `SetupMock`. Example: `GetNamespaces` now calls `m.Client.List(ctx, &nsList)` instead of returning a hardcoded slice.

2. **Test fixture data lives in `testdata/`** files loaded via `go:embed`. Example: MCP server configs in `testdata/mcp_servers.json`, vector store definitions in `testdata/vector_stores.yaml`. The `go:embed` directive is preferred over `os.ReadFile` because `k8smocks` is a non-test package imported from multiple working directories — `go:embed` resolves paths relative to the source file at compile time.

3. **Envtest namespaces must match mock responses**. If `GetNamespaces` returns namespace X, then `SetupMock` must create namespace X with appropriate seed data. No phantom namespaces.

4. **Hardcoded mock data is acceptable** only when the data doesn't correspond to a Kubernetes resource (e.g., `GetAAModels` returns synthetic model lists that aren't stored in K8s).

### Positive Consequences

* Single source of truth: namespaces in envtest match what mock methods return
* Test fixtures are readable data files, not Go string literals
* Adding a new vector store or MCP server to test data means editing a YAML/JSON file, not Go code
* Integration bugs surface earlier because tests hit the real API server

### Negative Consequences

* Slightly slower test setup (envtest creates more resources)
* `go:embed` requires the `testdata/` directory to be present at compile time

## Implementation

### Fixture Files

```text
k8smocks/testdata/
├── mcp_servers.json      # MCP server ConfigMap entries (structured JSON)
└── vector_stores.yaml    # Vector store ConfigMap content (YAML)
```

### SetupMock Structure

```go
func SetupMock(mockK8sClient client.Client, ctx context.Context) error {
    // 1. Dashboard namespace with MCP ConfigMap (cluster-wide)
    createNamespace("opendatahub")
    createMCPServersConfigMap("opendatahub")  // loads from testdata/mcp_servers.json

    // 2. llama-stack namespace with full seeding
    createNamespace("llama-stack")
    createVectorStoresConfigMap("llama-stack") // loads from testdata/vector_stores.yaml
    createLlamaStackConfigMap("llama-stack")
    createLlamaStackDistribution("llama-stack")

    // 3. mock-test namespaces (match GetNamespaces results)
    for _, ns := range []string{"mock-test-namespace-1", ..., "mock-test-namespace-4"} {
        createNamespace(ns)
        createVectorStoresConfigMap(ns)
    }
}
```

### GetNamespaces (Before → After)

```go
// Before: hardcoded, no relation to envtest state
func (m *TokenKubernetesClientMock) GetNamespaces(...) ([]corev1.Namespace, error) {
    return []corev1.Namespace{
        {ObjectMeta: metav1.ObjectMeta{Name: "mock-test-namespace-1"}},
        // ...
    }, nil
}

// After: queries envtest
func (m *TokenKubernetesClientMock) GetNamespaces(...) ([]corev1.Namespace, error) {
    var nsList corev1.NamespaceList
    if err := m.Client.List(ctx, &nsList); err != nil {
        return nil, fmt.Errorf("failed to list namespaces: %w", err)
    }
    return nsList.Items, nil
}
```

## Links

* [Related to] ADR-0010 - Kubernetes Client Architecture
* [Related to] ADR-0006 - Factory Pattern for Client Management
* [Implementation] `internal/integrations/kubernetes/k8smocks/base_testenv.go`
* [Implementation] `internal/integrations/kubernetes/k8smocks/token_k8s_client_mock.go`
* [Implementation] `internal/integrations/kubernetes/k8smocks/testdata/`
