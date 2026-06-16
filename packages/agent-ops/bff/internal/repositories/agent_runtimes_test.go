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

func TestGetAgentRuntimeDetailTranslatesForbidden(t *testing.T) {
	mockClient := agentsmock.NewClient()
	mockClient.GetAgentErr = agents.ErrForbidden

	repo := NewAgentRuntimesRepository(&agentsmock.Factory{Client: mockClient})
	_, err := repo.GetAgentRuntimeDetail(context.Background(), "agent-ops-demo", "sample-support-agent")
	require.Error(t, err)
	assert.True(t, errors.Is(err, bfferrors.ErrForbidden))
}
