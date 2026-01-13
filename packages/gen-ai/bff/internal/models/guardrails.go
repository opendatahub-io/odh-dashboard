package models

import (
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
)

// GuardrailsStatus represents the status of the GuardrailsOrchestrator CR
type GuardrailsStatus struct {
	Phase      string                    `json:"phase"`
	Conditions []gorchv1alpha1.Condition `json:"conditions,omitempty"`
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
