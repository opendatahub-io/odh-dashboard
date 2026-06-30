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
	Metadata           AgentMetadata
	Spec               map[string]any
	Status             map[string]any
	WorkloadType       string
	ReadyStatus        string
	Service            *AgentService
	AgentCard          *AgentCardObserved
	ServiceAccountName string
}

// AgentCardSkillParameterObserved is a skill parameter from AgentRuntime status.card.
type AgentCardSkillParameterObserved struct {
	Name        string
	Type        string
	Description string
	Required    bool
	Default     string
}

// AgentCardSkillObserved is a skill from AgentRuntime status.card.
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

// AgentCardExtensionObserved is an A2A extension from AgentRuntime status.card.
type AgentCardExtensionObserved struct {
	URI         string
	Description string
}

// AgentCardObserved is card data from AgentRuntime.status.card and related status fields.
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
