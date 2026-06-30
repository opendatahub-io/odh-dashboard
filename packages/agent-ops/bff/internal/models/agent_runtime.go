package models

import "time"

// AgentRuntime describes a deployed agent or tool runtime.
type AgentRuntime struct {
	Name         string    `json:"name"`
	Namespace    string    `json:"namespace"`
	Status       string    `json:"status"`
	Type         string    `json:"type"`
	EndpointURL  string    `json:"endpointUrl"`
	LastSyncTime time.Time `json:"lastSyncTime"`
}

// AgentRuntimesResponse is the list payload for deployed agent runtimes.
type AgentRuntimesResponse struct {
	Runtimes      []AgentRuntime `json:"runtimes"`
	ContinueToken *string        `json:"continueToken,omitempty"`
}

// ListAgentRuntimesOptions controls pagination and filtering for runtime list queries.
type ListAgentRuntimesOptions struct {
	Namespace     string
	Limit         int
	ContinueToken string
}
