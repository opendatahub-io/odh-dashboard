package models

// LlamaStackDistributionModel represents a Llama Stack Distribution
type LlamaStackDistributionModel struct {
	Name               string                 `json:"name"`
	Phase              string                 `json:"phase"`
	Version            string                 `json:"version"`
	DistributionConfig map[string]interface{} `json:"distributionConfig"`
}

// LlamaStackDistributionResponse represents the response envelope for LSD status
type LlamaStackDistributionResponse struct {
	Data  *LlamaStackDistributionModel `json:"data,omitempty"`
	Error *ErrorResponse               `json:"error,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}
