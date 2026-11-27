# Model-serving API on xKS (RHAI-50760)

Status: accepted (2026-11-27) and implemented.

## Problem

`/api/service/model-serving/*` is a pass-through to `model-serving-api`, a small Go server that
ships with odh-model-controller (`server/` in opendatahub-io/odh-model-controller). Core BFF's
proxy (`internal/api/model_serving_proxy.go`) defaults to
`https://model-serving-api.<namespace>.svc.cluster.local:443`. The RHAII bundle
(`manifests/distributions/rhaii/`) deploys no such Service and sets no `MODEL_SERVING_HOST`, so on
xKS every call under that prefix ends in a local proxy error.

## Inventory

Every caller of `/api/service/model-serving/` in the repo, excluding tests and Cypress mocks:

| #   | Method and route (after the prefix)                 | Consumer                                                                                                                                                                                                       | Reached on RHAII today?                                                                            | What upstream does                                                                                                                                                                                                                                                                                                                                                                                                                           | Kubernetes resources and verbs (upstream)                                                                                                                                                                                                   |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `GET /api/v1/gateways?namespace=<ns>`               | `packages/model-serving/src/shared/api/gatewayDiscovery.ts` via `useGetGatewayOptions`, rendered by `packages/llmd-serving/src/wizardFields/gateway/GatewaySelectField.tsx` (deployment wizard, gateway field) | No (see below)                                                                                     | SSAR as the caller, then lists Gateways with its own ServiceAccount and keeps listeners whose `allowedRoutes` admit `<ns>` (`Same`, `All`, `Selector` against the namespace labels). Returns `{gateways:[{name,namespace,listener,status,displayName?,description?}]}`. Status is `Ready` when `Accepted` and `Programmed` are True, `NotReady` when either is False, else `Unknown`. A denied or failed access check returns an empty list. | Caller: `create selfsubjectaccessreviews` for `create serving.kserve.io/llminferenceservices` in `<ns>`. ServiceAccount: `list gateway.networking.k8s.io/gateways` (all namespaces), `get namespaces/<ns>` when a listener uses a selector. |
| 2   | `GET /api/v1/samples/llm-d?type=<t>[&topology=<t>]` | `packages/llmd-serving/src/settings/topologyConfigs/TopologyConfigurationCreateEdit.tsx`, `.../routingConfigs/RoutingConfigurationCreateEdit.tsx` (admin settings pages)                                       | No: RHAII bundles the `deployments` extension profile of llmd-serving, which has no settings pages | Returns a static YAML template embedded at build time. No auth, no Kubernetes calls.                                                                                                                                                                                                                                                                                                                                                         | None                                                                                                                                                                                                                                        |

Why route 1 is not reached on RHAII today: the gateway field extensions require the
`llmd-gateway-field` feature flag, which `distributions/rhaii/distribution.yaml` does not set, and
`distributions/rhaii/src/context/HostApiProvider.tsx` does not provide `ModelServingDataContext`, so
`useGetGatewayOptions` short-circuits to an empty list. Without the field, the wizard writes
`spec.router.gateway: {}` and KServe attaches the default Gateway. The deploy journey on xKS
therefore makes no model-serving call yet. It needs route 1 as soon as RHAII enables gateway
selection, which is the next step for multi-gateway and MaaS-backed deployments.

The inventory has to be repeated when RHAII ships another llmd-serving or model-serving extension
profile: `grep -rn "service/model-serving" packages distributions --include=*.ts --include=*.tsx`.

## Decision

**Native Core BFF route for gateway discovery on xKS. No model-serving-api backend in the RHAII
bundle. OpenShift keeps the proxy unchanged.**

