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

// GuardrailsOptions carries the inline guardrail configuration for a single request.
// The full policy (model endpoint, rails, prompts) is supplied per-request so no
// pre-existing ConfigMap is required on the cluster.
type GuardrailsOptions struct {
	Config *InlineGuardrailConfig `json:"config,omitempty"`
}

// InlineGuardrailConfig carries a complete guardrail configuration inline in the request.
// This is a TrustyAI extension that allows specifying model, rails, and prompts per-call
// without requiring a pre-created ConfigMap on the cluster.
type InlineGuardrailConfig struct {
	Models  []InlineGuardrailModel  `json:"models"`
	Rails   InlineGuardrailRails    `json:"rails"`
	Prompts []InlineGuardrailPrompt `json:"prompts,omitempty"`
}

// InlineGuardrailModel specifies the guardrail LLM used to perform the check.
type InlineGuardrailModel struct {
	Type       string                 `json:"type"`                 // always "main"
	Engine     string                 `json:"engine,omitempty"`     // "openai" for OpenAI-compatible endpoints
	Parameters map[string]interface{} `json:"parameters,omitempty"` // openai_api_base, model_name, api_key
}

// InlineGuardrailRails specifies which rails to activate.
type InlineGuardrailRails struct {
	Input  *InlineGuardrailRailFlows `json:"input,omitempty"`
	Output *InlineGuardrailRailFlows `json:"output,omitempty"`
}

// InlineGuardrailRailFlows lists the flow names for a rail.
type InlineGuardrailRailFlows struct {
	Flows []string `json:"flows"`
}

// InlineGuardrailPrompt defines the prompt template for a specific guardrail task.
// Content must contain the appropriate template variable:
//   - self_check_input:  must include {{ user_input }}
//   - self_check_output: must include {{ bot_response }}
type InlineGuardrailPrompt struct {
	Task    string `json:"task"`    // "self_check_input" or "self_check_output"
	Content string `json:"content"` // prompt template
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

	// RoleUser triggers input rails (user message moderation).
	RoleUser = "user"
	// RoleAssistant triggers output rails (model response moderation).
	RoleAssistant = "assistant"

	// FlowSelfCheckInput is the NeMo flow name for input moderation.
	FlowSelfCheckInput = "self check input"
	// FlowSelfCheckOutput is the NeMo flow name for output moderation.
	FlowSelfCheckOutput = "self check output"

	// TaskSelfCheckInput is the prompt task name for input moderation.
	TaskSelfCheckInput = "self_check_input"
	// TaskSelfCheckOutput is the prompt task name for output moderation.
	TaskSelfCheckOutput = "self_check_output"
)
