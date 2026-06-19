# Agent Runtime Detail — Agent Card Handoff

**Repo:** `odh-dashboard` monorepo  
**Package:** `packages/agent-ops/`  
**Endpoint:** `GET /api/v1/agents/runtimes/{ns}/{name}`  
**Status:** BFF complete (Phase 1 + Phase 2). Contract tests and cluster smoke-test passed. **Frontend is out of scope** for this workstream — a separate team consumes the BFF API.

---

## Goal

Extend the Agent Ops BFF detail endpoint so the frontend can populate the agent detail UX mock (description, skills, sidebar metadata, UUID, SPIFFE ID, etc.) using data from Kagenti **AgentRuntime card discovery** (`--enable-card-discovery` on kagenti-operator) plus workload metadata.

---

## What Was Implemented (Phase 1)

### OpenAPI (`packages/agent-ops/api/openapi/agent-ops.yaml`)

- Extended `AgentRuntimeDetail` with optional nullable `agentCard`.
- New schemas: `AgentCardDetail`, `AgentCardSkill`, `AgentCardSkillParameter`, `AgentCardProvider`, `AgentCardCapabilities`.
- Example response updated with sample card data.

### BFF models (`bff/internal/models/`)

- `agent_card.go` — UI-facing card DTOs.
- `agent_runtime_detail.go` — added `AgentCard *AgentCardDetail`.

### Agent integration types (`bff/internal/integrations/agents/`)

- `types.go` — `AgentCardObserved`, skill/extension structs on `AgentDetail`.
- `metadata.go` — `LabelProtocolPrefix`, `A2AAgentCardPath`, `DefaultSpiffeTrustDomain`.
- `errors.go` — `ErrForbidden` for workload access denied.

### Kubernetes client (`bff/internal/integrations/agents/kubernetes/`)

- `agent_runtime.go` — reads `agent.kagenti.dev/v1alpha1/agentruntimes`, parses `status.card` + `status.linkedSkills`.
- `client.go` — resilient workload lookup (Deployment → StatefulSet → Job); `finalizeAgentDetail` for best-effort Service + card enrichment.
- Dynamic client via `KubernetesClientInterface.DynamicClient()`.

### K8s client interface (`bff/internal/integrations/kubernetes/`)

- `client.go` — added `DynamicClient()`.
- `internal_k8s_client.go`, `token_k8s_client.go` — implementations.

### Mapper (`bff/internal/mapper/`)

- `agent_card.go` — maps observed card + workload metadata to `AgentCardDetail`.
- `agent.go` — prefers card description over annotation; attaches `agentCard` to detail response.
- In-cluster `agentCardUrl` = `{primaryServiceUrl}/.well-known/agent-card.json`.

### Mock data (`bff/internal/integrations/agents/mock/demo_client.go`)

- Demo agent includes full sample `AgentCard` for local dev/tests.

### Error handling / resilience

**Partial success (200):**
- Workload found → return detail even if Service or AgentRuntime/card fails.
- Service failure → empty `serviceEndpoints`, no in-cluster `agentCardUrl` from service.
- AgentRuntime/card failure → `agentCard` may still be present when Phase 2 enrichment succeeds (OpenShift Route external URL, namespace MCP tool connections, or `linkedSkills`-only card data). Otherwise `agentCard` is `null`.

**Full failure:**
- All workload kinds NotFound → **404**
- Forbidden on workload reads, none found → **403**
- Client factory / unrecoverable API error → **500**

### Tests added

- `mapper/agent_card_test.go`
- `kubernetes/agent_runtime_test.go`
- `kubernetes/client_detail_test.go`
- Updated handler tests for `agentCard` presence in mock response.

Run: `cd packages/agent-ops/bff && go test ./...`

---

## UX Mock → API Field Mapping

