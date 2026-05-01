package repositories

import (
	"context"

	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// NemoGuardrailsRepository handles NemoGuardrails K8s resource operations.
type NemoGuardrailsRepository struct{}

// NewNemoGuardrailsRepository creates a new NemoGuardrailsRepository.
func NewNemoGuardrailsRepository() *NemoGuardrailsRepository {
	return &NemoGuardrailsRepository{}
}

// GetNemoGuardrailsStatus returns the status of the NemoGuardrails CR in the namespace.
func (r *NemoGuardrailsRepository) GetNemoGuardrailsStatus(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
) (*models.NemoGuardrailsStatus, error) {
	return client.GetNemoGuardrailsStatus(ctx, namespace)
}

// InitNemoGuardrails creates a placeholder ConfigMap and NemoGuardrails CR in the namespace.
// The actual model and API key are supplied at runtime via inline config in guardrail/checks calls.
func (r *NemoGuardrailsRepository) InitNemoGuardrails(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
) (*models.NemoGuardrailsInitModel, error) {
	crName, err := client.CreateNemoGuardrailsResources(ctx, namespace)
	if err != nil {
		return nil, err
	}
	return &models.NemoGuardrailsInitModel{Name: crName}, nil
}
