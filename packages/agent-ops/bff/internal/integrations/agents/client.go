package agents

import "context"

// Client loads agent runtime data from Kubernetes workloads or mocks.
type Client interface {
	ListNamespaces(ctx context.Context, enabledOnly bool) ([]string, error)
	CanListAgentsInNamespace(ctx context.Context, namespace string) (bool, error)
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
