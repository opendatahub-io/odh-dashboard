# Agent Ops v1 Implementation — Gap Log

Post-kagenti refactor on branch `agent-ops/v1-implementation`. 52 files modified, 4 new files.

## Build Status

| Component | Build | Tests |
|-----------|-------|-------|
| BFF (Go) | PASS | ALL PASS |
| Frontend (TypeScript) | PASS (agent-ops scope) | Not run (existing unit tests may need signature updates) |

## What Was Implemented

### BFF (Go backend)
- Replaced all `kagenti.io/*` labels with `opendatahub.io/*` labels
- Replaced `agent.kagenti.dev/v1alpha1/agentruntimes` GVR with `agents.x-k8s.io/v1beta1/sandboxes`
- `buildSandboxCR()` — creates Sandbox CR with `spec.podTemplate`, `spec.operatingMode: running`
- CRD auto-detection via `isSandboxCRDAvailable()` with cached result
- `deploySandbox()` — creates ServiceAccount + Sandbox CR + optional Route
- `deployFallback()` — creates ServiceAccount + Deployment + Service + Route (when CRD absent)
- `DeleteAgent()` — deletes Sandbox CR or Deployment+Service, with managed-by safety check
- `StopAgent()` — patches Sandbox CR `operatingMode: paused` or scales Deployment to 0
- `StartAgent()` — patches Sandbox CR `operatingMode: running` or scales Deployment to 1
- `RestartAgent()` — deletes pod to trigger controller recreation
- HTTP card probe: `probeAgentCard()` with 3s timeout, 5min TTL cache, A2A + OpenAI fallback
- Separate card endpoint handler: `GET /agents/:ns/:name/card`
- Lifecycle handlers: stop, start, restart, delete
- API path rename: `/agents/runtimes` → `/agents`
- Sandbox CR listing in `listAgentSummaries` alongside Deployments/StatefulSets/Jobs
- Removed `isKagentiEnabledNamespace` filter — all accessible namespaces are valid
- Updated all tests — manifests, deploy, client, handlers, middleware, mapper
- Updated mock client with lifecycle methods
- Updated RBAC checks for `agents.x-k8s.io/sandboxes`
- Removed `AuthBridgeMode`, `MTLSMode`, `AuthBridgeEnabled` from `DeployAgentParams`

### Frontend (TypeScript/React)
- API paths updated: `/agents/runtimes` → `/agents`
- New API functions: `deployAgent`, `deleteAgent`, `stopAgent`, `startAgent`, `restartAgent`, `getAgentCard`
- Kebab menu on list table with lifecycle actions (Stop/Start/Restart/Delete)
- Delete confirmation modal (`DeleteAgentModal`)
- Detail page action buttons (Stop/Start, Restart, Delete)
- Detail page async agent card section with loading skeleton + "no card" fallback
- Wizard submit calls `POST /api/v1/agents` and navigates to detail on success
- Catalog extension handler: `agent-catalog.deployment/navigate-wizard`
- Wizard reads URL search params for catalog pre-fill
- Status utilities: Paused, Terminating operating modes
- Filter options: Stopped, Terminating added
- SSAR check updated: `agent.kagenti.dev/agentruntimes` → `agents.x-k8s.io/sandboxes`
- Zero kagenti references remaining in frontend source

## Gaps Not Covered by Jira

### Must-address before merge

1. **Wizard steps 3-6 still placeholders** (RHOAIENG-62719, In Progress by Daniel Reed)
   - Environment variables input, networking/ports, security — all placeholder steps
   - Wizard submit works but can only pass image, name, namespace, protocol

2. **Wizard `description` and `framework` fields don't exist in UI**
   - `DeployAgentRequest` type supports them
   - No text inputs in the wizard collect them
   - Not covered by any story — should be part of 62719

3. **Frontend unit tests need signature updates**
   - `AgentRuntimesTableRow` tests: new `onDeleteAgent`, `onRefresh` props
   - `useExitDeployAgentWizard` tests: new `formData`, `isSubmitting` params
   - No tests for `DeleteAgentModal`, `useAgentCardDetail`, new API functions
   - Existing Cypress tests may need updates for kebab actions

### Should-address

4. **OpenAPI spec not updated** (RHOAIENG-62701 + 62716, In Progress)
   - New endpoint paths, Sandbox CR response shapes, card endpoint, lifecycle endpoints
   - Owned by Daniel Reed and Gage — in progress separately

5. **RBAC/SSAR audit for Sandbox CR** (RHOAIENG-73189, New, unassigned)
   - SSAR checks updated in code but not E2E verified
   - Need to verify ClusterRole/RoleBinding for `agents.x-k8s.io/sandboxes` create/get/list/delete/patch

6. **Sandbox CR `status.serviceFQDN` not consumed**
   - The Sandbox controller writes the auto-created Service FQDN to `status.serviceFQDN`
   - BFF currently falls back to `getServiceBestEffort` by name convention
   - Should read from CR status instead for reliability

7. **Restart implementation is basic**
   - Currently deletes the pod by label selector
   - For Sandbox CR: controller should recreate; for Deployment: deployment controller handles
   - Not tested with real Sandbox controller

8. **Catalog extension uses `window.location.href`**
   - Causes full page reload instead of SPA navigation
   - Should use shared navigation context or event bus for cross-module navigation

9. **Agent card probe won't work from non-cluster BFF**
   - Probe makes HTTP GET to `svc.cluster.local` — only works when BFF runs in-cluster
   - Local dev mode needs port-forward overrides (prototype had this, not carried forward)

10. **Env var secrets via k8s Secret** (RHOAIENG-73640, New)
    - Deploy wizard creates plain env vars visible via `oc describe`
    - Secret creation story exists but unassigned
    - Security hygiene gap for API_KEY values

### Not in scope (3.6+)

11. **No E2E Cypress tests** (RHOAIENG-62712, 62723, unassigned)
12. **No hardware profile selection** (RHOAIENG-73190, unassigned)
13. **No event tracking / analytics** (RHOAIENG-67741, unassigned)
14. **OpenShell Gateway API integration** — 3.6 TP, integration model TBD
15. **Playground / chat-with-agent** — blocked on RHAISTRAT-1744
16. **Agent registry integration** — MLflow-based, 3.6 EA2
