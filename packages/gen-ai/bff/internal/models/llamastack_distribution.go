package models

import (
	"encoding/json"
	"fmt"
)

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
	Models            []InstallModel `json:"models"`
	GuardrailsEnabled bool           `json:"enable_guardrails,omitempty"`
}

// installModelJSON is used for JSON unmarshaling to handle max_tokens as either int or float64
type installModelJSON struct {
	ModelName   string      `json:"model_name"`
	IsMaaSModel bool        `json:"is_maas_model"`
	MaxTokens   interface{} `json:"max_tokens,omitempty"` // Can be int, float64, or nil
}

// UnmarshalJSON implements custom JSON unmarshaling for InstallModel to handle max_tokens
// as either int or float64. This is necessary because JSON numbers are unmarshaled as float64
// by default, but we need to validate that the value is a whole number and convert it to int.
//
// The method validates that max_tokens is a numeric type and converts it to an integer pointer,
// ensuring no fractional values are accepted. Returns an error if max_tokens contains a
// non-numeric type or a fractional value.
func (im *InstallModel) UnmarshalJSON(data []byte) error {
	var raw installModelJSON
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}

	im.ModelName = raw.ModelName
	im.IsMaaSModel = raw.IsMaaSModel

	// Handle max_tokens conversion from interface{} to *int
	if raw.MaxTokens != nil {
		var maxTokens int
		switch v := raw.MaxTokens.(type) {
		case float64:
			// JSON numbers unmarshal as float64, convert to int
			if v != float64(int(v)) {
				return fmt.Errorf("max_tokens must be an integer, got %f", v)
			}
			maxTokens = int(v)
		case int:
			maxTokens = v
		case int64:
			maxTokens = int(v)
		case float32:
			if v != float32(int(v)) {
				return fmt.Errorf("max_tokens must be an integer, got %f", v)
			}
			maxTokens = int(v)
		default:
			return fmt.Errorf("max_tokens must be a number, got %T", v)
		}
		im.MaxTokens = &maxTokens
	} else {
		im.MaxTokens = nil
	}

	return nil
}

type InstallModel struct {
	ModelName   string `json:"model_name"`
	IsMaaSModel bool   `json:"is_maas_model"`
	MaxTokens   *int   `json:"max_tokens,omitempty"` // Optional per-model token limit (128-128000)
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
