package models

// GuardrailsStatus represents the status of the GuardrailsOrchestrator CR
type GuardrailsStatus struct {
	Phase      string                `json:"phase"`
	Conditions []GuardrailsCondition `json:"conditions,omitempty"`
}

// GuardrailsCondition represents a condition in the GuardrailsOrchestrator status
type GuardrailsCondition struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime string `json:"lastTransitionTime,omitempty"`
}

// SafetyConfigResponse represents the safety configuration from LlamaStack ConfigMap
// Used by frontend to display guardrail models and shields in the playground
type SafetyConfigResponse struct {
	GuardrailModels []GuardrailModelConfig `json:"guardrail_models"`
}

// GuardrailModelConfig represents a configured guardrail model with its shields
type GuardrailModelConfig struct {
	ModelName      string `json:"model_name"`       // Model name (e.g., "llama-guard-3")
	InputShieldID  string `json:"input_shield_id"`  // e.g., "trustyai_input"
	OutputShieldID string `json:"output_shield_id"` // e.g., "trustyai_output"
}

// DefaultGuardrailPolicies returns the default policies used for guardrails
func DefaultGuardrailPolicies() []string {
	return []string{"jailbreak", "content-moderation", "pii"}
}
