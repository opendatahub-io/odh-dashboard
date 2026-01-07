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
	Enabled         bool                   `json:"enabled"`
	GuardrailModels []GuardrailModelConfig `json:"guardrail_models"`
}

// GuardrailModelConfig represents a configured guardrail model with its shields
type GuardrailModelConfig struct {
	ModelName      string   `json:"model_name"`       // Original model name (e.g., "llama-guard-3")
	DisplayName    string   `json:"display_name"`     // UI-friendly name
	InputShieldID  string   `json:"input_shield_id"`  // e.g., "trustyai_input_llama_guard_3"
	OutputShieldID string   `json:"output_shield_id"` // e.g., "trustyai_output_llama_guard_3"
	InputPolicies  []string `json:"input_policies"`   // e.g., ["jailbreak", "content-moderation", "pii"]
	OutputPolicies []string `json:"output_policies"`  // e.g., ["jailbreak", "content-moderation", "pii"]
}
