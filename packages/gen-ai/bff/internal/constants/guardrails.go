package constants

// GuardrailsOrchestrator CR constants
const (
	// GuardrailsOrchestratorName is the constant name of the GuardrailsOrchestrator CR
	// Similar to MCPServerName = "gen-ai-aa-mcp-servers"
	GuardrailsOrchestratorName = "custom-guardrails"

	// GuardrailsOrchestratorAPIVersion is the API version for the GuardrailsOrchestrator CR
	GuardrailsOrchestratorAPIVersion = "trustyai.opendatahub.io/v1alpha1"

	// GuardrailsOrchestratorKind is the kind for the GuardrailsOrchestrator CR
	GuardrailsOrchestratorKind = "GuardrailsOrchestrator"

	// GuardrailsServicePort is the default port for the guardrails service
	GuardrailsServicePort = 8080
)

// Guardrails Status Phases
const (
	GuardrailsPhaseReady       = "Ready"
	GuardrailsPhaseProgressing = "Progressing"
	GuardrailsPhaseFailed      = "Failed"
	GuardrailsPhaseNotDeployed = "NotDeployed" // CR not found in cluster
)
