package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	bfferrors "github.com/opendatahub-io/mod-arch-library/bff/internal/errors"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/integrations/agents"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/mapper"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

// ErrInvalidContinueToken is returned when a runtime list continueToken cannot be decoded.
var ErrInvalidContinueToken = errors.New("invalid continueToken")

// AgentRuntimesRepository loads agent runtime data from an agent data source.
type AgentRuntimesRepository struct {
	agentSourceFactory agents.ClientFactory
}

// NewAgentRuntimesRepository creates a new agent runtimes repository.
func NewAgentRuntimesRepository(agentSourceFactory agents.ClientFactory) *AgentRuntimesRepository {
	return &AgentRuntimesRepository{agentSourceFactory: agentSourceFactory}
}

// ListAgentRuntimes returns deployed agent runtimes. When opts.Namespace is set,
// only agents from that namespace are returned; otherwise all enabled namespaces are queried.
func (r *AgentRuntimesRepository) ListAgentRuntimes(ctx context.Context, opts models.ListAgentRuntimesOptions) (*models.AgentRuntimesResponse, error) {
	client, err := r.agentSourceFactory.GetClient(ctx)
	if err != nil {
		return nil, translateAgentError(err)
	}

	var namespaces []string
	if opts.Namespace != "" {
		allowed, err := client.CanListAgentsInNamespace(ctx, opts.Namespace)
		if err != nil || !allowed {
			return nil, bfferrors.ErrForbidden
		}
		namespaces = []string{opts.Namespace}
	} else {
		namespaces, err = client.ListNamespaces(ctx, true)
		if err != nil {
			return nil, translateAgentError(err)
		}
	}

	runtimes := make([]models.AgentRuntime, 0)
	for _, namespace := range namespaces {
		list, err := client.ListAgents(ctx, namespace)
		if err != nil {
			if opts.Namespace != "" {
				return nil, translateAgentError(err)
			}
			slog.Warn("failed to list agents in namespace, skipping",
				slog.String("namespace", namespace),
				slog.Any("error", err))
			continue
		}
		if list == nil {
			continue
		}
		for _, item := range list.Items {
			runtimes = append(runtimes, mapper.AgentSummaryToRuntime(item))
		}
	}

	return paginateAgentRuntimes(runtimes, opts.Limit, opts.ContinueToken)
}

// GetAgentRuntimeDetail returns full runtime detail for a single agent.
func (r *AgentRuntimesRepository) GetAgentRuntimeDetail(ctx context.Context, namespace, name string) (*models.AgentRuntimeDetail, error) {
	client, err := r.agentSourceFactory.GetClient(ctx)
	if err != nil {
		return nil, translateAgentError(err)
	}

	detail, err := client.GetAgent(ctx, namespace, name)
	if err != nil {
		return nil, translateAgentError(err)
	}
	if detail == nil {
		return nil, bfferrors.ErrNotFound
	}

	return mapper.AgentDetailToRuntimeDetail(detail), nil
}

// DeployAgent deploys a new agent via the agent data source.
func (r *AgentRuntimesRepository) DeployAgent(ctx context.Context, params *agents.DeployAgentParams) (*models.DeployAgentResponse, error) {
	client, err := r.agentSourceFactory.GetClient(ctx)
	if err != nil {
		return nil, translateAgentError(err)
	}

	result, err := client.DeployAgent(ctx, params)
	if err != nil {
		return nil, translateAgentError(err)
	}

	return &models.DeployAgentResponse{
		Success:   true,
		Name:      result.Name,
		Namespace: result.Namespace,
		Message:   "Agent deployed successfully",
	}, nil
}

func translateAgentError(err error) error {
	if err == nil {
		return nil
	}

	if errors.Is(err, agents.ErrNotFound) {
		return bfferrors.ErrNotFound
	}

	if errors.Is(err, agents.ErrAlreadyExists) {
		return bfferrors.ErrAlreadyExists
	}

	if errors.Is(err, agents.ErrConflict) {
		return bfferrors.ErrAlreadyExists
	}

	if errors.Is(err, agents.ErrForbidden) {
		return bfferrors.ErrForbidden
	}

	if errors.Is(err, agents.ErrUnavailable) {
		var unavailable *agents.UnavailableError
		if errors.As(err, &unavailable) && unavailable.Message != "" {
			return fmt.Errorf("%w: %s", bfferrors.ErrUpstreamUnavailable, unavailable.Message)
		}
		return bfferrors.ErrUpstreamUnavailable
	}

	return err
}