1. On a confirmed xKS platform (configured with `--platform-type=XKS` or `ODH_PLATFORM_TYPE=XKS`,
   as `manifests/distributions/rhaii/deployment.yaml` does, or positively detected), Core BFF serves `GET /api/service/model-serving/api/v1/gateways` itself,
   with the same request and response shape as upstream, so `gatewayDiscovery.ts` needs no change.
   Every Kubernetes call runs as the caller (RHOAIENG-96081):
   - SSAR `create serving.kserve.io/llminferenceservices` in `<ns>`. Denied returns
     `{gateways: []}`, as upstream does.
   - `list gateway.networking.k8s.io/v1 gateways` across namespaces as the caller.
   - `get namespaces/<ns>` as the caller only when a listener uses a selector. If that is forbidden
     or the namespace is gone, only `kubernetes.io/metadata.name` is known (the API server sets it
     to the name): selectors that use only that label, or select everything, are still decided;
     the others are skipped (fail closed), the rest are returned, and the BFF logs a warning with
     the namespace and the number of skipped listeners. The built-in `view`, `edit` and `admin`
     roles bound in the project grant this read; a custom deploy role must add it.
   - The access review and the discovery share one 10-second budget. The identity lookup that
     every authenticated route makes first (`secureRoute`) has its own.
2. On xKS, nothing else under `/api/service/model-serving/` is routed: the proxy is not registered
   and other paths return the standard 404 error envelope instead of a 502 to a host that doesn't
   exist. The samples route is not part of the RHAII journey.
3. On OpenShift (ODH and RHOAI), registration stays exactly as today: the whole prefix is proxied to
   `model-serving-api` with the caller's token. No behaviour change. A platform guessed as xKS after
   an inconclusive probe also keeps the proxy, because it may be OpenShift: the native route needs
   a confirmed xKS platform, like the cluster-TLS-profile decision (`ServeTLSWithoutClusterProfile`).
4. The RHAII bundle ships a ClusterRole `rhaii-dashboard-gateway-reader`
   (`gateway.networking.k8s.io/gateways: list`), unbound, documented next to the dashboard
   access role: the installer binds it to the same users or groups that may use the dashboard.
   Without the binding, the route returns the API server's 403 (`v1.Status`) and the wizard shows its existing
   "Unable to fetch resources" message.
5. RHAII's `HostApiProvider` provides `ModelServingDataContext` with `getGatewayOptions`, so the
   field works as soon as `llmd-gateway-field` is turned on. Turning the flag on is a product call
   and stays out of this change.

### Why native

- The set is one route of about 100 lines of logic (access check, list, listener filter, status).
  Shipping a second Deployment, Service, certificate, NetworkPolicy and RBAC for it costs more than
  the code, and adds an image the RHAII bundle would have to pin and patch.
- Upstream lists Gateways with its ServiceAccount after a caller SSAR. Deployed on xKS, that breaks
  the caller-credentials contract, which allows no ServiceAccount fallback. A native route can
  honour the contract; the upstream server can't without changing it.
- It feeds RHOAIENG-83702 (business-logic routes in Go): the handler is platform-neutral and RHOAI
  can switch to it when Core BFF replaces Fastify.

### Why not the samples route too

It is static content that odh-model-controller owns and versions with the LLMInferenceService
configs it ships. A copy in Core BFF would drift. It stays proxied on OpenShift. If RHAII later
ships the settings profile, revisit (serve the templates from a ConfigMap the platform provides, or
deploy the upstream server).

### RHOAI impact

None in this change: OpenShift keeps the proxy for both routes. When RHOAI moves to the native
route (follow-up), the difference is RBAC: upstream lets any user who may create
LLMInferenceServices in a project see every Gateway that admits it, because the ServiceAccount does
the list. The caller-credentials route needs users to hold `list gateways`. RHOAI would need an
equivalent reader role bound to authenticated dashboard users (or aggregated into the dashboard
user role) before switching. Response shape and frontend stay the same.

## Alternatives considered

- **Deploy model-serving-api in the RHAII bundle behind the proxy.** Rejected: ServiceAccount list
  breaks the caller-credentials contract; extra Deployment, TLS and RBAC for one route.
- **Native route that lists Gateways with the Core BFF ServiceAccount after a caller SSAR (upstream
  parity).** Rejected: same contract break; it would also make Core BFF's ServiceAccount hold
  cluster-wide Gateway read.
- **List only in configured gateway namespaces (for example `rh-ai-gateway`).** Allows a
  namespaced Role instead of a ClusterRole, but misses Gateways in other namespaces that admit the
  project, which upstream returns. Kept as an option if cluster-wide read is unacceptable.

