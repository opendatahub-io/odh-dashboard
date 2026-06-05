package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

// NamespaceRepository handles namespace-related operations.
type NamespaceRepository struct{}

// NewNamespaceRepository creates a new NamespaceRepository instance.
func NewNamespaceRepository() *NamespaceRepository {
	return &NamespaceRepository{}
}

func (r *NamespaceRepository) GetNamespaces(ctx context.Context, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity) ([]models.NamespaceModel, error) {

	namespaces, err := client.GetNamespaces(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching namespaces: %w", err)
	}

	var namespaceModels []models.NamespaceModel
	for _, ns := range namespaces {
		namespaceModels = append(namespaceModels, models.NewNamespaceModelFromNamespace(ns.Name))
	}

	return namespaceModels, nil
}
