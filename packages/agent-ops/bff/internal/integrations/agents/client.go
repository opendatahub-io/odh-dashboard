package agents

import "context"

// Client loads agent runtime and discovery data (mock today; Kubernetes in a future change).
type Client interface {
	ListNamespaces(ctx context.Context, enabledOnly bool) ([]string, error)
	ListAgents(ctx context.Context, namespace string) (*AgentList, error)
	GetAgent(ctx context.Context, namespace, name string) (*AgentDetail, error)
	GetAgentCard(ctx context.Context, namespace, name string) (*AgentCard, error)
}

// ClientFactory creates a Client for the current request (e.g. with caller identity from context).
type ClientFactory interface {
	GetClient(ctx context.Context) (Client, error)
}
