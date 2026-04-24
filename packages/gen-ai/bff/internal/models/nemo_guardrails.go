package models

// NemoGuardrailsInitModel is the response payload returned after successfully creating
// NemoGuardrails resources.
type NemoGuardrailsInitModel struct {
	Name string `json:"name"` // name of the created NemoGuardrails CR
}
