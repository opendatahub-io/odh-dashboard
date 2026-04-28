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

// GuardrailInput represents the input configuration for creating guardrail shields
type GuardrailInput struct {
	ModelName      string
	ProviderID     string
	TokenEnvVar    string
	ModelURL       string
	DetectorURL    string
	InputPolicies  []string
	OutputPolicies []string
}

// DefaultInputGuardrailPolicies returns the default policies for input guardrails
func DefaultInputGuardrailPolicies() []string {
	return []string{"jailbreak", "content-moderation", "pii"}
}

// DefaultOutputGuardrailPolicies returns the default policies for output guardrails
func DefaultOutputGuardrailPolicies() []string {
	return []string{"content-moderation", "pii"}
}
