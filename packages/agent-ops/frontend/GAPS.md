# Agent Ops v1 Frontend - Implementation Gaps

## Completed

- [x] API paths updated from `/agents/runtimes` to `/agents`
- [x] Lifecycle API functions added: deployAgent, deleteAgent, stopAgent, startAgent, restartAgent, getAgentCard
- [x] Types updated: operatingMode field, DeployAgentRequest, AgentCardResponse
- [x] Table row kebab menu with lifecycle actions (Stop/Start/Restart/Delete)
- [x] Delete confirmation modal
- [x] Detail page lifecycle action buttons (Stop/Start/Restart/Delete)
- [x] Detail page async agent card fetch with loading skeleton and "no card" state
- [x] Wizard submit calls POST /api/v1/agents with form data
- [x] Wizard submit navigates to detail page on success, shows error notification on failure
- [x] Catalog extension registered (agent-catalog.deployment/navigate-wizard)
- [x] Wizard reads URL search params for pre-fill from catalog
- [x] Status utilities updated for Paused, Terminating operating modes
- [x] Status filter options updated to include Stopped and Terminating
- [x] All kagenti references removed from frontend code
- [x] Access review updated from agent.kagenti.dev/agentruntimes to agents.x-k8s.io/sandboxes
- [x] Mock data updated with operatingMode field

## Gaps and Follow-up Items

### API Contract Verification
- The `assembleModArchBody` wrapper is used for POST/CREATE requests based on the maas package pattern, but the BFF may expect a different body format. Needs E2E testing with the actual BFF.
- `restDELETE` is called with 5 args `(hostPath, path, body, queryParams, opts)` — verify this matches the mod-arch-core signature. The maas package uses the same pattern.
- The `getAgentCard` endpoint returns `null` on 404 via `response.data ?? null`, but the BFF might return a non-200 status instead; `handleRestFailures` may throw before reaching the `.then()`. May need a try/catch wrapper for 404 specifically.

### Wizard Fields Not Yet Wired
- `framework` — the form type has a TODO comment for this field (RHOAIENG-62719). No UI input exists yet.
- `description` — no text input exists in the wizard for agent description. The `DeployAgentRequest` includes it but the wizard does not collect it.
- `envVars` — the Environment Variables wizard step is a placeholder. No actual env var inputs exist.
- `ports` — no port configuration UI in the wizard. The `DeployAgentRequest` type supports it.
- The wizard URL pre-fill only reads `image`, `name`, and `protocol` params. `framework`, `description`, `port`, and `envVars` params from the catalog extension are accepted but not consumed by the wizard form (the form fields don't exist yet).

### Networking & Security Steps
- Networking step is a placeholder — no port or service configuration UI.
- Security and Identity step is a placeholder — auth bridge and mTLS fields were planned for kagenti but never implemented. Since kagenti is dead, these should be redesigned for Sandbox CR security model.

### UX Design Input Needed
- Detail page action button layout: currently uses inline buttons in the header (Stop/Start, Restart, Delete). A kebab dropdown might be preferred for secondary actions to reduce visual clutter.
- Delete confirmation modal is minimal; could benefit from showing additional context (e.g., number of pods, dependent resources).
- Agent card loading skeleton is simple; may want a more structured skeleton matching the actual card layout.
- Catalog extension uses `window.location.href` for cross-module navigation which causes a full page reload. Consider using a shared navigation context or event bus for SPA navigation.

### Test Coverage
- No unit tests added for new API functions (deployAgent, deleteAgent, stopAgent, startAgent, restartAgent, getAgentCard).
- No unit tests for the DeleteAgentModal component.
- No unit tests for the useAgentCardDetail hook.
- Existing Cypress tests may need updates for the new kebab actions and delete modal.
- The useExitDeployAgentWizard tests need updating since the function signature changed (added formData and isSubmitting).
- The AgentRuntimesTableRow tests need updating since props changed (added onDeleteAgent, onRefresh).

### Other
- The `Terminating` display status uses `InProgressIcon` from PatternFly icons — verify this icon is available in the project's PatternFly version.
- Filter toolbar `filterAgentRuntimes.ts` utility may need updates to handle the new `Stopped` and `Terminating` filter options correctly.
