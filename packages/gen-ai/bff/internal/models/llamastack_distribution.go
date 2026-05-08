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
	Models       []InstallModel       `json:"models"`
	VectorStores []InstallVectorStore `json:"vector_stores,omitempty"` // Optional vector stores to configure; embedding models must be included in Models
}

// InstallVectorStore identifies a vector store to include in the LSD install.
// The store must exist in the gen-ai-aa-vector-stores ConfigMap.
type InstallVectorStore struct {
	VectorStoreID string `json:"vector_store_id"`
}

// installModelJSON is used for JSON unmarshaling to handle max_tokens and embedding_dimension as either int or float64
type installModelJSON struct {
	ModelName          string      `json:"model_name"`
	ModelSourceType    string      `json:"model_source_type"`             // Source type as string for unmarshaling (required)
	ModelType          string      `json:"model_type,omitempty"`          // Optional: "llm" or "embedding"
	MaxTokens          interface{} `json:"max_tokens,omitempty"`          // Can be int, float64, or nil
	EmbeddingDimension interface{} `json:"embedding_dimension,omitempty"` // Can be int, float64, or nil
	IsClusterLocal     bool        `json:"is_cluster_local,omitempty"`    // True for in-cluster *.svc.cluster.local endpoints
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
	im.IsClusterLocal = raw.IsClusterLocal
	im.ModelType = raw.ModelType

	// Validate and set ModelSourceType (now required)
	switch raw.ModelSourceType {
	case string(ModelSourceTypeNamespace):
		im.ModelSourceType = ModelSourceTypeNamespace
	case string(ModelSourceTypeCustomEndpoint):
		im.ModelSourceType = ModelSourceTypeCustomEndpoint
	case string(ModelSourceTypeMaaS):
		im.ModelSourceType = ModelSourceTypeMaaS
	case "":
		return fmt.Errorf("model_source_type is required")
	default:
		return fmt.Errorf("invalid model_source_type: %q, must be one of: namespace, custom_endpoint, maas", raw.ModelSourceType)
	}

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

	// Handle embedding_dimension conversion from interface{} to *int
	if raw.EmbeddingDimension != nil {
		var embeddingDimension int
		switch v := raw.EmbeddingDimension.(type) {
		case float64:
			if v != float64(int(v)) {
				return fmt.Errorf("embedding_dimension must be an integer, got %f", v)
			}
			embeddingDimension = int(v)
		case int:
			embeddingDimension = v
		case int64:
			embeddingDimension = int(v)
		case float32:
			if v != float32(int(v)) {
				return fmt.Errorf("embedding_dimension must be an integer, got %f", v)
			}
			embeddingDimension = int(v)
		default:
			return fmt.Errorf("embedding_dimension must be a number, got %T", v)
		}
		im.EmbeddingDimension = &embeddingDimension
	} else {
		im.EmbeddingDimension = nil
	}

	return nil
}

type InstallModel struct {
	ModelName          string              `json:"model_name"`
	ModelSourceType    ModelSourceTypeEnum `json:"model_source_type"`             // Source type of the model (required: namespace, custom_endpoint, maas)
	ModelType          string              `json:"model_type,omitempty"`          // Optional: "llm" or "embedding"
	MaxTokens          *int                `json:"max_tokens,omitempty"`          // Optional per-model token limit (128-128000)
	EmbeddingDimension *int                `json:"embedding_dimension,omitempty"` // Optional embedding vector size (128-3072000)
	IsClusterLocal     bool                `json:"is_cluster_local,omitempty"`    // True for in-cluster *.svc.cluster.local endpoints
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
