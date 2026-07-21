package models

import "time"

// AgentRuntime describes a deployed agent or tool runtime.
type AgentRuntime struct {
	Name         string                  `json:"name"`
	Namespace    string                  `json:"namespace"`
	DisplayName  string                  `json:"displayName"`
	Description  string                  `json:"description"`
	Framework    string                  `json:"framework,omitempty"`
	Status        string                  `json:"status"`
	StatusMessage string                  `json:"statusMessage,omitempty"`
	Type          string                  `json:"type"`
	ServiceFQDN  string                  `json:"serviceFqdn,omitempty"`
	PodIP        string                  `json:"podIp,omitempty"`
	Ports        []AgentServiceEndpoint  `json:"ports"`
	EndpointURL  string                  `json:"endpointUrl,omitempty"`
	WorkloadType string                  `json:"workloadType,omitempty"`
	LastSyncTime time.Time               `json:"lastSyncTime"`
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
