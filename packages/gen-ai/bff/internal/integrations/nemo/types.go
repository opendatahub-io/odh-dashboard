package nemo

// GuardrailCheckRequest is the request body for POST /v1/guardrail/checks
type GuardrailCheckRequest struct {
	Model      string            `json:"model"`
	Messages   []Message         `json:"messages"`
	Guardrails GuardrailsOptions `json:"guardrails"`
}

// Message represents a chat message in the guardrail check request
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// GuardrailsOptions specifies which guardrail config to use
type GuardrailsOptions struct {
	ConfigID string `json:"config_id"`
}

// GuardrailCheckResponse is the response from POST /v1/guardrail/checks
type GuardrailCheckResponse struct {
	Status         string                    `json:"status"`
	RailsStatus    map[string]RailStatus     `json:"rails_status,omitempty"`
	Messages       []ResponseMessage         `json:"messages,omitempty"`
	GuardrailsData *GuardrailCheckResultData `json:"guardrails_data,omitempty"`
}

// RailStatus represents the status of an individual rail check
type RailStatus struct {
	Status string `json:"status"`
}

// ResponseMessage represents a message in the guardrail check response
type ResponseMessage struct {
	Index int                   `json:"index"`
	Role  string                `json:"role"`
	Rails map[string]RailStatus `json:"rails,omitempty"`
}

// GuardrailCheckResultData contains logging and error details from the check
type GuardrailCheckResultData struct {
	Error   string `json:"error,omitempty"`
	Details string `json:"details,omitempty"`
	Log     *struct {
		ActivatedRails []string `json:"activated_rails,omitempty"`
	} `json:"log,omitempty"`
}

const (
	StatusSuccess = "success"
	StatusBlocked = "blocked"
	StatusError   = "error"

	GuardrailChecksPath = "/v1/guardrail/checks"
	DefaultModel        = "self-check"
)
