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

// LlamaStackDistributionInstallRequest represents the request body for installing models
type LlamaStackDistributionInstallRequest struct {
	Models         []InstallModel  `json:"models"`
	GuardrailModel *GuardrailModel `json:"guardrail_model,omitempty"` // Optional guardrail model configuration
}

type InstallModel struct {
	ModelName   string `json:"model_name"`
	IsMaaSModel bool   `json:"is_maas_model"`
}

// GuardrailModel represents the guardrail model configuration for safety
type GuardrailModel struct {
	ModelName   string `json:"model_name"`             // e.g., "vllm/qwen3"
	IsMaaSModel bool   `json:"is_maas_model"`          // Whether this is a MaaS model
	ModelURL    string `json:"model_url,omitempty"`    // Optional: model endpoint URL
}

type LlamaStackDistributionInstallModel struct {
	Name       string `json:"name"`
	HTTPStatus string `json:"httpStatus"`
}

type LlamaStackDistributionInstallResponse struct {
	Data  *LlamaStackDistributionInstallModel `json:"data,omitempty"`
	Error *ErrorResponse                      `json:"error,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type LlamaStackDistributionDeleteRequest struct {
	Name string `json:"name"`
}

type LlamaStackDistributionDeleteResponse struct {
	Data string `json:"data"`
}

// BFFConfigModel represents BFF application-level configuration
type BFFConfigModel struct {
	IsCustomLSD bool `json:"isCustomLSD"`
}
