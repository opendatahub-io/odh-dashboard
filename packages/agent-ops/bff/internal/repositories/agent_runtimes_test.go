package repositories

import (
	"context"
	"errors"
	"testing"

	bfferrors "github.com/opendatahub-io/mod-arch-library/bff/internal/errors"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAgentRuntimeDetailTranslatesForbidden(t *testing.T) {
	mockClient := agentsmock.NewClient()
	mockClient.GetAgentErr = agents.ErrForbidden

	repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: mockClient})
	_, err := repo.GetAgentRuntimeDetail(context.Background(), "agent-ops-demo", "sample-support-agent")
	require.Error(t, err)
	assert.True(t, errors.Is(err, bfferrors.ErrForbidden))
}

func TestGetAgentRuntimeDetailNilDetailReturnsNotFound(t *testing.T) {
	repo := NewAgentRuntimesRepository(stubAgentClientFactory{client: nilAgentDetailClient{}})
	_, err := repo.GetAgentRuntimeDetail(context.Background(), "agent-ops-demo", "sample-support-agent")
	require.Error(t, err)
	assert.True(t, errors.Is(err, bfferrors.ErrNotFound))
}

type stubAgentClientFactory struct {
	client agents.Client
}

func (f stubAgentClientFactory) GetClient(context.Context) (agents.Client, error) {
	return f.client, nil
}

type nilAgentDetailClient struct{}

func (nilAgentDetailClient) ListNamespaces(context.Context, bool) ([]string, error) {
	return nil, nil
}

func (nilAgentDetailClient) CanListAgentsInNamespace(context.Context, string) (bool, error) {
	return true, nil
}

func (nilAgentDetailClient) ListAgents(context.Context, string) (*agents.AgentList, error) {
	return nil, nil
}

func (nilAgentDetailClient) GetAgent(context.Context, string, string) (*agents.AgentDetail, error) {
	return nil, nil
}

func TestListAgentRuntimesScopedByNamespace(t *testing.T) {
	client := agentsmock.NewClient()
	client.Namespaces = []string{"ns-a", "ns-b"}
	client.Agents = map[string][]agents.AgentSummary{
		"ns-a": {
			{Name: "agent-1", Namespace: "ns-a", Status: "Ready", ResourceType: "agent",
				EndpointURL: "http://agent-1.ns-a.svc:8080", CreatedAt: "2026-06-01T00:00:00Z"},
		},
		"ns-b": {
			{Name: "agent-2", Namespace: "ns-b", Status: "Ready", ResourceType: "agent",
				EndpointURL: "http://agent-2.ns-b.svc:8080", CreatedAt: "2026-06-01T00:00:00Z"},
		},
	}
	repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: client})

	t.Run("without namespace returns all", func(t *testing.T) {
		result, err := repo.ListAgentRuntimes(context.Background(), models.ListAgentRuntimesOptions{
			Limit: DefaultAgentRuntimesLimit,
		})
		require.NoError(t, err)
		require.Len(t, result.Runtimes, 2)
	})

	t.Run("with namespace returns only that namespace", func(t *testing.T) {
		result, err := repo.ListAgentRuntimes(context.Background(), models.ListAgentRuntimesOptions{
			Namespace: "ns-a",
			Limit:     DefaultAgentRuntimesLimit,
		})
		require.NoError(t, err)
		require.Len(t, result.Runtimes, 1)
		assert.Equal(t, "agent-1", result.Runtimes[0].Name)
		assert.Equal(t, "ns-a", result.Runtimes[0].Namespace)
	})

	t.Run("with namespace propagates ListAgents error", func(t *testing.T) {
		clientWithErr := agentsmock.NewClient()
		clientWithErr.ListAgentsErr = errors.New("upstream failure")
		repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: clientWithErr})
		_, err := repo.ListAgentRuntimes(context.Background(), models.ListAgentRuntimesOptions{
			Namespace: "ns-a",
			Limit:     DefaultAgentRuntimesLimit,
		})
		require.Error(t, err)
	})

	t.Run("with namespace returns forbidden when access denied", func(t *testing.T) {
		forbiddenClient := agentsmock.NewClient()
		forbiddenClient.CanListAgentsInNSResult = false
		forbiddenClient.Agents = map[string][]agents.AgentSummary{
			"ns-a": {{Name: "agent-1", Namespace: "ns-a", Status: "Ready", ResourceType: "agent",
				EndpointURL: "http://agent-1.ns-a.svc:8080", CreatedAt: "2026-06-01T00:00:00Z"}},
		}
		repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: forbiddenClient})
		_, err := repo.ListAgentRuntimes(context.Background(), models.ListAgentRuntimesOptions{
			Namespace: "ns-a",
			Limit:     DefaultAgentRuntimesLimit,
		})
		require.Error(t, err)
		assert.True(t, errors.Is(err, bfferrors.ErrForbidden))
	})

	t.Run("with namespace returns forbidden when access check errors", func(t *testing.T) {
		errClient := agentsmock.NewClient()
		errClient.CanListAgentsInNSErr = errors.New("sar failed")
		repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: errClient})
		_, err := repo.ListAgentRuntimes(context.Background(), models.ListAgentRuntimesOptions{
			Namespace: "ns-a",
			Limit:     DefaultAgentRuntimesLimit,
		})
		require.Error(t, err)
		assert.True(t, errors.Is(err, bfferrors.ErrForbidden))
	})

	t.Run("with namespace skips ListNamespaces call", func(t *testing.T) {
		clientWithNsErr := agentsmock.NewClient()
		clientWithNsErr.ListNamespacesErr = errors.New("should not be called")
		clientWithNsErr.Agents = map[string][]agents.AgentSummary{
			"ns-a": {{Name: "agent-1", Namespace: "ns-a", Status: "Ready", ResourceType: "agent",
				EndpointURL: "http://agent-1.ns-a.svc:8080", CreatedAt: "2026-06-01T00:00:00Z"}},
		}
		repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: clientWithNsErr})
		result, err := repo.ListAgentRuntimes(context.Background(), models.ListAgentRuntimesOptions{
			Namespace: "ns-a",
			Limit:     DefaultAgentRuntimesLimit,
		})
		require.NoError(t, err)
		require.Len(t, result.Runtimes, 1)
	})
}

