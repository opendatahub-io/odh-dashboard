package models

// MaaSNativeModel is the upstream OpenAI-compatible MaaS model shape.
// Optional metadata is retained only for translation into the AutoRAG contract.
type MaaSNativeModel struct {
	ID           string            `json:"id"`
	OwnedBy      string            `json:"owned_by,omitempty"`
	Ready        bool              `json:"ready"`
	ModelDetails *MaaSModelDetails `json:"modelDetails,omitempty"`
}

type MaaSModelDetails struct {
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
}

// MaaSModel is the stable AutoRAG response model.
type MaaSModel struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name,omitempty"`
	Description string `json:"description,omitempty"`
	OwnedBy     string `json:"owned_by,omitempty"`
	Ready       bool   `json:"ready"`
}

type MaaSModelsData struct {
	Models []MaaSModel `json:"models"`
}
