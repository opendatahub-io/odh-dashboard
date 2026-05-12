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
