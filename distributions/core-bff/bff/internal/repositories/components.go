package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/k8sutil"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

// ComponentsRepository handles OdhApplication CRD listing and removal from the
// enabled-apps ConfigMap. "Components" here refers specifically to OdhApplication
// resources, not generic Kubernetes components.
//
// ListComponents reads the catalogue with the service account on every
// platform (documented bootstrap read). RemoveComponent is an admin mutation
// and follows the credential policy.
type ComponentsRepository struct {
	saDynClient dynamic.Interface
	clients     clientSource
}

func NewComponentsRepository(saDynClient dynamic.Interface, saClientset kubernetes.Interface) *ComponentsRepository {
	return &ComponentsRepository{saDynClient: saDynClient, clients: saSource(saClientset, saDynClient)}
}

// ListComponents lists OdhApplication CRDs. Returns empty slice when CRD is absent.
// Full RHOAI logic (CSV resolution, link resolution, app filtering) is deferred to Task 9.
func (r *ComponentsRepository) ListComponents(
	ctx context.Context,
	namespace string, installedOnly bool,
) ([]map[string]any, error) {
	if r.saDynClient == nil {
		return []map[string]any{}, nil
	}

	list, err := r.saDynClient.Resource(models.OdhApplicationGVR).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		// A 405 is checked first: IsResourceUnavailable counts it as absence,
		// but a rejected LIST does not establish that the API is missing.
		if k8serrors.IsMethodNotSupported(err) {
			return nil, fmt.Errorf("component list returned method not supported: %w", err)
		}
		if k8sutil.IsResourceUnavailable(err) {
			return []map[string]any{}, nil
		}
		return nil, fmt.Errorf("failed to list components: %w", err)
	}

	result := make([]map[string]any, 0, len(list.Items))
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
	cs, err := r.clients.typed(ctx)
	if err != nil {
		if r.clients.policy == CredentialPolicyCaller {
			return nil, err
		}
		return &models.MutationResponse{Success: false, Error: "service account clientset not configured"}, nil
	}

	cm, err := cs.CoreV1().ConfigMaps(namespace).Get(ctx, enabledAppsCM, metav1.GetOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: fmt.Sprintf("failed to read enabled apps ConfigMap: %v", err)}, nil
	}

	if cm.Data == nil {
		return &models.MutationResponse{Success: true, Error: ""}, nil
	}

	delete(cm.Data, appName)

	_, err = cs.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: fmt.Sprintf("failed to update enabled apps ConfigMap: %v", err)}, nil
	}

	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func isShownOnEnabledPage(item unstructured.Unstructured) bool {
	spec, ok := item.Object["spec"].(map[string]any)
	if !ok {
		return false
	}
	shown, ok := spec["shownOnEnabledPage"].(bool)
	return ok && shown
}
