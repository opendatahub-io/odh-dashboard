package repositories

import (
	"context"
	"errors"
	"testing"

	bfferrors "github.com/opendatahub-io/mod-arch-library/bff/internal/errors"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	agentsmock "github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents/mock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAgentRuntimesRepository(client *agentsmock.Client) *AgentRuntimesRepository {
	return NewAgentRuntimesRepository(&agentsmock.Factory{Client: client})
}

func TestAgentRuntimesRepository_GetAgentRuntimeDetail_NotFound(t *testing.T) {
	repo := newTestAgentRuntimesRepository(agentsmock.NewClient())

	_, err := repo.GetAgentRuntimeDetail(context.Background(), "agent-ops-demo", "missing-agent")
	require.ErrorIs(t, err, bfferrors.ErrNotFound)
}

func TestAgentRuntimesRepository_GetAgentCard_NotFound(t *testing.T) {
	repo := newTestAgentRuntimesRepository(agentsmock.NewClient())

	_, err := repo.GetAgentCard(context.Background(), "agent-ops-demo", "missing-agent")
	require.ErrorIs(t, err, bfferrors.ErrNotFound)
}

func TestAgentRuntimesRepository_GetAgentRuntimeDetail_Unavailable(t *testing.T) {
	client := agentsmock.NewClient()
	client.GetAgentErr = &agents.UnavailableError{Message: "agent workload unreachable"}
	repo := newTestAgentRuntimesRepository(client)

	_, err := repo.GetAgentRuntimeDetail(context.Background(), "agent-ops-demo", "sample-support-agent")
	require.Error(t, err)
	assert.ErrorIs(t, err, bfferrors.ErrUpstreamUnavailable)
	assert.Contains(t, err.Error(), "agent workload unreachable")
}

func TestTranslateAgentError_NotFound(t *testing.T) {
	err := translateAgentError(agents.ErrNotFound)
	require.ErrorIs(t, err, bfferrors.ErrNotFound)
}

func TestTranslateAgentError_Passthrough(t *testing.T) {
	original := errors.New("connection reset")
	err := translateAgentError(original)
	require.ErrorIs(t, err, original)
}
