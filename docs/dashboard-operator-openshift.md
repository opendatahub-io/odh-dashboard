# Dashboard Operator: ODH And Self-Managed RHOAI

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
