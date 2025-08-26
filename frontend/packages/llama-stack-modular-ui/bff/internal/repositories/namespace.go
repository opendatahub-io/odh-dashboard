package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations/kubernetes"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/models"
)

type NamespaceRepository struct{}

func NewNamespaceRepository() *NamespaceRepository {
	return &NamespaceRepository{}
}

func (r *NamespaceRepository) GetNamespaces(client kubernetes.KubernetesClientInterface, ctx context.Context, identity *integrations.RequestIdentity) ([]models.NamespaceModel, error) {

	namespaces, err := client.GetNamespaces(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching namespaces: %w", err)
	}

	var namespaceModels = []models.NamespaceModel{}
	for _, ns := range namespaces {
		namespaceModels = append(namespaceModels, models.NewNamespaceModelFromNamespace(ns.Name))
	}

	return namespaceModels, nil
}
