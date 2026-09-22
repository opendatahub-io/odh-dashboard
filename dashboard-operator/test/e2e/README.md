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

## Containerized Execution (early-gate shiftleft runner)

The early-gate CI pipeline runs these tests on an ephemeral ROSA HCP cluster via
its "shiftleft" runner, which executes a **containerized** copy of the test
binary. `Dockerfile.e2e` (in `dashboard-operator/`) packages that image:

```bash
make e2e-image                       # docker build -f Dockerfile.e2e ..
make e2e-image E2E_IMG=quay.io/<you>/odh-dashboard-operator-e2e:dev
```

The image contains the compiled `e2e.test` binary, `oc` + `kubectl`, and the
Dashboard CRD under `/opt/e2e/crd/`. Run it against a cluster by mounting a
kubeconfig and supplying the required env vars:

```bash
docker run --rm \
  -v "$KUBECONFIG:/kubeconfig:ro" -e KUBECONFIG=/kubeconfig \
  -e TEST_NAMESPACE=dashboard-operator-e2e \
  quay.io/opendatahub/odh-dashboard-operator-e2e:latest \
  -test.v -test.run TestE2EDashboardLifecycle
```

### CI flow

- **Image build** — `.tekton/odh-dashboard-operator-e2e-pull-request.yaml` /
  `-push.yaml` build `quay.io/opendatahub/odh-dashboard-operator-e2e` with a
  `pr-<N>` tag on every PR that touches `test/e2e/`, `api/`, or `Dockerfile.e2e`.
  The shiftleft runner picks up that `pr-<N>` test image automatically.
- **Cluster + test run** — the existing early-gate PipelineRuns are triggered by
  two **separate** PR comments, both gated by the `early-gate` label. Run them in
  order — the build must complete before the test run:
    1. `/early-gate` (or `/early-gate-build`) triggers
       `.tekton/early-gate-ci-build.yaml`, which hands off to the
       odh-konflux-central `early-gate-component-pipeline.yaml`.
    2. `/early-gate-test` triggers `.tekton/early-gate-ci-test.yaml`, which hands
       off to the odh-konflux-central `early-gate-test-pipeline.yaml`.

  Together these provision a ROSA HCP cluster via Jenkins and invoke shiftleft.
  The **component** pipeline (not the operator/OLM pipeline) is correct here
  because the dashboard-operator ships as a module via the platform operator/DSC
  rather than as its own OLM bundle.

### Shiftleft contract (what the runner provides / expects)

- A single-file `KUBECONFIG` for the provisioned cluster and a `TEST_NAMESPACE`.
- Cluster RBAC (ServiceAccount + ClusterRole) covering the verbs listed under
  [Prerequisites](#prerequisites).
- JUnit XML results (e.g. run with `gotestsum`/`-test.v` and convert) surfaced
  back to the PR as a status check.

### DevOps handoff (owned outside this repo)

These remain to be configured by DevTestOps before early-gate E2E is live:

1. Per-component config in `red-hat-data-services/rhods-devops-infra`
   (`resources/configs/components-testing/components/<name>/main.yaml`):
   `metadata.earlyGateTestRunner: shiftleft`, the `image` reference
   (`odh-dashboard-operator-e2e`), `image.args`, and
   `qualityGatesMap.default.early-gate`.
2. Konflux tenant registration of the `odh-dashboard-operator-e2e-ci` Component
   (and its `build-pipeline-odh-dashboard-operator-e2e-ci` ServiceAccount) so the
   `.tekton` E2E build PipelineRuns above actually run.
3. ROSA HCP cluster-pool / Jenkins access for the component.

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
