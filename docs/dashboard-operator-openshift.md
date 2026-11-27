# Dashboard Operator: ODH and Self-Managed RHOAI

This guide describes the OpenShift lifecycles of the Dashboard Module
Controller. Read the [shared controller contract](dashboard-operator.md) first
for CRD, condition, removal, and development behavior common to every
lifecycle.

## Core Dashboard

| Platform | Bundle | Primary Deployment and HTTPRoute |
| --- | --- | --- |
| Open Data Hub (ODH) | `manifests/odh` | `odh-dashboard` |
| Self-managed Red Hat OpenShift AI (RHOAI) | `manifests/rhoai` | `rhods-dashboard` |

Both use the OpenShift core dashboard and apply the same feature model:

- Dashboard modules are gated by `spec.components` and per-module overrides.
- The controller writes a federation ConfigMap for enabled modules and patches
  the core Deployment with its content hash to roll out configuration changes.
- Module operands receive namespaced RBAC and the controller can reconcile
  optional Perses observability resources.
- The `Ready` aggregate includes provisioning, core dashboard availability,
  degradation, observability, and MaaS Portal state where applicable.

## ODH Behavior

ODH manages the core dashboard, modules, and optional observability. It does
not own MaaS Portal resources. When a Dashboard CR requests a managed portal,
the controller reports that request as unsupported rather than creating a
partial portal lifecycle.

## Self-Managed RHOAI Behavior

In addition to the common OpenShift feature set, self-managed RHOAI:

- Applies RHOAI dashboard configuration defaults after core manifests are
  deployed. A temporarily unavailable configuration API is retried.
- Can reconcile the optional MaaS Portal lifecycle and its dependencies.
- Can preserve portal-required shared dependencies during core dashboard
  removal until the portal no longer needs them.

## Gateway And Removal

The core dashboard uses Gateway API HTTPRoutes. The shared availability check
requires the primary Deployment to be available and the primary HTTPRoute to be
accepted with resolved references for its declared parent.

Common teardown removes the core resources, including the PodDisruptionBudget
and—when the Gateway API mapping is available—the HTTPRoute. The controller
still has a legacy Route URL lookup for compatibility, but Route admission is
not a readiness dependency.

## Namespaced RBAC

ODH and self-managed RHOAI grant the Dashboard service account API access
in the namespaces named by `spec.notebooksNamespace` and
`spec.modelRegistryNamespace`. XKS grants no cross-namespace RBAC and keeps
no consent state.

When consent enforcement is enabled, the Dashboard service account only
receives cross-namespace Roles and RoleBindings when all of these conditions
are true:

- `webhook.enforceNamespacedRBACConsent` is `true`;
- the validating webhook is enabled;
- `webhook.namespacedRBACWriters` contains at least one exact Kubernetes username;
- the target namespace has
  `dashboard.opendatahub.io/allow-namespaced-rbac=true`; and
- the orchestrator sets `spec.notebooksNamespace` or
  `spec.modelRegistryNamespace` on the singleton Dashboard CR.

The webhook protects target fields, consent grants, the controller-owned grant
inventory and enforcement-state annotations, and the operator-namespace state
ConfigMap that survives Dashboard replacement. Only the dashboard operator
service account may change those controller-owned objects. Only the exact
usernames in `webhook.namespacedRBACWriters` may set the namespace label to
`true`; anyone already authorized by Kubernetes to update the namespace may
remove it and revoke consent. API-server match conditions skip the webhook for
unrelated Dashboard and namespace updates and for namespace creation without
consent. Consent changes through the namespace main resource, `status`, or
`finalize` subresource all use the same policy. This prevents the Dashboard
service account, even though it can patch other namespace metadata, from
granting itself access without making normal namespace creation depend on
webhook availability.

