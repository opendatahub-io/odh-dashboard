# Agent-Ops BFF v1 Migration Gaps

Gaps identified during the kagenti-to-Sandbox CR migration. Each item needs a follow-up story or decision.

## RBAC / SSAR for Sandbox CRs

- The deploy RBAC checks now verify `agents.x-k8s.io/sandboxes` create/get, but there is no SSAR
  check for delete/patch (used by DeleteAgent, StopAgent, StartAgent). Story 73189 covers this
  but is unassigned.
- The enrichment RBAC still checks `agents.x-k8s.io/sandboxes` get/list for card enrichment
  access, which is correct but may need refinement once the Sandbox CRD stabilizes.

## Restart endpoint

- `POST /agents/:ns/:name/restart` is implemented as stop + start (paused -> running). A true
  restart (delete pod, let controller recreate) requires looking up the Pod owned by the Sandbox
  CR and deleting it. This needs a separate story once the Sandbox controller's pod ownership
  model is confirmed.

## Route creation for external access

- Routes are created without an ownerReference when using the Sandbox CR path (unlike the old
  AgentRuntime path where the CR was the owner). The Sandbox controller may auto-create Routes
  in the future. Needs alignment with the controller team.

## Sandbox CR status.serviceFQDN

- The code falls back to constructing the service URL from the agent name when no Service object
  is found. The Sandbox CR `status.serviceFQDN` field is read but only used as a fallback in
  summary listing. Once the controller reliably populates this, we should prefer it over manual
  Service lookups.

## HTTP card probe limitations

- The card probe runs from the BFF pod, which must have network access to agent Services in
  the cluster. In environments with strict NetworkPolicies this may fail silently (probe returns nil).
- The probe uses a 5-minute in-memory cache. There is no cache invalidation mechanism when an
  agent is redeployed or updated. A future version could use watch events to invalidate.
- The OpenAI /v1/models fallback only extracts the model ID as the agent name. Richer metadata
  (capabilities, description) is not available from this endpoint.

## OpenAPI spec updates

- Stories 62701 and 62716 cover OpenAPI spec updates for the new routes. The new endpoints
  (DELETE, stop, start, restart, card) need to be documented in the OpenAPI spec.

## Sandbox CRD availability caching

- The `isSandboxCRDAvailable()` check is cached after the first call. If the CRD is installed
  after the BFF starts, it won't be detected until restart. Consider adding a cache TTL or
  re-checking on deploy failure.

## MCP tool connections

- The `mcp.kagenti.com` API group was removed from the MCP server registration GVR list. Only
  `mcp.kuadrant.io` remains. If a new MCP CRD API group is introduced, it needs to be added here.

## Deployment fallback path

- The fallback Deployment path (when Sandbox CRD is not installed) creates standalone Deployments
  and Services without any CR owner. These resources are managed by the `odh-agent-ops` managed-by
  label. If the Sandbox CRD is later installed, existing Deployment-based agents won't be
  automatically migrated to Sandbox CRs.
