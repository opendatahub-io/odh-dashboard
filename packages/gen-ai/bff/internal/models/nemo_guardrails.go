package models

// NemoGuardrailsInitRequest is the request body for the POST /nemo-guardrails/init endpoint.
// It reuses the same InstallModel type as the LSD install endpoint so the UI can pass
// the same model list to both.
type NemoGuardrailsInitRequest struct {
	Models []InstallModel `json:"models"`
}

// NemoGuardrailsInitModel is the response payload returned after successfully creating
// NemoGuardrails resources.
type NemoGuardrailsInitModel struct {
	Name string `json:"name"` // name of the created NemoGuardrails CR
}