Removing the consent label causes the controller to revoke the managed Role and
RoleBinding before other deployment, removal, or finalizer work runs. Revocation
uses controller-protected inventory in the operator-namespace state ConfigMap
and mirrors it on the singleton Dashboard, so changing subjects, stripping
mutable labels, replacing the reserved RoleBinding, changing its name, or
replacing the Dashboard cannot hide an active grant from cleanup. A
one-time label-selected migration records grants made by older versions; normal
reconciliation then uses direct Role reads and namespace-scoped RoleBinding
lists. A configured target is not treated as proof that reserved-name RBAC is
operator-owned: migration and repair require the durable inventory or the
operator ownership labels. The controller first empties the Role rules, then removes every
RoleBinding that references the reserved Role and deletes the Role. It retains
the inventory entry until deletion is confirmed, including when a finalizer
delays deletion. Normal and Removed-state reconciliation reports this as
NotReady; Dashboard CR deletion retains its finalizer and retries cleanup.

Consent enforcement defaults to `false` so a dashboard-operator image can be
upgraded before the platform operator installs the webhook. In this transition
mode the controller preserves the legacy grants without requiring a consent
label and reports a separate informational `NamespacedRBACConsentEnforced=False`
condition with reason `NamespacedRBACConsentNotEnforced` when a target is
configured. This condition does not replace workload degradation or readiness
status. Enabling enforcement writes a monotonic latch to the operator-namespace
`dashboard-namespaced-rbac-state` ConfigMap and mirrors it on the Dashboard for
observability. The controller-protected ConfigMap survives Dashboard deletion
and recreation, so a later deployment that accidentally omits the flag remains
fail-closed. If that deployment also disables the validating webhook, the
controller revokes existing namespaced grants and refuses to create new ones
until admission protection is restored. Enabling enforcement without the
webhook and at least one trusted writer is rejected at chart rendering and
manager startup. Operator-managed RHOAI and ODH installations normally
configure the applicable platform operator service account username:

```text
system:serviceaccount:redhat-ods-operator:redhat-ods-operator-controller-manager
system:serviceaccount:opendatahub-operator:opendatahub-operator-controller-manager
system:serviceaccount:openshift-operators:opendatahub-operator-controller-manager
```

For a standalone manager invocation, the equivalent setting is the
comma-separated `--namespaced-rbac-writers` flag together with
`--enforce-namespaced-rbac-consent`. Usernames are matched exactly; Kubernetes
groups and wildcard values are not supported.

The platform operator change that enables enforcement must update the chart
configuration and `RELATED_IMAGE_ODH_DASHBOARD_OPERATOR_IMAGE` in the same ODH
or RHOAI release change. Enabling the new flag with an older image causes an
unknown-flag startup failure; deploying the new image with older configuration
is safe because it remains in legacy transition mode. In that mode the webhook
keeps its existing singleton behavior and does not restrict target fields or
namespace consent until enforcement is explicitly enabled.

## Controller Metrics NetworkPolicy

The operator Helm chart installs a default-enabled ingress `NetworkPolicy`
(`\<namePrefix\>dashboard-operator-metrics`) for the controller pod. It permits:

- TCP 8443 (HTTPS metrics) from the supported monitoring namespaces:
  `openshift-monitoring`, `openshift-user-workload-monitoring`,
  `redhat-ods-monitoring`, and `opendatahub-monitoring`.
- TCP 8081 (health and readiness probes), port-scoped with no peer selector,
  because kubelet/node-originated probes are host-sourced and cannot be limited
  by NetworkPolicy peers.
- The webhook port when `webhook.enabled=true`.

Set `networkPolicy.enabled=false` in `charts/dashboard/values.yaml` to opt out.
The controller exempts this policy from `managementState: Removed` teardown so
its metrics isolation remains in place while the controller is running.

## Troubleshooting

| Status | Likely meaning | Action |
| --- | --- | --- |
| `ProvisioningSucceeded=False` | Rendering, parameters, or apply failed. | Inspect the condition message and controller logs. |
| `DashboardAvailable=False` | The primary Deployment has not rolled out or its HTTPRoute is not accepted/resolved. | Inspect the named Deployment and HTTPRoute, then its Gateway parent. |
| `Ready=False` with `DashboardAvailable=True` | An OpenShift-specific dependency is not healthy. | Inspect `Degraded`, observability, MaaS Portal, and module conditions. |
| RHOAI defaults pending | The configuration API is temporarily unavailable. | Wait for the bounded retry and verify the configuration API. |

For manifest parameters and local rendering, see the [manifest guide](../manifests/README.md).
