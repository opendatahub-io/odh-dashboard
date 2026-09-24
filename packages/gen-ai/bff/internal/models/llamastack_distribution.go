package models

import (
	"encoding/json"
	"fmt"
)

// OGXServerModel is the BFF model for OGXServer CR status exposed to the UI (JSON shape unchanged).
type OGXServerModel struct {
	Name               string                 `json:"name"`
	Phase              string                 `json:"phase"`
	Version            string                 `json:"version"`
	DistributionConfig map[string]interface{} `json:"distributionConfig"`
	TracingEnabled     bool                   `json:"tracingEnabled"`
}

// OGXServerResponse represents the response envelope for OGX server status.
type OGXServerResponse struct {
	Data  *OGXServerModel `json:"data,omitempty"`
	Error *ErrorResponse  `json:"error,omitempty"`
}

// OGXServerInstallRequest represents the request body for installing models.
type OGXServerInstallRequest struct {
	Models        []InstallModel       `json:"models"`
	EnableTracing bool                 `json:"enable_tracing,omitempty"` // When true, wraps OGX with opentelemetry-instrument for distributed tracing
	VectorStores  []InstallVectorStore `json:"vector_stores,omitempty"`  // Optional vector stores to configure; embedding models must be included in Models
}

// InstallVectorStore identifies a vector store to include in the OGX server install.
// The store must exist in the gen-ai-aa-vector-stores ConfigMap.
type InstallVectorStore struct {
	VectorStoreID string `json:"vector_store_id"`
}

// installModelJSON is used for JSON unmarshaling to handle embedding_dimension as either int or float64.
type installModelJSON struct {
	ModelName          string      `json:"model_name"`
	ModelSourceType    string      `json:"model_source_type"`             // Source type as string for unmarshaling (required)
	ModelType          string      `json:"model_type,omitempty"`          // Optional: "llm" or "embedding"
	EmbeddingDimension interface{} `json:"embedding_dimension,omitempty"` // Can be int, float64, or nil
	IsClusterLocal     bool        `json:"is_cluster_local,omitempty"`    // True for in-cluster *.svc.cluster.local endpoints
}

// UnmarshalJSON implements custom JSON unmarshaling for InstallModel to handle
// embedding_dimension as either int or float64.
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
	EmbeddingDimension *int                `json:"embedding_dimension,omitempty"` // Optional embedding vector size (128-3072000)
	IsClusterLocal     bool                `json:"is_cluster_local,omitempty"`    // True for in-cluster *.svc.cluster.local endpoints
}

type OGXServerInstallModel struct {
	Name       string `json:"name"`
	HTTPStatus string `json:"httpStatus"`
}

type OGXServerInstallResponse struct {
	Data  *OGXServerInstallModel `json:"data,omitempty"`
	Error *ErrorResponse         `json:"error,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type OGXServerDeleteRequest struct {
	Name                string `json:"name"`
	PreserveVectorStore *bool  `json:"preserve_vector_store,omitempty"`
}

type OGXServerDeleteResponse struct {
	Data string `json:"data"`
}

// BFFConfigModel represents BFF application-level configuration
type BFFConfigModel struct {
	IsCustomLSD        bool `json:"isCustomLSD"`
	SandboxesAvailable bool `json:"sandboxesAvailable"`
}
