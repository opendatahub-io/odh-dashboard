package repositories

import (
	"context"
	"errors"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
)

var ErrNotConnectionType = errors.New("object is not a connection type")

const connectionTypeLabelSelector = models.LabelDashboardResource + "=true," + models.LabelConnectionType + "=true"

// ConnectionTypeRepository handles CRUD operations for connection-type ConfigMaps.
// Uses the SA clientset for all operations, matching the privileged watcher model.
type ConnectionTypeRepository struct {
	saClientset kubernetes.Interface
}

func NewConnectionTypeRepository(saClientset kubernetes.Interface) *ConnectionTypeRepository {
	return &ConnectionTypeRepository{saClientset: saClientset}
}

func (r *ConnectionTypeRepository) List(ctx context.Context, namespace string) ([]corev1.ConfigMap, error) {
	allItems := []corev1.ConfigMap{}
	continueToken := ""

	for {
		cmList, err := r.saClientset.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{
			LabelSelector: connectionTypeLabelSelector,
			Continue:      continueToken,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to list connection types: %w", err)
		}

		allItems = append(allItems, cmList.Items...)

		if cmList.Continue == "" {
			break
		}
		continueToken = cmList.Continue
	}

	return allItems, nil
}

func (r *ConnectionTypeRepository) Get(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	cm, err := r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return nil, err
		}
		return nil, fmt.Errorf("failed to get connection type %q: %w", name, err)
	}
	if !isConnectionTypeConfigMap(cm) {
		return nil, fmt.Errorf("configmap %q: %w", name, ErrNotConnectionType)
	}
	return cm, nil
}

func (r *ConnectionTypeRepository) Create(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*models.MutationResponse, error) {
	if resp := requireConnectionTypeLabels(cm); resp != nil {
		return resp, nil
	}

	_, err := r.saClientset.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) Update(ctx context.Context, namespace, name string, cm *corev1.ConfigMap) (*models.MutationResponse, error) {
	if resp := requireConnectionTypeLabels(cm); resp != nil {
		return resp, nil
	}

	if _, resp := r.getValidatedConnectionType(ctx, namespace, name); resp != nil {
		return resp, nil
	}

	_, updateErr := r.saClientset.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if updateErr != nil {
		return &models.MutationResponse{Success: false, Error: updateErr.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

// Patch applies a JSON Patch to a connection-type ConfigMap via the k8s Patch API.
func (r *ConnectionTypeRepository) Patch(ctx context.Context, namespace, name string, patchData []byte) (*models.MutationResponse, error) {
	if _, resp := r.getValidatedConnectionType(ctx, namespace, name); resp != nil {
		return resp, nil
	}

	_, err := r.saClientset.CoreV1().ConfigMaps(namespace).Patch(ctx, name, types.JSONPatchType, patchData, metav1.PatchOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}

	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) getValidatedConnectionType(ctx context.Context, namespace, name string) (*corev1.ConfigMap, *models.MutationResponse) {
	existing, err := r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("unable to find connection type %q: %v", name, err),
		}
	}
	if !isConnectionTypeConfigMap(existing) {
		return nil, &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("object %q is not a connection type", name),
		}
	}
	return existing, nil
}

func (r *ConnectionTypeRepository) Delete(ctx context.Context, namespace, name string) (*models.MutationResponse, error) {
	if _, resp := r.getValidatedConnectionType(ctx, namespace, name); resp != nil {
		return resp, nil
	}

	if err := r.saClientset.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{}); err != nil {
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func requireConnectionTypeLabels(cm *corev1.ConfigMap) *models.MutationResponse {
	if !isConnectionTypeConfigMap(cm) {
		return &models.MutationResponse{
			Success: false,
			Error:   "configmap must have connection-type labels",
		}
	}
	return nil
}

func isConnectionTypeConfigMap(cm *corev1.ConfigMap) bool {
	if cm == nil || cm.Labels == nil {
		return false
	}
	return cm.Labels[models.LabelDashboardResource] == "true" &&
		cm.Labels[models.LabelConnectionType] == "true"
}
