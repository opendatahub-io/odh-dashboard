package repositories

import (
	"context"
	"fmt"
	"strings"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
)

type NamespaceRepository struct{}

func NewNamespaceRepository() *NamespaceRepository {
	return &NamespaceRepository{}
}

func (r *NamespaceRepository) GetNamespaces(client k8s.KubernetesClientInterface, ctx context.Context, identity *k8s.RequestIdentity) ([]models.NamespaceModel, error) {

	namespaces, err := client.GetNamespaces(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching namespaces: %w", err)
	}

	// Filter out namespaces that are not available
	namespaces = filterAvailableNamespaces(namespaces)

	var namespaceModels = []models.NamespaceModel{}
	for _, ns := range namespaces {
		namespaceModels = append(namespaceModels, models.NewNamespaceModelFromNamespace(ns.Name, ns.Annotations))
	}

	return namespaceModels, nil
}

func filterAvailableNamespaces(namespaces []corev1.Namespace) []corev1.Namespace {
	excludedExact := map[string]struct{}{
		"default":     {},
		"system":      {},
		"openshift":   {},
		"opendatahub": {},
	}

	filtered := make([]corev1.Namespace, 0, len(namespaces))
	for _, ns := range namespaces {
		name := ns.Name
		if strings.HasPrefix(name, "openshift-") || strings.HasPrefix(name, "kube-") {
			continue
		}
		if _, excluded := excludedExact[name]; excluded {
			continue
		}
		filtered = append(filtered, ns)
	}
	return filtered
}