## Implementation

| Piece                                                      | Where                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route registration (confirmed xKS only) and no proxy there | `bff/internal/api/routes_model_serving.go`, `bff/internal/api/model_serving_proxy.go`                                                             |
| Handler: query validation, caller SSAR, response           | `bff/internal/api/gateway_discovery_handler.go`                                                                                                   |
| Gateway list, listener filter, status                      | `bff/internal/repositories/gateway_discovery.go`                                                                                                  |
| Response models                                            | `bff/internal/models/gateway.go`                                                                                                                  |
| OpenAPI                                                    | `GET /api/service/model-serving/api/v1/gateways` in `bff/openapi/src/core-bff.yaml`                                                               |
| Envtest data (Gateway CRD, Gateways, test users)           | `bff/internal/integrations/kubernetes/k8mocks/mock_gateways.go`                                                                                   |
| Contract tests                                             | `contract-tests/__tests__/xks/testCoreBffModelServingGateways.test.ts`, `contract-tests/__tests__/openshift/testCoreBffModelServingProxy.test.ts` |
| Bundle RBAC                                                | `manifests/distributions/rhaii/cluster-role-gateway-reader.yaml`                                                                                  |
| RHAII host data service                                    | `distributions/rhaii/src/context/HostApiProvider.tsx`                                                                                             |

Behaviour that differs from model-serving-api, on purpose:

- A failed access review is an error instead of an empty list, so "no gateways" and "the check did
  not run" stay distinguishable: the API server's status when it answered (401 for a rejected
  token, 403, 429), 504 on timeout, otherwise 500. A review the API server completes with
  `allowed: false` is a denial even when it carries an `evaluationError` (an authorizer webhook
  failure, for example), as everywhere in Core BFF and upstream, so that case is an empty list.
- A Gateway list the caller may not perform is the API server's 403 (Kubernetes `v1.Status`).
  Upstream never sees it, because its ServiceAccount lists.
- A cluster without the Gateway API returns an empty list instead of a 500.
- Errors use the Core BFF error contract (`{"error":{code,message,requestId}}` or a sanitized
  `v1.Status`) instead of `{"error":"..."}`. The frontend only checks `res.ok`.
- A namespace the caller cannot read drops only the label-selector listeners it cannot decide (with
  a warning log) instead of failing the request. Upstream reads it with its ServiceAccount, so it never hits this.
- There is no `GATEWAY_LABEL_SELECTOR` equivalent: every Gateway is listed. Upstream's default is
  empty, so the default behaviour matches.
- The caller's list is paged (500 per page). A continue token that expires mid-list returns the API
  server's 410; upstream lists from a cache in one call. `k8s.io/client-go/tools/pager`, which falls
  back to a full list, would remove that; it needs more than 500 Gateways to matter.

Like every `/api` response, this one carries `Cache-Control: no-store` and `Vary` on the credential
headers (bootstrap-contract.md, "Response caching"): the list depends on the caller's permissions.

`MODEL_SERVING_HOST` is still validated at startup on every platform, because validation runs
before the platform is resolved, but a confirmed xKS platform does not use it.

## Follow-ups

- Enable `llmd-gateway-field` for RHAII when product asks for gateway selection, and bind
  `rhaii-dashboard-gateway-reader` in the xKS installer (dashboard-operator chart) next to the
  dashboard access role.
- RHOAI: decide the RBAC story (reader role for dashboard users) before routing OpenShift to the
  native handler, as part of RHOAIENG-83702.
- The samples route stays upstream-only. Revisit if RHAII ships the llmd-serving settings profile.
- The gateway field's failure message ("ensure that the model-serving-api service is accessible")
  names a service xKS does not have; on xKS the usual cause is a missing
  `rhaii-dashboard-gateway-reader` binding. The copy is UX-owned (RHOAIENG-96902), so changing it
  needs UX sign-off.
- `distributions/core-bff/manifests/base` (the Tilt and CI bundle) does not ship the reader role. Its
  callers are cluster admins in those environments, and RHAI-50761 replaces that bundle.
