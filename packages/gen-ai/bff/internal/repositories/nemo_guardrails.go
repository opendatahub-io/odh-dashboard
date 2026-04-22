package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// NemoGuardrailsRepository handles NemoGuardrails K8s resource operations.
type NemoGuardrailsRepository struct{}

// NewNemoGuardrailsRepository creates a new NemoGuardrailsRepository.
func NewNemoGuardrailsRepository() *NemoGuardrailsRepository {
	return &NemoGuardrailsRepository{}
}

// InitNemoGuardrails creates per-model ConfigMaps and a NemoGuardrails CR for the given
// install models. It is a thin delegation to the K8s client implementation.
func (r *NemoGuardrailsRepository) InitNemoGuardrails(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	installModels []models.InstallModel,
	maasClient maas.MaaSClientInterface,
) (*models.NemoGuardrailsInitModel, error) {
	userAuthToken := ""
	if identity != nil {
		userAuthToken = identity.Token
	}

	crName, err := client.CreateNemoGuardrailsResources(ctx, identity, namespace, installModels, maasClient, userAuthToken)
	if err != nil {
		return nil, err
	}

	return &models.NemoGuardrailsInitModel{Name: crName}, nil
}
