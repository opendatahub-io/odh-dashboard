package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// ComponentsRepository handles OdhApplication CRD listing and removal.
// Uses the SA clients for all operations, matching the privileged watcher model.
type ComponentsRepository struct {
	saDynClient dynamic.Interface
	saClientset kubernetes.Interface
}

func NewComponentsRepository(saDynClient dynamic.Interface, saClientset kubernetes.Interface) *ComponentsRepository {
	return &ComponentsRepository{saDynClient: saDynClient, saClientset: saClientset}
}

// ListComponents lists OdhApplication CRDs. Returns empty slice when CRD is absent.
// Full RHOAI logic (CSV resolution, link resolution, app filtering) is deferred to Task 9.
func (r *ComponentsRepository) ListComponents(
	ctx context.Context,
	namespace string, installedOnly bool,
) ([]map[string]interface{}, error) {
	if r.saDynClient == nil {
		return []map[string]interface{}{}, nil
	}

	list, err := r.saDynClient.Resource(models.OdhApplicationGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) || isDiscoveryError(err) {
			return []map[string]interface{}{}, nil
		}
		return nil, fmt.Errorf("failed to list components: %w", err)
	}

	result := make([]map[string]interface{}, 0, len(list.Items))
	for _, item := range list.Items {
		if installedOnly && !isShownOnEnabledPage(item) {
			continue
		}
		result = append(result, item.Object)
	}

	return result, nil
}

// RemoveComponent removes an app entry from the enabled-apps ConfigMap.
func (r *ComponentsRepository) RemoveComponent(ctx context.Context, namespace, appName, enabledAppsCM string) (*models.MutationResponse, error) {
	if enabledAppsCM == "" {
		return &models.MutationResponse{Success: false, Error: "enabled apps ConfigMap not configured"}, nil
	}
	if r.saClientset == nil {
		return &models.MutationResponse{Success: false, Error: "service account clientset not configured"}, nil
	}

	cm, err := r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, enabledAppsCM, metav1.GetOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: fmt.Sprintf("failed to read enabled apps ConfigMap: %v", err)}, nil
	}

	if cm.Data == nil {
		return &models.MutationResponse{Success: true, Error: ""}, nil
	}

	delete(cm.Data, appName)

	_, err = r.saClientset.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: fmt.Sprintf("failed to update enabled apps ConfigMap: %v", err)}, nil
	}

	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func isShownOnEnabledPage(item unstructured.Unstructured) bool {
	spec, ok := item.Object["spec"].(map[string]interface{})
	if !ok {
		return false
	}
	shown, ok := spec["shownOnEnabledPage"].(bool)
	return ok && shown
}
