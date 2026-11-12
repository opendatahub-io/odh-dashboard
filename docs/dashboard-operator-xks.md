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
| Certificate and issued Secret | `rhaii-dashboard-tls` |
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

The operator deploys the bundle to `APPLICATIONS_NAMESPACE`; when that variable
is unset, it uses the operator namespace. During managed reconciliation, the
operator injects that namespace as `rhaii-dashboard-namespace`. This keeps
namespaced resources, RBAC ServiceAccount subjects, and Certificate DNS names
aligned. The checked-in parameter is only a standalone-render default; do not
set a different value for an operator-managed deployment.

| Environment variable | Override |
| --- | --- |
| `RELATED_IMAGE_ODH_RHAII_DASHBOARD_IMAGE` | RHAII dashboard image |
| `RELATED_IMAGE_ODH_KUBE_RBAC_PROXY_IMAGE` | kube-rbac-proxy image |

The checked-in dashboard `:main` reference remains a development fallback, not
a release selection mechanism.

### Certificate issuer contract

XKS uses cert-manager to maintain the TLS Secret mounted by kube-rbac-proxy.
The operator reads the issuer reference from the platform-managed Dashboard
ConfigMap in the operator namespace. The ConfigMap name defaults to
`odh-dashboard-config` and can be supplied by `OPERATOR_CONFIGMAP_NAME`.

| ConfigMap key | Purpose |
| --- | --- |
| `CERT_MANAGER_ISSUER_REF_NAME` | Name of the issuer used by the dashboard Certificate |
| `CERT_MANAGER_ISSUER_REF_KIND` | Kind of that issuer, such as `ClusterIssuer` or a supported third-party issuer kind |
| `CERT_MANAGER_ISSUER_REF_GROUP` | Optional API group for a supported third-party issuer; defaults to `cert-manager.io` |

Name and kind are required and validated before rendering. When group is not
published, the controller uses the native cert-manager API group. The resulting
`rhaii-dashboard-tls` Certificate and issued Secret are created in the
applications namespace. Its DNS SANs identify the dashboard Service in that
namespace.

### Controller Certificate RBAC

The Certificate belongs to the applications namespace, while XKS can run the
Dashboard operator in a separate operator namespace. Install the controller
chart with `xks.enabled: true` and `applicationsNamespace` set to that
applications namespace. The chart then creates a namespaced Role and
RoleBinding that bind the operator ServiceAccount across namespaces.

The binding permits only the fixed `rhaii-dashboard-tls` Certificate. It does
not grant cluster-wide Certificate access. Platform installers must pass the
same applications namespace to the chart and the controller's
`APPLICATIONS_NAMESPACE`; Helm rendering cannot derive a Role namespace from a
runtime environment variable.

### Access policy

kube-rbac-proxy authorizes each authenticated request with a
SubjectAccessReview for the synthetic capability
`dashboard.opendatahub.io/rhaii-dashboard-access` with verb `list`. The bundle
creates the corresponding `rhaii-dashboard-access` ClusterRole but deliberately
does not bind it. The XKS installer or platform administrator must bind that
role to the identities allowed to use the dashboard.

## Conditions

| Condition | XKS meaning |
| --- | --- |
| `ProvisioningSucceeded` | The RHAII bundle rendered and applied. |
| `DashboardAvailable` | The Deployment has observed its current generation and completed its rollout; the HTTPRoute is accepted with resolved references for a declared parent at its current generation. |
| `Ready` | Provisioning and dashboard availability succeeded and no XKS degradation is reported. |

A rollout or Gateway admission wait is normal progress, reported as
`DashboardAvailable=False`, rather than `Degraded`.

## Removal

`managementState: Removed` tears down the standalone bundle and clears its
status. It deletes the fixed managed Certificate and its issued TLS Secret
explicitly because cert-manager does not label the output Secret for the
ordinary managed-resource sweep. It does not run OpenShift migration cleanup
because the environments are mutually exclusive.

CR deletion is distinct from soft removal. Finalization relies on owner
references for the namespaced bundle and waits for managed workloads to
terminate before releasing their NetworkPolicy. XKS creates no
cross-namespace resources requiring explicit finalizer cleanup.

## Troubleshooting

| Reason | Meaning | Action |
| --- | --- | --- |
| `DeploymentNotFound` | The primary workload has not appeared. | Check rendering, apply status, and namespace. |
| `DeploymentNotAvailable` | The workload has not completed rollout. | Inspect Deployment conditions and Pods. |
| `HTTPRouteNotFound` | The route has not appeared. | Check rendering, apply status, and namespace. |
| `HTTPRouteNotAccepted` | The Gateway has not accepted the route or resolved its backend. | Inspect HTTPRoute parent status, Gateway policy, and Service. |
| `Ready=False` after apply | Availability or a diagnosed condition is still false. | Start with `DashboardAvailable`, then inspect the condition message. |

For bundle parameters and local rendering, see the [manifest guide](../manifests/README.md).