| Mock field | API field | Source |
|------------|-----------|--------|
| Description | `description` or `agentCard.description` | Card preferred over annotation |
| Skills section | `agentCard.skills[]` | `AgentRuntime.status.card.skills` |
| Version | `agentCard.version` | status.card |
| Provider | `agentCard.provider` | status.card.provider |
| Documentation | `agentCard.documentationUrl` | status.card |
| AgentCard URL | `agentCard.agentCardUrl` | Derived in-cluster from Service |
| Default I/O modes | `agentCard.defaultInputModes/outputs` | status.card |
| Streaming / optional caps | `agentCard.capabilities` | status.card.capabilities + extensions |
| Protocols (A2A, HTTP) | `agentCard.protocols` | card protocol + `protocol.kagenti.io/*` labels + HTTP |
| Labels (sidebar pills) | `agentCard.labels` | provider org, card name, app labels |
| UUID | `agentCard.uuid` | workload `metadata.uid` |
| SPIFFE ID | `agentCard.spiffeId` | `attestedAgentSpiffeID` or computed `spiffe://cluster.local/ns/{ns}/sa/{sa}` |
| Authentication | `agentCard.authenticationMethods` | Derived from `transportSecurity` (mTLS), AuthBridge mode, and `supportsAuthenticatedExtendedCard` |
| Tool connections | `agentCard.toolConnections` | MCP `MCPServerRegistration` names/toolPrefix in namespace (best-effort) |
| Public AgentCard URL | `agentCard.externalAgentCardUrl` | OpenShift Route targeting agent Service (best-effort) |
| Linked skills | `agentCard.linkedSkills` | `AgentRuntime.status.linkedSkills` |

---

## Not Yet Implemented (follow-ups)

