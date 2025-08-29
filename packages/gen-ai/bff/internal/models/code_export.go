package models

// Tool represents a tool configuration
type Tool struct {
	Type           string   `json:"type"`
	VectorStoreIDs []string `json:"vector_store_ids"`
}

type CodeExportRequest struct {
	Input        string  `json:"input"`
	Model        string  `json:"model"`
	Instructions string  `json:"instructions"`
	Stream       bool    `json:"stream"`
	Temperature  float64 `json:"temperature"`
	Tools        []Tool  `json:"tools"`
}

type CodeExportResponse struct {
	Code string `json:"code"`
}
