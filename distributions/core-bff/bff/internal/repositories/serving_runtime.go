package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
)

// ServingRuntimeRepository handles creation of ServingRuntime CRs.
// Uses the SA dynamic client for privileged operations.
type ServingRuntimeRepository struct {
	saDynClient dynamic.Interface
}

func NewServingRuntimeRepository(saDynClient dynamic.Interface) *ServingRuntimeRepository {
	return &ServingRuntimeRepository{saDynClient: saDynClient}
}

// Create creates a ServingRuntime CR in the given namespace.
// dryRun can be "All" to validate without persisting.
func (r *ServingRuntimeRepository) Create(ctx context.Context, namespace string, obj *unstructured.Unstructured, dryRun string) (*unstructured.Unstructured, error) {
	opts := metav1.CreateOptions{}
	if dryRun != "" {
		opts.DryRun = []string{dryRun}
	}

	result, err := r.saDynClient.Resource(models.ServingRuntimeGVR).Namespace(namespace).Create(ctx, obj, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create ServingRuntime in namespace %q: %w", namespace, err)
	}
	return result, nil
}
