package models

import "strings"

// DeriveModelTypeFromUsecase determines model type from the usecase string.
// Returns ModelTypeEmbedding if usecase contains "embedding" (case-insensitive), otherwise ModelTypeLLM.
func DeriveModelTypeFromUsecase(usecase string) ModelTypeEnum {
	if strings.Contains(strings.ToLower(usecase), "embedding") {
		return ModelTypeEmbedding
	}
	return ModelTypeLLM
}

// ModelSourceTypeEnum represents the source type of a model
type ModelSourceTypeEnum string

const (
	// ModelSourceTypeNamespace indicates a model deployed in the user's namespace (InferenceService/LLMInferenceService)
	ModelSourceTypeNamespace ModelSourceTypeEnum = "namespace"
	// ModelSourceTypeExternalCluster indicates an external model pointing inside the cluster (cross-namespace)
	ModelSourceTypeExternalCluster ModelSourceTypeEnum = "external_cluster"
	// ModelSourceTypeExternalProvider indicates an external model pointing to a provider (outside cluster)
	ModelSourceTypeExternalProvider ModelSourceTypeEnum = "external_provider"
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
	ModelType       ModelTypeEnum       `json:"model_type"`
}

type SAToken struct {
	Name      string `json:"name"`
	TokenName string `json:"token_name"`
	Token     string `json:"token"`
}
