# Dashboard Operator: RHAII/XKS

This guide describes the XKS lifecycle for the standalone RHAII dashboard
bundle. Read the [shared controller contract](dashboard-operator.md) for the
common CRD, status, removal, and development behavior.

## Scope

XKS renders `manifests/distributions/rhaii`, a namespace-neutral standalone
bundle with these primary resources:

| Resource | Name |
| --- | --- |
| Deployment | `rhaii-dashboard` |
| Service | `rhaii-dashboard` |
| HTTPRoute | `rhaii-dashboard` |
| Supporting resources | ServiceAccount, RBAC, NetworkPolicy, and PodDisruptionBudget |

This lifecycle intentionally does not use the OpenShift core overlay,
federated BFF modules, observability, MaaS Portal, or OpenShift
cross-namespace RBAC.

## Gateway Prerequisites

Gateway API must be installed. The Dashboard operator does not create the XKS
authentication Gateway or its external hostname; it supplies the bundle's
parent reference through Kustomize. By default the bundle targets:

| Parameter | Default |
| --- | --- |
| `gateway-name` | `rh-ai-gateway` |
| `gateway-namespace` | `rh-ai-gateway` |

The Gateway's attachment policy must permit the HTTPRoute. The Gateway owns the
external hostname, so this lifecycle intentionally leaves `status.url` empty.

## Configuration

The render namespace controls namespaced resources. Set
`rhaii-dashboard-namespace` to that same namespace so RBAC bindings reference
the deployed ServiceAccount.

`RELATED_IMAGE_ODH_RHAII_DASHBOARD_IMAGE` overrides the dashboard image. The
checked-in `:main` reference remains a development fallback, not a release
selection mechanism.

## Conditions

| Condition | XKS meaning |
| --- | --- |
| `ProvisioningSucceeded` | The RHAII bundle rendered and applied. |
| `DashboardAvailable` | The Deployment has observed its current generation and is available, and the HTTPRoute is accepted with resolved references for a declared parent at its current generation. |
| `Ready` | Provisioning and dashboard availability succeeded and no XKS degradation is reported. |

A rollout or Gateway admission wait is normal progress, reported as
`DashboardAvailable=False`, rather than `Degraded`.

## Removal

`managementState: Removed` tears down the standalone bundle and clears its
status. It does not run OpenShift migration cleanup because the environments
are mutually exclusive. Finalization relies on owner references for the
applied bundle; XKS creates no cross-namespace resources requiring explicit
finalizer cleanup.

## Troubleshooting

| Reason | Meaning | Action |
| --- | --- | --- |
| `DeploymentNotFound` | The primary workload has not appeared. | Check rendering, apply status, and namespace. |
| `DeploymentNotAvailable` | The workload has not completed rollout. | Inspect Deployment conditions and Pods. |
| `HTTPRouteNotFound` | The route has not appeared. | Check rendering, apply status, and namespace. |
| `HTTPRouteNotAccepted` | The Gateway has not accepted the route or resolved its backend. | Inspect HTTPRoute parent status, Gateway policy, and Service. |
| `Ready=False` after apply | Availability or a diagnosed condition is still false. | Start with `DashboardAvailable`, then inspect the condition message. |

For bundle parameters and local rendering, see the [manifest guide](../manifests/README.md).
