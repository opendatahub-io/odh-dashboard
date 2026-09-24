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
- For platform-contract conformance, the dashboard-operator validating webhook
  must be enabled with valid TLS, a populated CA bundle, and ready Service
  endpoints.
- The platform controller that normally creates `default-dashboard` scaled down
  for lifecycle scenarios, so it cannot recreate the singleton during cleanup.
- No existing `default-dashboard` for the lifecycle scenario. The create helper
  refuses to adopt or modify an existing singleton.
- A dedicated, existing applications namespace configured on the
  dashboard-operator for namespaced operand resources.
- A kubeconfig stored in one file with a bearer token accepted by the Gateway.
- A configured Gateway whose externally reachable hostname is known.
- An admitted `model-catalog` HTTPRoute in the applications namespace, backed
  by an enabled Model Catalog operand, for gateway sub-path conformance checks.
- RBAC to get the test Namespace and Dashboard CRD; get, create, patch, and
  delete Dashboards; list, get, patch, and delete Deployments and Pods; get and
  list Services, PodDisruptionBudgets, HTTPRoutes, and Endpoints; get
  ServiceAccounts and NetworkPolicies; create, get, and delete ConfigMaps; get
  the `openshift-service-ca.crt` ConfigMap; create the `pods/portforward`
  subresource in the test namespace; and list ValidatingWebhookConfigurations.

The operator-chaos scenarios additionally require RBAC to get, list, and delete
controller Pods; get the controller Deployment; create, get, and delete
NetworkPolicies; create, get, update, and delete PodDisruptionBudgets in the
operator namespace; create the `pods/eviction` subresource; and patch operand
Deployments in the test namespace. The cluster CNI must enforce Kubernetes
NetworkPolicy.

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

The contract scenario additionally requires `status.releases` to report
semantic versions for both `dashboard` and `platform`. Build the operator image
with a semantic `OPERATOR_VERSION` (the development default may be `unknown` or
a Git SHA), and configure the operator's `odh-dashboard-config` ConfigMap with
a semantic `platformVersion`. The test treats a missing webhook or version as a
failed deployment contract; it does not skip those assertions.

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

Run only the platform-contract conformance scenario with:

```bash
make test-e2e E2E_TEST_ARGS='-run ^TestE2E_PlatformContractConformance$'
```

The equivalent direct command is:

```bash
go test -v -count=1 -tags=e2e -timeout=30m -run TestE2E_BFFHealthchecks ./test/e2e/...
```

## Operator Chaos Scenarios

The destructive chaos suite executes the `pod-kill`, `network-partition`, and
`pdb-block` experiments from `chaos/experiments` against the deployed
dashboard-operator controller. It uses operator-chaos injectors inside this E2E
framework so each test can prove that its fault occurred, explicitly revert it,
and only then verify recovery. The scenarios run serially and must use an
isolated early-gate cluster.

Set an explicit safety opt-in and run the selective target:

```bash
export TEST_ENABLE_CHAOS=true
export TEST_OPERATOR_NAMESPACE=<namespace-containing-dashboard-operator>
# Optional when the installed controller uses a different name:
export TEST_OPERATOR_DEPLOYMENT=dashboard-operator

make test-e2e-chaos
```

When the compiled test binary does not run from a repository checkout, mount
the experiment directory and set `TEST_CHAOS_EXPERIMENT_DIR` to that absolute
path. CI should run the test through its Go-to-JUnit wrapper and retain the
captured pod UIDs, injected resource names, eviction result, and recovery logs.

The suite validates:

- controller pod replacement after a forced kill while operands remain healthy;
- managed-resource drift remaining unreconciled after the singleton controller
  is restarted under an active NetworkPolicy, followed by informer reconnection
  and drift repair after policy removal; and
- a real `policy/v1` eviction denied with HTTP 429 while the injected
  `maxUnavailable: 0` PDB is active.

Every reversible fault registers cleanup immediately. Cleanup uses a fresh
timeout context, calls both the injector cleanup and stateless revert paths, and
verifies that the injected NetworkPolicy or PDB is absent before proceeding.
The NetworkPolicy injector also stamps its resource with the experiment TTL.
If the test process is forcibly terminated, remove any NetworkPolicy or PDB
leftovers before retrying:

```bash
oc delete networkpolicy,poddisruptionbudget \
  -n "$TEST_OPERATOR_NAMESPACE" \
  -l app.kubernetes.io/managed-by=operator-chaos
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
the `/catalog/` sibling HTTPRoute wins over the Dashboard catch-all and returns
a successful Model Catalog JSON response or a validated Model Catalog JSON
`401` response rather than Dashboard SPA HTML, redirects, or unrelated statuses,
and the core PodDisruptionBudget selects ready Dashboard pods.

The BFF checks use the HTTPS Service ports declared by the current module
registry (`8043`, `8143`, `8243`, `8343`, `8543`, `8643`, `8743`, and `8843`).
They port-forward to a ready backing pod through the Kubernetes API and verify
each certificate with the namespace's `openshift-service-ca.crt` bundle and the
Service DNS name. The external route uses the expected gateway domain and the
host's system trust bundle, augmented by `TEST_GATEWAY_CA_BUNDLE` when set.
