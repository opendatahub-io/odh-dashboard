package models

// MaaSModel represents a Model as a Service model.
type MaaSModel struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	OwnedBy string `json:"owned_by"`
	Ready   bool   `json:"ready"`
	URL     string `json:"url"`
}

// MaaSModelsResponse is the OpenAI-compatible response shape for models listing.
type MaaSModelsResponse struct {
	Object string     `json:"object"`
	Data   []MaaSModel `json:"data"`
}

