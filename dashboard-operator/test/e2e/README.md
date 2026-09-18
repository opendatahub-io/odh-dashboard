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
- A dedicated, existing applications namespace configured on the
  dashboard-operator for namespaced operand resources.
- A kubeconfig stored in one file.
- A configured Gateway whose externally reachable hostname is known.
- RBAC to get the test Namespace and Dashboard CRD; get, create, patch, and
  delete Dashboards; list, get, patch, and delete Deployments and Pods; get and
  list Services, PodDisruptionBudgets, HTTPRoutes, and Endpoints; get
  ServiceAccounts and NetworkPolicies; create, get, and delete ConfigMaps; get
  the `openshift-service-ca.crt` ConfigMap; and create the `pods/portforward`
  subresource in the test namespace.

Set the required environment variables:

```bash
export KUBECONFIG=/absolute/path/to/kubeconfig
export TEST_NAMESPACE=dashboard-operator-e2e
export TEST_GATEWAY_DOMAIN=dashboard.example.com
# Optional for gateways signed by a CA outside the host's system trust bundle:
export TEST_GATEWAY_CA_BUNDLE=/absolute/path/to/gateway-ca.pem
export TEST_PLATFORM=odh # or rhoai
export TEST_OPERATOR_DEPLOYMENT=dashboard-operator # optional; this is the default
```

`TEST_GATEWAY_DOMAIN` and `TEST_PLATFORM` are required by the module lifecycle
suite. `TEST_NAMESPACE` must be the dashboard-operator applications namespace,
because the suite verifies the operands reconciled there. Run the platform
service-name cases once for each distribution; `TEST_PLATFORM` prevents a run
against one distribution from accidentally claiming coverage for the other.
The degraded-image case temporarily rolls the dashboard-operator Deployment;
set `TEST_OPERATOR_DEPLOYMENT` when it has a non-default name.

`TestMain` verifies connectivity, the namespace, the gateway domain, the
Dashboard CRD, and its served API version. It then creates one E2E-owned
`default-dashboard` with `managementState: Managed`, waits for the operator to
apply its resources, and shares that fixture across the package. After the test
run, it deletes only that exact UID and reports cleanup failures. The framework
verifies the CRD but never installs it.

## Run Locally

From `dashboard-operator`:

```bash
make test-e2e
```

Pass standard `go test` options through `E2E_TEST_ARGS`, including a selective
test run:

```bash
make test-e2e E2E_TEST_ARGS='-run TestE2E_BFFHealthchecks'
```

Run the RHOAIENG-83658 cases, or one ticket story, with:

```bash
make test-e2e E2E_TEST_ARGS='-run TestE2EModule'
make test-e2e E2E_TEST_ARGS='-run TestE2EModuleLifecycle/TS2_06_override_wins_over_component'
```

The current Dashboard API no longer exposes `deploymentMode`, and the
controller no longer supports sidecar module deployment. The former TS5
sidecar-to-standalone cases are therefore represented by standalone resource,
legacy-sidecar cleanup, federation, and idempotency coverage. Restoring literal
mode-switch coverage requires a historical release test and is not claimed by
this suite.

The equivalent direct command is:

```bash
go test -v -count=1 -tags=e2e -timeout=30m -run TestE2E_BFFHealthchecks ./test/e2e/...
```

## Compile and Run in a Container

Build the standalone test binary without connecting to a cluster:

```bash
make build-e2e
```

This produces `bin/e2e.test`. Copy that binary into a test image, mount a
kubeconfig, set the environment variables required by the selected suite, and
run it with standard testing flags:

```bash
./bin/e2e.test -test.v -test.run TestE2E_BFFHealthchecks
```

Embed small fixtures with `//go:embed`, or mount them at a path supplied by an
environment variable. Do not depend on paths that exist only on a developer's
machine.

## Authoring Scenarios

Files that connect to a cluster must use the `e2e` build tag. Pure helper logic
and its unit tests remain untagged so the ordinary unit-test target exercises
them. Reuse the shared helpers for:

- waiting for a Dashboard condition;
- waiting for an available Deployment;
- creating the singleton Dashboard atomically;
- deleting an E2E-owned Dashboard and waiting for its removal;
- waiting for ready Service Endpoints;
- discovering resources owned by the E2E-created Dashboard UID;
- waiting for an admitted Gateway API HTTPRoute;
- forwarding a local port to a ready Service pod;
- matching unstructured Kubernetes data with JQ expressions; and
- validating the Dashboard platform contract.

The create helper atomically creates the singleton and fails if it already
exists. It returns the API-assigned UID; cleanup requires that UID and refuses
to delete a different or unlabeled object. `TestMain` owns this lifecycle so
every top-level E2E test can run independently with `-run` while a full package
run performs only one operand rollout.

Keep each scenario independent and runnable with `-run`. Tests must wait for
observable conditions instead of sleeping, clean up resources they own, and
avoid relying on execution order.

## Operand Health Scenarios

The package validates that all owned operand Deployments become available, all
owned Services publish ready endpoints, the Dashboard HTTPRoute is admitted and
externally reachable, each standalone BFF returns HTTP 200 from `/healthcheck`,
and the core PodDisruptionBudget selects ready Dashboard pods.

The BFF checks use the HTTPS Service ports declared by the current module
registry (`8043`, `8143`, `8243`, `8343`, `8543`, `8643`, `8743`, and `8843`).
They port-forward to a ready backing pod through the Kubernetes API and verify
each certificate with the namespace's `openshift-service-ca.crt` bundle and the
Service DNS name. The external route uses the expected gateway domain and the
host's system trust bundle, augmented by `TEST_GATEWAY_CA_BUNDLE` when set.
