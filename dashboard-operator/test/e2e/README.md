# Dashboard Operator Real-Cluster E2E Framework

This package provides shared helpers for dashboard-operator tests that require a
running Kubernetes or OpenShift cluster. It complements the envtest suite in
`internal/controller`; it does not replace it.

The Dashboard API is cluster-scoped and permits only the
`default-dashboard` instance. Run these tests on an isolated early-gate cluster,
not on a shared Cypress or development cluster. Future scenarios can change or
delete that singleton resource.

## Prerequisites

- A cluster with dashboard-operator and the Dashboard CRD installed.
- The platform controller that normally creates `default-dashboard` scaled down
  for lifecycle scenarios, so it cannot recreate the singleton during cleanup.
- No existing `default-dashboard` for the lifecycle scenario. The create helper
  refuses to adopt or modify an existing singleton.
- A dedicated, existing namespace for namespaced test resources.
- A kubeconfig stored in one file.
- RBAC to get the test Namespace and Dashboard CRD; get, create, patch, and
  delete Dashboards; and get Deployments and Endpoints in the test namespace.

Set the required environment variables:

```bash
export KUBECONFIG=/absolute/path/to/kubeconfig
export TEST_NAMESPACE=dashboard-operator-e2e
```

`TestMain` verifies connectivity, the namespace, the Dashboard CRD, and its
served API version before any test runs. It verifies the CRD but never installs
it.

## Run Locally

From `dashboard-operator`:

```bash
make test-e2e
```

Pass standard `go test` options through `E2E_TEST_ARGS`, including a selective
test run:

```bash
make test-e2e E2E_TEST_ARGS='-run TestE2EDashboardLifecycle'
```

The equivalent direct command is:

```bash
go test -v -count=1 -tags=e2e -timeout=30m -run TestE2EDashboardLifecycle ./test/e2e/...
```

## Compile and Run in a Container

Build the standalone test binary without connecting to a cluster:

```bash
make build-e2e
```

This produces `bin/e2e.test`. Copy that binary into a test image, mount a
kubeconfig, set both required environment variables, and run it with standard
testing flags:

```bash
./bin/e2e.test -test.v -test.run TestE2EDashboardLifecycle
```

Embed small fixtures with `//go:embed`, or mount them at a path supplied by an
environment variable. Do not depend on paths that exist only on a developer's
machine.

## Authoring Scenarios

All Go files in this directory must use the `e2e` build tag. Reuse the shared
helpers for:

- waiting for a Dashboard condition;
- waiting for an available Deployment;
- creating the singleton Dashboard atomically;
- deleting an E2E-owned Dashboard and waiting for its removal;
- waiting for ready Service Endpoints;
- matching unstructured Kubernetes data with JQ expressions; and
- validating the Dashboard platform contract.

The create helper atomically creates the singleton and fails if it already
exists. It returns the API-assigned UID; cleanup requires that UID and refuses
to delete a different or unlabeled object. A test that creates the Dashboard
must register cleanup immediately and surface cleanup failures.

Keep each scenario independent and runnable with `-run`. Tests must wait for
observable conditions instead of sleeping, clean up resources they own, and
avoid relying on execution order.
