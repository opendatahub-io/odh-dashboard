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
// The create is user-initiated, so it follows the credential policy: the
// service account on OpenShift, the caller on xKS.
type ServingRuntimeRepository struct {
	clients clientSource
}

func NewServingRuntimeRepository(saDynClient dynamic.Interface) *ServingRuntimeRepository {
	return &ServingRuntimeRepository{clients: saSource(nil, saDynClient)}
}

// Create creates a ServingRuntime CR in the given namespace.
// dryRun can be "All" to validate without persisting.
func (r *ServingRuntimeRepository) Create(ctx context.Context, namespace string, obj *unstructured.Unstructured, dryRun string) (*unstructured.Unstructured, error) {
	opts := metav1.CreateOptions{}
	if dryRun != "" {
		opts.DryRun = []string{dryRun}
	}

	dyn, err := r.clients.dynamic(ctx)
	if err != nil {
		return nil, err
	}
	result, err := dyn.Resource(models.ServingRuntimeGVR).Namespace(namespace).Create(ctx, obj, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create ServingRuntime in namespace %q: %w", namespace, err)
	}
	return result, nil
}
