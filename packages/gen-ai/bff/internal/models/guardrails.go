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
