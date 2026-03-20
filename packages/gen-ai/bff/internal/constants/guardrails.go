package constants

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

// Moderation constants
const (
	MinModerationWordCount = 10

	// ModerationChunkSize is the number of words to buffer before running moderation (fallback threshold)
	// Primary trigger is sentence boundary detection; this is the fallback for code blocks, lists, etc.
	ModerationChunkSize = 30

	// InputGuardrailViolationMessage is the message shown when user input is blocked by guardrails
	InputGuardrailViolationMessage = "I cannot process that request as it conflicts with my active safety guidelines. Please review your input for prompt manipulation, harmful content, or sensitive data (PII)."

	// OutputGuardrailViolationMessage is the message shown when model output is blocked by guardrails
	OutputGuardrailViolationMessage = "The response to your request was intercepted by safety guardrails. The output was found to contain potential harmful content or sensitive data (PII)."

	// AsyncModerationResultBufferSize is the buffer size for the async moderation result channel
	// This allows multiple moderation requests to complete without blocking
	AsyncModerationResultBufferSize = 10
)