func (nilAgentDetailClient) DeployAgent(context.Context, *agents.DeployAgentParams) (*agents.DeployAgentResult, error) {
	return nil, nil
}

func (nilAgentDetailClient) DeleteAgent(context.Context, string, string) error { return nil }
func (nilAgentDetailClient) StopAgent(context.Context, string, string) error   { return nil }
func (nilAgentDetailClient) StartAgent(context.Context, string, string) error  { return nil }

func TestPaginateAgentRuntimes(t *testing.T) {
	runtimes := []models.AgentRuntime{
		{Name: "agent-b", Namespace: "ns-a"},
		{Name: "agent-a", Namespace: "ns-b"},
		{Name: "agent-c", Namespace: "ns-a"},
	}

	firstPage, err := paginateAgentRuntimes(runtimes, 2, "")
	require.NoError(t, err)
	require.Len(t, firstPage.Runtimes, 2)
	require.NotNil(t, firstPage.ContinueToken)
	assert.Equal(t, "agent-b", firstPage.Runtimes[0].Name)
	assert.Equal(t, "ns-a", firstPage.Runtimes[0].Namespace)
	assert.Equal(t, "agent-c", firstPage.Runtimes[1].Name)

	secondPage, err := paginateAgentRuntimes(runtimes, 2, *firstPage.ContinueToken)
	require.NoError(t, err)
	require.Len(t, secondPage.Runtimes, 1)
	assert.Nil(t, secondPage.ContinueToken)
	assert.Equal(t, "agent-a", secondPage.Runtimes[0].Name)
}

func TestPaginateAgentRuntimesCursorContinuesAfterLastSeenItem(t *testing.T) {
	runtimes := []models.AgentRuntime{
		{Name: "agent-b", Namespace: "ns-a"},
		{Name: "agent-c", Namespace: "ns-a"},
		{Name: "agent-a", Namespace: "ns-b"},
	}

	firstPage, err := paginateAgentRuntimes(runtimes, 1, "")
	require.NoError(t, err)
	require.Len(t, firstPage.Runtimes, 1)
	require.NotNil(t, firstPage.ContinueToken)
	assert.Equal(t, "agent-b", firstPage.Runtimes[0].Name)

	secondPage, err := paginateAgentRuntimes(runtimes, 2, *firstPage.ContinueToken)
	require.NoError(t, err)
	require.Len(t, secondPage.Runtimes, 2)
	assert.Equal(t, "agent-c", secondPage.Runtimes[0].Name)
	assert.Equal(t, "agent-a", secondPage.Runtimes[1].Name)
	assert.Nil(t, secondPage.ContinueToken)
}

func TestPaginateAgentRuntimesInvalidContinueToken(t *testing.T) {
	_, err := paginateAgentRuntimes(nil, 10, "not-a-valid-token")
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrInvalidContinueToken))
}
