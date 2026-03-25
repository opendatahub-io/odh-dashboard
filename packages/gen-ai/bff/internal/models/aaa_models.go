package models

// ModelSourceTypeEnum represents the source type of a model
type ModelSourceTypeEnum string

const (
	// ModelSourceTypeNamespace indicates a model deployed in the user's namespace (InferenceService/LLMInferenceService)
	ModelSourceTypeNamespace ModelSourceTypeEnum = "namespace"
	// ModelSourceTypeCustomEndpoint indicates an external model endpoint (user-provided URL)
	ModelSourceTypeCustomEndpoint ModelSourceTypeEnum = "custom_endpoint"
	// ModelSourceTypeMaaS indicates a MaaS (Model as a Service) model
	ModelSourceTypeMaaS ModelSourceTypeEnum = "maas"
)

// IsExternalModelSource returns true if the model source type indicates an external model (custom_endpoint)
func IsExternalModelSource(sourceType ModelSourceTypeEnum) bool {
	return sourceType == ModelSourceTypeCustomEndpoint
}

// Model status constants
const (
	// ModelStatusRunning indicates the model is running and ready to serve requests
	ModelStatusRunning = "Running"
	// ModelStatusStop indicates the model is stopped or inactive
	ModelStatusStop = "Stop"
	// ModelStatusUnknown indicates the model status could not be determined
	ModelStatusUnknown = "Unknown"
)

type AAModel struct {
	ModelName       string              `json:"model_name"`
	ModelID         string              `json:"model_id"`
	ServingRuntime  string              `json:"serving_runtime"`
	APIProtocol     string              `json:"api_protocol"`
	Version         string              `json:"version"`
	Usecase         string              `json:"usecase"`
	Description     string              `json:"description"`
	Endpoints       []string            `json:"endpoints"`
	Status          string              `json:"status"`
	DisplayName     string              `json:"display_name"`
	SAToken         SAToken             `json:"sa_token"`
	ModelSourceType ModelSourceTypeEnum `json:"model_source_type"`
	ModelType       ModelTypeEnum       `json:"model_type,omitempty"`
}

type SAToken struct {
	Name      string `json:"name"`
	TokenName string `json:"token_name"`
	Token     string `json:"token"`
}
