package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// GuardrailsRepository handles guardrails operations
type GuardrailsRepository struct{}

// NewGuardrailsRepository creates a new guardrails repository
func NewGuardrailsRepository() *GuardrailsRepository {
	return &GuardrailsRepository{}
}

// GetGuardrailsStatus returns the status of the first GuardrailsOrchestrator CR found in the namespace
func (r *GuardrailsRepository) GetGuardrailsStatus(
	k8sClient kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
) (*models.GuardrailsStatus, error) {
	return k8sClient.GetGuardrailsOrchestratorStatus(ctx, identity, namespace)
}
