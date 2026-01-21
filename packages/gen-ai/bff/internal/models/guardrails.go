package models

import (
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
)

// GuardrailsStatus represents the status of the GuardrailsOrchestrator CR
type GuardrailsStatus struct {
	Name       string                    `json:"name"`
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

// GuardrailInput represents the input configuration for creating guardrail shields
// Used when configuring safety providers and shields in LlamaStack configuration
type GuardrailInput struct {
	ModelName      string   // Name of the guardrail model (e.g., "llama-guard-3")
	ProviderID     string   // Provider identifier (e.g., "vllm-inference-1")
	TokenEnvVar    string   // Environment variable for model API token (e.g., "${env.VLLM_API_TOKEN_1:=fake}")
	ModelURL       string   // URL for the model endpoint
	DetectorURL    string   // URL for the detector service
	InputPolicies  []string // Policies for input shields (e.g., ["jailbreak", "content-moderation", "pii"])
	OutputPolicies []string // Policies for output shields (e.g., ["jailbreak", "content-moderation", "pii"])
}

// DefaultGuardrailPolicies returns the default policies used for guardrails
func DefaultGuardrailPolicies() []string {
	return []string{"jailbreak", "content-moderation", "pii"}
}
