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
	Runtimes []AgentRuntime `json:"runtimes"`
}
