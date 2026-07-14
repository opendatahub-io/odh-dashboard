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
	DisplayName  string
	Description  string
	Framework    string
	Status       string
	ResourceType string
	WorkloadType string
	ServiceFQDN  string
	Ports        []AgentServicePort
	EndpointURL  string
	CreatedAt    string
	LastSyncAt   string
}

// AgentDetail is the full workload view for one agent.
type AgentDetail struct {
	Metadata           AgentMetadata
	Spec               map[string]any
	Status             map[string]any
	DisplayName        string
	Framework          string
	ContainerImage     string
	ServiceFQDN        string
	WorkloadType       string
	ReadyStatus        string
	Service            *AgentService
	AgentCard          *AgentCardObserved
	ServiceAccountName string
}

// AgentCardSkillParameterObserved is a skill parameter from an observed agent card.
type AgentCardSkillParameterObserved struct {
	Name        string
	Type        string
	Description string
	Required    bool
	Default     string
}

// AgentCardSkillObserved is a skill from an observed agent card.
type AgentCardSkillObserved struct {
	ID          string
	Name        string
	Description string
	Tags        []string
	Examples    []string
	InputModes  []string
	OutputModes []string
	Parameters  []AgentCardSkillParameterObserved
}

// AgentCardExtensionObserved is an A2A extension from an observed agent card.
type AgentCardExtensionObserved struct {
	URI         string
	Description string
}

// AgentCardObserved is optional agent card metadata enriched from OpenShift Routes,
// MCP server registrations, and Sandbox labels. Rich A2A card fields (skills, capabilities,
// signatures) are populated only when present in cluster metadata; many fields may be empty.
type AgentCardObserved struct {
	Name                              string
	Description                       string
	Version                           string
	URL                               string
	DocumentationURL                  string
	IconURL                           string
	ProviderOrganization              string
	ProviderURL                       string
	Streaming                         bool
	PushNotifications                 bool
	Extensions                        []AgentCardExtensionObserved
	DefaultInputModes                 []string
	DefaultOutputModes                []string
	Skills                            []AgentCardSkillObserved
	Protocol                          string
	TransportSecurity                 string
	LastCardFetchTime                 string
	ValidSignature                    *bool
	AttestedAgentSpiffeID             string
	LinkedSkills                      []string
	SupportsAuthenticatedExtendedCard bool
	AuthBridgeMode                    string
	ExternalAgentCardURL              string
	ToolConnections                   []string
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
