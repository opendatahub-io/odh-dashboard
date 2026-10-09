# MaaS Portal

## Purpose

The MaaS Portal provides MaaS API key management and AI asset endpoints on RHOAI. The Dashboard Module Controller manages it as an independent operand of the [Dashboard CR](dashboard-operator.md#crd-design).

This guide covers production lifecycle, routing, federation, RBAC, migration, and rollout. For local development, see the [distribution README](../distributions/maas-portal/README.md).

## Lifecycle and Shared Dependencies

**The MaaS Portal is an independent RHOAI-only operand, decoupled from the core dashboard's `managementState`.** It is gated by `spec.maasPortal.managementState`, not the core dashboard lifecycle:

- Namespaced resources are rendered into `APPLICATIONS_NAMESPACE`; portal resources carry `platform.opendatahub.io/part-of: maas-portal`, so core teardown (`part-of: dashboard`) never matches them.
- The shared MaaS and GenAI BFFs remain aggregate-demand resources. Portal-only operation retains them on RHOAI unless an explicit module disable overrides demand.
- Observability is shared by both operands. Portal-only operation auto-detects Perses and deploys its dashboard resources and access policy; `ObservabilityAvailable` continues to report their state after core removal.
- On non-RHOAI platforms the controller removes stale portal resources and reports an informational `UnsupportedPlatform` condition without creating portal demand.

Consequently, core `managementState: Removed` with `maasPortal.managementState: Managed` retains the portal operand and its aggregate MaaS/GenAI demand. When the portal is removed, the controller deletes portal-owned resources, including the serving-certificate Secret that does not use owner-reference garbage collection. If the core dashboard is already `Removed`, removing the remaining portal also cleans up shared observability resources. Dashboard CR deletion cleans up all portal resources.

## Configuration and Availability

When `spec.maasPortal.managementState` is `Managed` on RHOAI and `spec.gateway.domain` is set, the controller deploys `manifests/distributions/maas-portal/`: Deployment, Service, ServiceAccount, ClusterRole, ClusterRoleBinding, NetworkPolicy, and HTTPRoute.

Configure `spec.maasPortal.managementState` independently of the core `spec.managementState`, and set `spec.gateway.domain` for the shared Gateway URL. See the operator's [spec fields](dashboard-operator.md#spec-fields) and [status fields](dashboard-operator.md#status-fields) for the shared CR contract.

The pre-DSC-v3 `maasConsumerPortal` spec and status URL fields remain accepted for compatibility with existing Dashboard resources. When both spellings are present, the DSC-v3 `maasPortal` field takes precedence.

`MaaSPortalAvailable` requires the MaaS and GenAI dependencies, federation ConfigMap reconciliation, an available Deployment, and an accepted/resolved HTTPRoute.

The URL is published only after the Deployment is Available and the HTTPRoute is accepted with resolved references. The last known good URL is retained across transient failures and cleared after successful removal. Portal health contributes to the operator's [aggregate status](dashboard-operator.md#status-aggregation).

The controller requeues while a managed MaaS Portal is awaiting readiness or retrying a transient failure. If the portal is managed, `spec.observability` is unset, and Perses remains undetected, it schedules a five-minute retry when no other retry is pending. Successful detection does not schedule this periodic retry, even though `spec.observability` remains unset in the stored CR.

## Routing and Authentication

- **URL contract**: `https://<spec.gateway.domain>/maas-portal/`. The portal shares the gateway hostname and its authentication session; it does not require a hostname, DNS record, certificate, listener, or OAuth callback of its own.
- **Routing**: the portal HTTPRoute redirects the no-slash path to the trailing-slash URL (302), then matches `/maas-portal` and rewrites only that prefix before forwarding to the portal Service. This makes static assets, deep links, Core-BFF, MaaS, and GenAI APIs work when the core Dashboard HTTPRoute is removed. Gateway path precedence selects this more-specific route ahead of the Dashboard `/` catch-all while both operands are managed.
- **Browser path rollout**: pair the HTTPRoute with a frontend bundle built for `/maas-portal/`; see the [portal rollout instructions](../distributions/maas-portal/README.md#browser-path-rollout). Keep the deprecated status URL synchronized with `status.maasPortalURL` through the existing compatibility helper.
- **Gateway prerequisite**: the installed RHOAI Gateway API v1 implementation must merge same-hostname `HTTPRoute`s using Gateway API path precedence, so the portal's more-specific path wins over the Dashboard `/` catch-all. It must also accept and honor `RequestRedirect` and `URLRewrite` filters. The operand intentionally provides no fallback for Gateway implementations that do not support these behaviors.
- **Authentication and migration**: gateway-owned `/oauth2/sign_out` and `/oauth2/callback` remain unchanged. Login returns to the requested portal deep link. Existing derived-hostname bookmarks are retired and are not redirected, because the operator does not own external hostname exposure. After portal removal, portal-prefixed URLs are handled by the remaining Dashboard catch-all (typically its normal not-found behavior); they no longer serve the portal.
- **Proxy response paths**: the portal's current Core-BFF handlers and module proxy configuration were inspected for browser-visible redirects. The proxy preserves relative upstream `Location` headers and validates absolute redirect targets for SSRF; no portal-reachable redirect requiring prefix rewriting was found, so no `X-Forwarded-Prefix` contract is configured.

## Federation and Resource Identity

The manifest source directory and Deployment identity are separate operator constants. The renamed bundle uses `maas-portal` for Kubernetes resources, labels, RBAC subjects, subscription grants, and the generated serving-certificate Secret. Its federation ConfigMap is `maas-portal-federation-config`, mounted through the volume of the same name at `/etc/odh-dashboard/maas-portal-federation-config.json`. The parameter key is `maas-portal-federation-config`; the rollout annotation is `dashboard.opendatahub.io/maas-portal-federation-config-hash`.

After applying the workload resources, the controller patches the Deployment template with the federation content hash to trigger configuration rollouts.

Portal resources use `platform.opendatahub.io/part-of: maas-portal`, separating portal cleanup from the core dashboard's `part-of: dashboard` selector.

Removal explicitly deletes the serving-certificate Secret `maas-portal-tls`, HTTPRoute, RBAC, ServiceAccount, and other portal-owned resources. ServiceAccount deletion failures are reported and retried. Core-dashboard removal does not delete them while the portal remains Managed.

## Subscription RBAC

Scoped Roles and RoleBindings are deployed in existing `redhat-ods-operator`, `opendatahub-operator`, and `openshift-operators` namespaces, plus the controller's configured operator namespace. The portal BFF tries the configured namespace first, then the platform defaults, using named Subscription reads only. Namespace creation triggers reconciliation, and owned Role/RoleBinding watches repair deleted or modified grants.

## Observability

When enabled, the portal federation config includes Perses. Custom services must satisfy the [Perses service requirements](dashboard-operator.md#perses-service-requirements).

## Upgrade Migration and Rollout

Deploy the matching Core-BFF image built from `distributions/core-bff/Dockerfile.workspace` with a portal frontend built for `/maas-portal/` and a nonempty `/static/maas-portal/index.html` before upgrading the operator. Set `RELATED_IMAGE_ODH_CORE_BFF_IMAGE` to that image digest. The Deployment uses `--static-assets-dir=/static/maas-portal`; an older image cannot serve this operand. Verify the image's assets, then check `deployment/maas-portal` rollout and HTTPRoute acceptance before considering the upgrade complete.

While the legacy Deployment exists, rendered MaaS, GenAI, and Perses ingress policies allow both portal identities with the same namespace and port restrictions. After legacy cleanup, the controller schedules another reconciliation to remove the temporary peers.

Reconciliation performs a retryable migration:

1. Apply the new federation ConfigMap and workload while retaining the legacy route and its backend resources. Wait for the new Deployment's current generation to finish rolling out the desired image and federation hash: all desired replicas must be updated, ready, and available, with no old replicas remaining. The controller reads the API server directly for this check so a stale cache cannot authorize cutover.
2. Delete the legacy `maas-consumer-portal` HTTPRoute and observe its absence before applying `maas-portal`. A short routing interruption can occur between deletion and replacement admission.
3. Wait for the new route to be accepted with resolved references, the Deployment to be Available, and shared dependencies to be healthy. Then delete the remaining legacy resources, including old federation/params ConfigMaps, TLS Secret, namespaced and cluster RBAC, and the old ServiceAccount.

The controller discovers progress from cluster state on every reconciliation; failures and resources awaiting deletion are retried. A restart after deleting the old route resumes by applying the new route. Legacy cleanup recognizes reserved names and legacy labels and retains shared core, MaaS, GenAI, and observability resources. Subscription cleanup covers the configured operator namespace, `redhat-ods-operator`, `opendatahub-operator`, and `openshift-operators`; labeled subscription grants in formerly configured namespaces are also removed. All deletion failures, including forbidden ServiceAccount deletions, are reported and retried while cleanup continues for other legacy resources. Removal and finalizer cleanup handle old resources, new resources, or both.

Waiting for rollout completion or legacy route deletion reports `MigrationPending` and preserves the previous URL. Once the replacement portal passes serving readiness checks, pending legacy resource deletion keeps the portal Available and publishes its current URL while scheduling cleanup retries. Removal or unsupported-platform cleanup awaiting legacy deletion reports informational `CleanupPending` and preserves the previous URL. Actual API failures retain their failure conditions. Dashboard deletion retains its finalizer until legacy deletion completes.

Keep legacy resource discovery, route cutover, and temporary network-policy peers while any supported upgrade path can start from a release that creates `maas-consumer-portal` operands. Retire these mechanisms together only after the supported upgrade baseline guarantees the renamed operands and completed legacy cleanup, including ServiceAccount removal. A completed migration on one cluster is insufficient evidence to remove compatibility for other supported installations. CR field compatibility is independent of the browser path and resource migration.

For downstream delivery, merge the upstream fix and verify that autosync has landed before opening a new downstream PR. Mirror the upstream Core-BFF and operator Dockerfile edits in `Dockerfile.konflux.core-bff` and `Dockerfile.konflux.dashboard-operator`. Record the autosync commit/PR evidence and new downstream PR link in RHOAIENG-99076.

## Interactions

- **Core-BFF** serves the packaged portal assets and proxies browser requests to shared services. See the [Core-BFF documentation](../distributions/core-bff/bff/README.md).
- **MaaS and GenAI** provide the shared module BFFs required by the portal. See the [MaaS overview](../packages/maas/docs/overview.md) and [GenAI overview](../packages/gen-ai/docs/overview.md).
- **Observability** uses the shared Perses service and access policies. See the [observability overview](../packages/observability/docs/overview.md).
