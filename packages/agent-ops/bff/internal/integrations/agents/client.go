package agents

import "context"

// Client loads agent runtime data from Sandbox CRs or mocks.
type Client interface {
	// ListNamespaces returns namespaces where the caller can list agents.
	// enabledOnly is reserved for future filtering and is currently ignored.
	ListNamespaces(ctx context.Context, enabledOnly bool) ([]string, error)
	ListAgents(ctx context.Context, namespace string) (*AgentList, error)
	GetAgent(ctx context.Context, namespace, name string) (*AgentDetail, error)

	DeployAgent(ctx context.Context, params *DeployAgentParams) (*DeployAgentResult, error)
	DeleteAgent(ctx context.Context, namespace, name string) error
	StopAgent(ctx context.Context, namespace, name string) error
	StartAgent(ctx context.Context, namespace, name string) error
}

// ClientFactory creates a Client for the current request (e.g. with caller identity from context).
type ClientFactory interface {
	GetClient(ctx context.Context) (Client, error)
}
