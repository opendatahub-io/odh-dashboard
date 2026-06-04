package mock

import (
	"context"
	"maps"
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
	copy := cloneAgentDetail(detail)
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
	copy := cloneAgentCard(card)
	return &copy, nil
}

// cloneAgentDetail returns a defensive copy of detail. Spec and Status use maps.Clone
// (shallow copy only); nested maps and slices inside those values remain shared.
func cloneAgentDetail(detail agents.AgentDetail) agents.AgentDetail {
	copy := agents.AgentDetail{
		Metadata:     cloneAgentMetadata(detail.Metadata),
		Spec:         maps.Clone(detail.Spec),
		Status:       maps.Clone(detail.Status),
		WorkloadType: detail.WorkloadType,
		ReadyStatus:  detail.ReadyStatus,
	}
	if detail.Service != nil {
		service := *detail.Service
		if len(detail.Service.Ports) > 0 {
			service.Ports = append([]agents.AgentServicePort(nil), detail.Service.Ports...)
		}
		copy.Service = &service
	}
	return copy
}

func cloneAgentMetadata(metadata agents.AgentMetadata) agents.AgentMetadata {
	copy := metadata
	if len(metadata.Labels) > 0 {
		copy.Labels = maps.Clone(metadata.Labels)
	}
	if len(metadata.Annotations) > 0 {
		copy.Annotations = maps.Clone(metadata.Annotations)
	}
	return copy
}

func cloneAgentCard(card agents.AgentCard) agents.AgentCard {
	copy := card
	if len(card.Skills) > 0 {
		copy.Skills = append([]agents.AgentSkill(nil), card.Skills...)
	}
	return copy
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
