package models

// ConnectionTestRequest is the request body for POST /api/v1/connections/test.
type ConnectionTestRequest struct {
	ConnectionType string            `json:"connectionType"`
	FieldValues    map[string]string `json:"fieldValues"`
}

// ConnectionTestResult is the probe result returned in the data envelope.
type ConnectionTestResult struct {
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	Message string `json:"message"`
}
