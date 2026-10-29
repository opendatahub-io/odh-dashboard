package repositories

import (
	"context"
	"errors"
	"fmt"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

var ErrNamespaceAccessDenied = errors.New("namespace access denied")

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

	namespaceModels := make([]models.NamespaceModel, 0, len(namespaces))
	for _, ns := range namespaces {
		namespaceModels = append(namespaceModels, models.NewNamespaceModelFromNamespace(ns))
	}

	return namespaceModels, nil
}

// GetNamespace checks named, cluster-scoped get access before reading with the caller's client.
func (r *NamespaceRepository) GetNamespace(ctx context.Context, client k8s.KubernetesClientInterface, identity *k8s.RequestIdentity, name string) (models.NamespaceModel, error) {
	allowed, err := client.CanGetNamespace(ctx, identity, name)
	if err != nil {
		return models.NamespaceModel{}, fmt.Errorf("error checking namespace access: %w", err)
	}
	if !allowed {
		return models.NamespaceModel{}, ErrNamespaceAccessDenied
	}

	ns, err := client.GetNamespace(ctx, identity, name)
	if err != nil {
		return models.NamespaceModel{}, fmt.Errorf("error fetching namespace: %w", err)
	}
	return models.NewNamespaceModelFromNamespace(*ns), nil
}
