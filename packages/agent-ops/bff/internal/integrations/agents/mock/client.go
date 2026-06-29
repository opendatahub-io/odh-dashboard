package mock

import (
	"context"
	"fmt"
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

	CanListAgentsInNSResult   bool
	CanListAgentsInNSErr      error
	ListNamespacesErr error
	ListAgentsErr     error
	GetAgentErr       error
	DeployAgentErr    error
}

// NewClient returns a mock client with no data. CanListAgentsInNamespace defaults to allowed.
func NewClient() *Client {
	return &Client{
		Agents:                  map[string][]agents.AgentSummary{},
		Details:                 map[string]agents.AgentDetail{},
		CanListAgentsInNSResult: true,
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

// CanListAgentsInNamespace implements agents.Client.
func (c *Client) CanListAgentsInNamespace(ctx context.Context, namespace string) (bool, error) {
	_ = ctx
	_ = namespace
	c.mu.RLock()
	defer c.mu.RUnlock()
	if c.CanListAgentsInNSErr != nil {
		return false, c.CanListAgentsInNSErr
	}
	return c.CanListAgentsInNSResult, nil
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

// DeployAgent implements agents.Client.
func (c *Client) DeployAgent(ctx context.Context, params *agents.DeployAgentParams) (*agents.DeployAgentResult, error) {
	_ = ctx
	c.mu.Lock()
	defer c.mu.Unlock()
	if params == nil {
		return nil, fmt.Errorf("deploy params must not be nil")
	}
	if c.DeployAgentErr != nil {
		return nil, c.DeployAgentErr
	}
	if c.Details == nil {
		c.Details = make(map[string]agents.AgentDetail)
	}
	key := detailKey(params.Namespace, params.Name)
	if _, ok := c.Details[key]; ok {
		return nil, agents.ErrAlreadyExists
	}
	c.Details[key] = agents.AgentDetail{
		Metadata: agents.AgentMetadata{
			Name:      params.Name,
			Namespace: params.Namespace,
			Labels: map[string]string{
				"kagenti.io/type": "agent",
			},
		},
		WorkloadType: "Deployment",
	}
	return &agents.DeployAgentResult{
		Name:      params.Name,
		Namespace: params.Namespace,
	}, nil
}

// DeleteAgent implements agents.Client.
func (c *Client) DeleteAgent(ctx context.Context, namespace, name string) error {
	_ = ctx
	return agents.ErrUnavailable
}

// StopAgent implements agents.Client.
func (c *Client) StopAgent(ctx context.Context, namespace, name string) error {
	_ = ctx
	return agents.ErrUnavailable
}

// StartAgent implements agents.Client.
func (c *Client) StartAgent(ctx context.Context, namespace, name string) error {
	_ = ctx
	return agents.ErrUnavailable
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
	if detail.AgentCard != nil {
		copy.AgentCard = cloneAgentCardObserved(detail.AgentCard)
	}
	copy.ServiceAccountName = detail.ServiceAccountName
	return copy
}

func cloneAgentCardObserved(card *agents.AgentCardObserved) *agents.AgentCardObserved {
	if card == nil {
		return nil
	}
	clone := *card
	clone.DefaultInputModes = append([]string(nil), card.DefaultInputModes...)
	clone.DefaultOutputModes = append([]string(nil), card.DefaultOutputModes...)
	clone.LinkedSkills = append([]string(nil), card.LinkedSkills...)
	clone.ToolConnections = append([]string(nil), card.ToolConnections...)
	if len(card.Extensions) > 0 {
		clone.Extensions = append([]agents.AgentCardExtensionObserved(nil), card.Extensions...)
	}
	if len(card.Skills) > 0 {
		clone.Skills = make([]agents.AgentCardSkillObserved, 0, len(card.Skills))
		for _, skill := range card.Skills {
			skillCopy := skill
			skillCopy.Tags = append([]string(nil), skill.Tags...)
			skillCopy.Examples = append([]string(nil), skill.Examples...)
			skillCopy.InputModes = append([]string(nil), skill.InputModes...)
			skillCopy.OutputModes = append([]string(nil), skill.OutputModes...)
			if len(skill.Parameters) > 0 {
				skillCopy.Parameters = append([]agents.AgentCardSkillParameterObserved(nil), skill.Parameters...)
			}
			clone.Skills = append(clone.Skills, skillCopy)
		}
	}
	return &clone
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

// Factory returns a ClientFactory that always yields this mock client.
type Factory struct {
	Client *Client
}

// GetClient implements agents.ClientFactory.
func (f *Factory) GetClient(ctx context.Context) (agents.Client, error) {
	_ = ctx
	return f.Client, nil
}
