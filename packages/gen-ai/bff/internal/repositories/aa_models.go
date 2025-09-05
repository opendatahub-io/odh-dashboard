package repositories

import (
	"context"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models/genaiassets"
)

type AAModelsRepository struct{}

func NewAAModelsRepository() *AAModelsRepository {
	return &AAModelsRepository{}
}

func (r *AAModelsRepository) GetAAModels(client kubernetes.KubernetesClientInterface, ctx context.Context, identity *integrations.RequestIdentity, namespace string) ([]genaiassets.AAModel, error) {
	// Get models directly from Kubernetes client
	return client.GetAAModels(ctx, identity, namespace)
}
