package repositories

import (
	"context"
	"fmt"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
)

type NamespaceRepository struct{}

func NewNamespaceRepository() *NamespaceRepository {
	return &NamespaceRepository{}
}

const DisplayNameAnnotation = "openshift.io/display-name"

func (r *NamespaceRepository) GetNamespaces(client kubernetes.KubernetesClientInterface, ctx context.Context, identity *integrations.RequestIdentity) ([]models.NamespaceModel, error) {

	namespaces, err := client.GetNamespaces(ctx, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching namespaces: %w", err)
	}

	// Filter out namespaces that are not available
	namespaces = filterAvailableNamespaces(namespaces)

	var namespaceModels = []models.NamespaceModel{}
	for _, ns := range namespaces {
		namespaceModels = append(namespaceModels, models.NewNamespaceModelFromNamespace(ns.Name, ns.Annotations[DisplayNameAnnotation]))
	}

	return namespaceModels, nil
}

func filterAvailableNamespaces(namespaces []corev1.Namespace) []corev1.Namespace {
	excludedExact := map[string]struct{}{
		"default":   {},
		"system":    {},
		"openshift": {},
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
