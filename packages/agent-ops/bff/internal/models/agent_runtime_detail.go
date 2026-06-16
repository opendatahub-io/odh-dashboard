package models

import "time"

// AgentServiceEndpoint describes a network endpoint exposed by the agent runtime.
type AgentServiceEndpoint struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Port int    `json:"port"`
}

// AgentRuntimeCondition mirrors a Kubernetes-style condition for the agent runtime.
type AgentRuntimeCondition struct {
	Type               string    `json:"type"`
	Status             string    `json:"status"`
	Reason             string    `json:"reason,omitempty"`
	Message            string    `json:"message,omitempty"`
	LastTransitionTime time.Time `json:"lastTransitionTime"`
}

// AgentRuntimeDetail is the full runtime view for a single deployed agent.
type AgentRuntimeDetail struct {
	Name             string                  `json:"name"`
	Namespace        string                  `json:"namespace"`
	Description      string                  `json:"description"`
	Runtime          AgentRuntime            `json:"runtime"`
	WorkloadStatus   string                  `json:"workloadStatus"`
	ServiceEndpoints []AgentServiceEndpoint  `json:"serviceEndpoints"`
	PodCount         int                     `json:"podCount"`
	Conditions       []AgentRuntimeCondition `json:"conditions"`
	AgentCard        *AgentCardDetail        `json:"agentCard"`
}
