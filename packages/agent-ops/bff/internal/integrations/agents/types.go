package agents

// DTOs produced by agent data sources. Mappers translate these into BFF models for the frontend.

// AgentList is a list of agent summaries.
type AgentList struct {
	Items []AgentSummary
}

// AgentSummary is a single agent in a list response.
type AgentSummary struct {
	Name         string
	Namespace    string
	Description  string
	Status       string
	ResourceType string
	WorkloadType string
	EndpointURL  string
	CreatedAt    string
	LastSyncAt   string
}

// AgentDetail is the full workload view for one agent.
type AgentDetail struct {
	Metadata     AgentMetadata
	Spec         map[string]any
	Status       map[string]any
	WorkloadType string
	ReadyStatus  string
	Service      *AgentService
}

// AgentMetadata is workload metadata for an agent resource.
type AgentMetadata struct {
	Name              string
	Namespace         string
	Labels            map[string]string
	Annotations       map[string]string
	CreationTimestamp string
	UID               string
}

// AgentService is Kubernetes Service information attached to an agent workload.
type AgentService struct {
	Name      string
	Type      string
	ClusterIP string
	Ports     []AgentServicePort
}

// AgentServicePort is a port exposed by the agent Service.
type AgentServicePort struct {
	Name       string
	Port       int
	TargetPort any
	Protocol   string
}
