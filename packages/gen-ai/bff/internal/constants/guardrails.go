package constants

import "fmt"

// GuardrailsOrchestrator CR constants
const (
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
)

// Safety Provider configuration for TrustyAI FMS
const (
	// SafetyProviderModule is the default module version for TrustyAI FMS provider
	SafetyProviderModule = "llama_stack_provider_trustyai_fms==0.3.2"

	// SafetyProviderID is the default provider ID for TrustyAI FMS
	SafetyProviderID = "trustyai_fms"

	// SafetyProviderType is the provider type for TrustyAI FMS
	SafetyProviderType = "remote::trustyai_fms"
)

// Guardrails authentication and service configuration
const (
	// GuardrailAuthTokenEnvName is the name of the environment variable for the guardrails auth token
	// Used for authenticating with kube-rbac-proxy on the guardrails detector service
	// This token comes from the guardrails-service-account which has RBAC permissions to access the detector
	GuardrailAuthTokenEnvName = "GUARDRAIL_AUTH_TOKEN"

	// DefaultGuardrailsServiceAccountName is the default name for the guardrails service account
	DefaultGuardrailsServiceAccountName = "guardrails-service-account"

	// DefaultGuardrailsTokenSecretSuffix is the suffix for the guardrails token secret
	DefaultGuardrailsTokenSecretSuffix = "-token"

	// DefaultDetectorURL is the default URL for the custom guardrails service
	DefaultDetectorURL = "https://custom-guardrails-service:8480"
)

// FormatEnvVar formats an environment variable name as LlamaStack template syntax
// Example: FormatEnvVar("GUARDRAIL_AUTH_TOKEN") returns "${env.GUARDRAIL_AUTH_TOKEN}"
func FormatEnvVar(envName string) string {
	return fmt.Sprintf("${env.%s}", envName)
}

// Moderation constants
const (
	// ModerationChunkSize is the number of words to buffer before running moderation (fallback threshold)
	// Primary trigger is sentence boundary detection; this is the fallback for code blocks, lists, etc.
	ModerationChunkSize = 30

	// GuardrailViolationMessage is the message shown when content is blocked by guardrails
	GuardrailViolationMessage = "I apologize, but I cannot provide a response to this request as it may contain content that violates our safety guidelines."

	// AsyncModerationResultBufferSize is the buffer size for the async moderation result channel
	// This allows multiple moderation requests to complete without blocking
	AsyncModerationResultBufferSize = 10
)
