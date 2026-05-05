package models

import "fmt"

// NemoGuardrailsInitModel is the response payload returned after successfully creating
// NemoGuardrails resources.
type NemoGuardrailsInitModel struct {
	Name string `json:"name"` // name of the created NemoGuardrails CR
}

// NemoGuardrailsStatus represents the observed status of the NemoGuardrails CR.
type NemoGuardrailsStatus struct {
	Name    string `json:"name"`
	Phase   string `json:"phase"`
	IsReady bool   `json:"isReady"`
}

// ErrNemoGuardrailsAlreadyInitialised is returned when NemoGuardrails resources already
// exist in the namespace. The caller should treat this as a 400 Bad Request.
type ErrNemoGuardrailsAlreadyInitialised struct {
	Namespace string
}

func (e *ErrNemoGuardrailsAlreadyInitialised) Error() string {
	return fmt.Sprintf("NemoGuardrails already initialised in namespace %s", e.Namespace)
}
