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

// ModelOverviewDetails combines catalog metadata with the K8s MaaSModelRef phase.
type ModelOverviewDetails struct {
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
	Phase       string `json:"phase,omitempty"`
}

// ModelOverviewSubscription is a subscription entry in the model overview, including groups.
type ModelOverviewSubscription struct {
	Name            string           `json:"name"`
	DisplayName     string           `json:"displayName,omitempty"`
	Phase           string           `json:"phase,omitempty"`
	Groups          []string         `json:"groups,omitempty"`
	TokenRateLimits []TokenRateLimit `json:"tokenRateLimits,omitempty"`
}

// ModelOverviewPolicy is an auth policy entry in the model overview, including groups.
type ModelOverviewPolicy struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"displayName,omitempty"`
	Phase       string   `json:"phase,omitempty"`
	Groups      []string `json:"groups,omitempty"`
}

// ModelOverviewItem represents a model with its associated subscriptions and auth policies.
type ModelOverviewItem struct {
	ID            string                      `json:"id"`
	ModelDetails  ModelOverviewDetails        `json:"modelDetails"`
	Subscriptions []ModelOverviewSubscription `json:"subscriptions"`
	AuthPolicies  []ModelOverviewPolicy       `json:"authPolicies"`
}
