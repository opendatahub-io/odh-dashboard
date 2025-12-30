package repositories

import (
	"context"
	"log/slog"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// GuardrailsRepository handles guardrails operations
type GuardrailsRepository struct {
	logger *slog.Logger
}

// NewGuardrailsRepository creates a new guardrails repository
func NewGuardrailsRepository(logger *slog.Logger) *GuardrailsRepository {
	if logger == nil {
		logger = slog.Default()
	}
	return &GuardrailsRepository{
		logger: logger,
	}
}

// GetGuardrailsStatus returns the status of the "custom-guardrails" CR from the k8s client
func (r *GuardrailsRepository) GetGuardrailsStatus(
	k8sClient kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	dashboardNamespace string,
) (*models.GuardrailsStatus, error) {
	r.logger.Info("Fetching GuardrailsOrchestrator status via k8s client",
		"namespace", dashboardNamespace)

	return k8sClient.GetGuardrailsOrchestratorStatus(ctx, identity, dashboardNamespace)
}