1. **Frontend** — **out of scope here**; separate team wires `AgentDeploymentDetailPage` to this BFF (see [Frontend consumer notes](#frontend-consumer-notes) below).
2. **OpenAPI client codegen** — regenerate TS types when the frontend team starts integration.
3. **Agent-specific tool connections** — MCP registrations are namespace-scoped today; no per-agent link convention yet.
4. **Agent-ops module manifests** — wire agent-ops BFF container into `manifests/modular-architecture/` when ready for federated deploy.
5. **Live `agentCard` on cluster** — blocked until kagenti operator webhooks/controller are healthy and `AgentRuntime.status.card` is populated (see [Verification](#verification)).

## Phase 2 Implemented (BFF)

- **RBAC:** `manifests/modular-architecture/modules-cluster-role.yaml` — `impersonate` on users/groups/serviceaccounts (internal auth), `agentruntimes`, `routes`, `mcpserverregistrations` get/list.
- **External URL:** optional `externalAgentCardUrl` from OpenShift Route → Service match.
- **Authentication:** `authenticationMethods` from card + AgentRuntime `authBridgeMode`.
- **Tool connections:** MCP ServerRegistration names in namespace.
- **AgentRuntime lookup:** falls back to `spec.targetRef.name` when CR name ≠ workload name.

## Previously open (now done)

~~3. Public AgentCard URL~~  
~~4. Authentication: Bearer~~  
~~5. Tool connections (namespace MCP registrations)~~  
~~6. RBAC for AgentRuntime~~  
~~7. AgentRuntime lookup by targetRef~~  
~~8. Contract tests~~

---

## Verification

### Contract tests (2026-06-15)

```bash
cd packages/agent-ops && npm run test:contract
```

**Result:** 3/3 passed (healthcheck, list runtimes, runtime detail with mock `agentCard`).

### Cluster smoke-test (dareed ROSA cluster)

**Setup:** `make dev-bff-federated` (port 4021, `AUTH_METHOD=user_token`, real K8s client).

```bash
TOKEN=$(oc whoami -t)
curl -s -H "x-forwarded-access-token: $TOKEN" http://localhost:4021/api/v1/agents/runtimes | jq .
curl -s -H "x-forwarded-access-token: $TOKEN" \
  http://localhost:4021/api/v1/agents/runtimes/redhat-ods-applications/weather-agent | jq .
```

| Check | Result |
|-------|--------|
| List runtimes | 200 — returns `weather-agent` in `redhat-ods-applications` |
| Detail (existing agent) | 200 — workload, service endpoints, conditions; **`agentCard` omitted** (no AgentRuntime CR) |
| Detail (missing agent) | 404 |
| BFF log for card lookup | `AgentRuntime unavailable for card discovery … not found` (expected best-effort) |

**Cluster blockers for live `agentCard`:**

- `kagenti-controller-manager` pod **Pending** (worker machine pool 0/4 on this cluster).
- `weather-agent` deployment **0/1** — webhook `inject.kagenti.io` has no endpoints.
- No `agentruntimes.agent.kagenti.dev` CRs in any kagenti-enabled namespace.

Once the operator is running and agents are Ready, re-run the detail curl and expect `data.agentCard` when `status.card` is populated.

### Unit tests

```bash
cd packages/agent-ops/bff && go test ./...
```

---

## Frontend consumer notes

**Scope:** This repo delivers the BFF + OpenAPI contract only. Do not block on frontend work here.

**Contract:** `packages/agent-ops/api/openapi/agent-ops.yaml`

**Endpoints:**

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/agents/runtimes` | List; no auth gate beyond identity injection |
| GET | `/api/v1/agents/runtimes/{ns}/{name}` | Detail; requires workload RBAC (Jobs: job `get`; Deployments/StatefulSets: workload + service `get`) |

**Auth (federated / ODH):** `x-forwarded-access-token: <user token>` (see `bff/README.md`).

**Key response shape:** `AgentRuntimeDetail.agentCard` is **optional** — `null` when no card or enrichment data is available; may be a **partial** object (for example external URL or tool connections only) when AgentRuntime card data is missing.

**Mock dev (no cluster):** `make dev-bff` with `MOCK_AGENT_CLIENT=true` — demo agent `agent-ops-demo/sample-support-agent` includes full `agentCard`.

**Field mapping:** See [UX Mock → API Field Mapping](#ux-mock--api-field-mapping) above.

---

## Kagenti Operator Reference (external)

Card discovery lives in **kagenti-operator** (not the Kagenti repo at sibling path):

- Flag: `--enable-card-discovery` (default **on** in current operator main).
- Data path: `AgentRuntime.status.card` (embeds A2A `AgentCardData` + fetch metadata).
- Operator docs: `kagenti-operator/docs/api-reference.md`, `brainstorm/01-agentcard-into-agentruntime.md` in the kagenti-operator repository.
- The sibling Kagenti application repo does not contain operator source; chart pins operator at `kagenti-operator-chart` in `charts/kagenti/values.yaml`.

### `status.card` fields available from operator

name, description, version, url, documentationUrl, iconUrl, provider, capabilities (streaming, pushNotifications, extensions), defaultInputModes/Outputs, skills (full A2A structure), protocol, transportSecurity, lastCardFetchTime, cardHash, validSignature, signatureKeyID, attestedAgentSpiffeID, linkedSkills (on status, not inside card).

---

## Key Files to Read First

```
packages/agent-ops/api/openapi/agent-ops.yaml
packages/agent-ops/bff/internal/api/agent_runtime_detail_handler.go
packages/agent-ops/bff/internal/repositories/agent_runtimes.go
packages/agent-ops/bff/internal/integrations/agents/kubernetes/client.go
packages/agent-ops/bff/internal/integrations/agents/kubernetes/agent_runtime.go
packages/agent-ops/bff/internal/mapper/agent.go
packages/agent-ops/bff/internal/mapper/agent_card.go
packages/agent-ops/bff/internal/models/agent_card.go
packages/agent-ops/bff/internal/integrations/agents/mock/demo_client.go
```

---

## Suggested Next Steps (post-BFF)

1. **Unblock kagenti on target cluster** — scale workers, fix operator/webhook, confirm `AgentRuntime.status.card` on a Ready agent.
2. **Re-verify detail curl** — expect populated `agentCard` including optional `externalAgentCardUrl` when Route exists.
3. **Frontend team** — consume OpenAPI; wire detail page (out of scope for BFF PR).
4. **Ship agent-ops module manifest** — when federated deploy is scheduled.

---

## Prompt to Paste in New Agent Session

```
Continue Agent Ops agent runtime detail work in the odh-dashboard monorepo.

Read handoff: packages/agent-ops/docs/agent-runtime-detail-handoff.md

Phase 1 + Phase 2 BFF is done: GET /api/v1/agents/runtimes/{ns}/{name} returns optional/partial agentCard from AgentRuntime.status.card plus best-effort Route/MCP enrichment.

Next priority: [USER TO SPECIFY — e.g. frontend wiring, cluster verification, contract tests]

Follow packages/agent-ops/AGENTS.md contract-first workflow. Do not modify packages/maas/ without contract assessment.
```

---

## Decisions Made

- **agentCardUrl:** in-cluster Service URL + `/.well-known/agent-card.json`.
- **externalAgentCardUrl:** optional Route hostname + A2A path when Route targets the agent Service.
- **Unknown auth:** return empty array when card has no AuthBridge/mTLS signals; otherwise derive methods.
- **Tool connections:** namespace MCP ServerRegistration names (not agent-specific until a convention exists).
- **agentCard field:** `null` when no card or enrichment data; may be partial (external URL, tool connections, linked skills) without full AgentRuntime card.
- **Description:** card description overrides workload annotation when card present.
