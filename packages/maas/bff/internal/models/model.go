package models

type MaaSModelDetails struct {
	DisplayName   string `json:"displayName,omitempty"`
	Description   string `json:"description,omitempty"`
	GenaiUseCase  string `json:"genaiUseCase,omitempty"`
	ContextWindow string `json:"contextWindow,omitempty"`
}

type MaaSModelSubscriptionInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
}

// MaaSModel represents a Model as a Service model.
type MaaSModel struct {
	ID            string                      `json:"id"`
	Object        string                      `json:"object"`
	Created       int64                       `json:"created"`
	OwnedBy       string                      `json:"owned_by"`
	Ready         bool                        `json:"ready"`
	URL           string                      `json:"url,omitempty"`
	ModelDetails  *MaaSModelDetails           `json:"modelDetails,omitempty"`
	Kind          string                      `json:"kind,omitempty"`
	Subscriptions []MaaSModelSubscriptionInfo `json:"subscriptions,omitempty"`
}

// MaaSModelsResponse is the OpenAI-compatible response shape for models listing.
type MaaSModelsResponse struct {
	Object string      `json:"object"`
	Data   []MaaSModel `json:"data"`
}
