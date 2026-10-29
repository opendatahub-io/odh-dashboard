# Dashboard Operator: Operations, Deployment, And Development

Use this guide for controller installation, development, and operational
behavior shared across Dashboard lifecycles. For the CRD and readiness model,
read the [shared controller contract](dashboard-operator.md) first; use the
[OpenShift lifecycle guide](dashboard-operator-openshift.md) or
[RHAII/XKS lifecycle guide](dashboard-operator-xks.md) for platform behavior.

## Controller Behavior

The controller is distinct from the Dashboard BFFs: it is a leader-electable
Go reconciler that watches the `Dashboard` CR, while BFFs are request-scoped Go
HTTP services. It deploys BFF containers but never calls their HTTP APIs.

Server-side apply uses the `dashboard-operator` field owner and force ownership
to adopt resources previously managed by the legacy ODH Operator without
recreating them. It also repairs a drifted Service port list before apply when
an associative-list key changes, preserving an allocated `nodePort`; resources
annotated `opendatahub.io/managed: "false"` are not changed.

The cluster-scoped CR can own resources in more than one namespace. On CR
deletion, or soft removal when a retained MaaS Portal no longer needs them, the
controller explicitly removes labeled observability resources across namespaces,
including legacy resources without a component label. It never deletes the
target namespace itself or an unowned CRD.

The generated federation ConfigMap can include installer-owned community-plugin
entries from `redhat-ods-community-plugins/community-plugins-config`. Missing
source resources are ignored. Accepted entries receive a
`/community-plugins/<remote-name>/` proxy path and participate in the same
hash-triggered rollout as built-in modules. See [Community Plugin
Registration](community-plugin-registration.md) for its schema and ownership.

`dashboard-operator-config` is optional. Its `reconcileInterval` duration
defaults to `0` (no periodic requeue); a missing or malformed ConfigMap does
not block reconciliation.

## TLS And Webhooks

cert-manager provisions separate webhook and metrics serving certificates from
the namespace-scoped `selfsigned-issuer`. Their DNS names cover both
`<service>.<namespace>.svc` and
`<service>.<namespace>.svc.cluster.local`.

Metrics use HTTPS on `:8443` by default. The validating webhook is disabled by
default; enable it only through the matching Helm or `config/webhook-enabled`
deployment path. Both listeners support HTTP/2 and use the OpenShift APIServer
TLS profile when it is available.

At startup, an absent OpenShift API group or empty profile uses Mozilla
Intermediate TLS 1.2 defaults. Authorization failures and invalid profiles are
fail-closed. Transient API failures start temporarily with Intermediate and the
profile watcher retries; a later profile change restarts the manager to apply
the new policy. The controller ClusterRole must therefore allow `get`, `list`,
and `watch` on `config.openshift.io/apiservers`.

## Prerequisites And Configuration

| Requirement | Purpose |
| --- | --- |
| cert-manager | Provisions metrics and, when enabled, webhook certificates. |
| Dashboard CRD | Apply it before starting the controller. |
| Operator namespace | Set `OPERATOR_NAMESPACE` or `--namespace`. |
| Applications namespace | Optionally set `APPLICATIONS_NAMESPACE`; it otherwise defaults to the operator namespace. |
| Platform and images | `ODH_PLATFORM_TYPE` can override detection; `RELATED_IMAGE_*` values select release images. |

Important manager flags are `--manifests-base-path` (default
`/opt/manifests/dashboard`), `--metrics-bind-address` (`:8443`),
`--health-probe-bind-address` (`:8081`), `--leader-elect`, `--secure-metrics`,
`--namespace`, and `--webhook-port` (`9443`). The chart lists every supported
related image under `relatedImages`; the
[Model Registry OCI upload base image](model-registry-oci-base-image.md) is
administrator-owned and intentionally has no related-image mapping.

## Develop And Test

Require Go 1.26+, Helm 3+, a current `kubectl` or `oc`, and Docker or Podman
for image builds. The Makefile obtains controller-gen and golangci-lint.

```bash
cd dashboard-operator
make build
make test
make test-integration
make lint
make chart-validate
# Required after changing api/v1alpha1 types
make generate && make manifests
```

Run the controller against a development cluster after applying the CRD:

```bash
cd dashboard-operator
oc apply -f config/crd/bases/
go run ./cmd/manager \
  --namespace opendatahub \
  --manifests-base-path ../manifests \
  --leader-elect=false \
  --secure-metrics=false
```

For a standalone deployment, install the CRD then render either the Helm chart
or `config/default`. Use `config/webhook-enabled` only when enabling the
webhook. When changing from the enabled overlay to the default overlay, delete
the old `ValidatingWebhookConfiguration` before applying: `oc apply` does not
remove it, and a registration without a running server rejects Dashboard
creates. Parent overlays that change namespace or name prefix must include the
cert-manager wiring transformer, plus webhook wiring when applicable, so
certificate SANs and CA injection remain correct.

Production ODH installs are managed by the ODH Operator, which renders the
chart, creates the Dashboard CR from DSC component availability, and passes the
operator image through `RELATED_IMAGE_ODH_DASHBOARD_OPERATOR_IMAGE`. The
default controller NetworkPolicy allows HTTPS metrics from supported monitoring
namespaces, health probes on TCP 8081, and the webhook port when enabled; set
`networkPolicy.enabled=false` only when a deployment supplies its own policy.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Dashboard creation is rejected by the validating webhook | Verify the webhook server is enabled; otherwise delete the stale `ValidatingWebhookConfiguration` left by an earlier enabled install. |
| TLS-profile startup failure | Verify the controller's APIServer RBAC and access to `apiservers/cluster`. |
| ImagePullBackOff | Verify the selected `RELATED_IMAGE_*` values and image onboarding. |
| Dashboard or module is not ready | Inspect `DashboardAvailable`, the primary Deployment, its HTTPRoute and Gateway parent; then inspect module Deployments and federation-config hash annotation. |
| Wrong-name CR is blocked by singleton CEL validation | Treat CRD-validation removal as an emergency procedure: temporarily remove validation, remove the finalizer/delete the CR, and immediately reapply the generated CRD. |

For envtest authoring and debugging, see [envtest Integration
Tests](envtest-integration-tests.md). The `Chaos Validation` workflow validates
the operator-chaos knowledge model and experiments when controller, manifest,
API, configuration, or Makefile changes affect its scope; update those assets
when managed resource identity, expected replicas, labels, or recovery
assumptions change.
