package mock

import (
	"context"
	"sync"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
)

// Client is an in-memory agents.Client for unit tests and local development.
type Client struct {
	mu sync.RWMutex

	Namespaces []string
	Agents     map[string][]agents.AgentSummary
	Details    map[string]agents.AgentDetail
	Cards      map[string]agents.AgentCard

	ListNamespacesErr error
	ListAgentsErr     error
	GetAgentErr       error
	GetAgentCardErr   error
}

// NewClient returns a mock client with no data.
func NewClient() *Client {
	return &Client{
		Agents:  map[string][]agents.AgentSummary{},
		Details: map[string]agents.AgentDetail{},
		Cards:   map[string]agents.AgentCard{},
	}
}

func detailKey(namespace, name string) string {
	return namespace + "/" + name
}

// ListNamespaces implements agents.Client.
func (c *Client) ListNamespaces(ctx context.Context, enabledOnly bool) ([]string, error) {
	_ = ctx
	_ = enabledOnly
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.ListNamespacesErr != nil {
		return nil, c.ListNamespacesErr
	}
	return append([]string(nil), c.Namespaces...), nil
}

// ListAgents implements agents.Client.
func (c *Client) ListAgents(ctx context.Context, namespace string) (*agents.AgentList, error) {
	_ = ctx
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.ListAgentsErr != nil {
		return nil, c.ListAgentsErr
	}
	items := append([]agents.AgentSummary(nil), c.Agents[namespace]...)
	return &agents.AgentList{Items: items}, nil
}

// GetAgent implements agents.Client.
func (c *Client) GetAgent(ctx context.Context, namespace, name string) (*agents.AgentDetail, error) {
	_ = ctx
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.GetAgentErr != nil {
		return nil, c.GetAgentErr
	}
	detail, ok := c.Details[detailKey(namespace, name)]
	if !ok {
		return nil, agents.ErrNotFound
	}
	copy := detail
	return &copy, nil
}

// GetAgentCard implements agents.Client.
func (c *Client) GetAgentCard(ctx context.Context, namespace, name string) (*agents.AgentCard, error) {
	_ = ctx
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.GetAgentCardErr != nil {
		return nil, c.GetAgentCardErr
	}
	card, ok := c.Cards[detailKey(namespace, name)]
	if !ok {
		return nil, agents.ErrNotFound
	}
	copy := card
	return &copy, nil
}

// Factory returns a ClientFactory that always yields this mock client.
type Factory struct {
	Client *Client
}

// GetClient implements agents.ClientFactory.
func (f *Factory) GetClient(ctx context.Context) (agents.Client, error) {
	_ = ctx
	return f.Client, nil
}
