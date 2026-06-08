package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes"
)

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
		return nil, fmt.Errorf("configmap %q is not a connection type", name)
	}
	return cm, nil
}

func (r *ConnectionTypeRepository) Create(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*models.MutationResponse, error) {
	if !isConnectionTypeConfigMap(cm) {
		return &models.MutationResponse{
			Success: false,
			Error:   "configmap must have connection-type labels",
		}, nil
	}

	_, err := r.saClientset.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) Update(ctx context.Context, namespace, name string, cm *corev1.ConfigMap) (*models.MutationResponse, error) {
	if !isConnectionTypeConfigMap(cm) {
		return &models.MutationResponse{
			Success: false,
			Error:   "configmap must have connection-type labels",
		}, nil
	}

	if err := r.validateExistingConnectionType(ctx, namespace, name); err != nil {
		return err, nil
	}

	_, updateErr := r.saClientset.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if updateErr != nil {
		return &models.MutationResponse{Success: false, Error: updateErr.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) Patch(ctx context.Context, namespace, name string, patchData []byte) (*models.MutationResponse, error) {
	if err := r.validateExistingConnectionType(ctx, namespace, name); err != nil {
		return err, nil
	}

	existing, getErr := r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if getErr != nil {
		return &models.MutationResponse{Success: false, Error: fmt.Sprintf("failed to fetch baseline for revert: %v", getErr)}, nil
	}

	patched, patchErr := r.saClientset.CoreV1().ConfigMaps(namespace).Patch(ctx, name, types.JSONPatchType, patchData, metav1.PatchOptions{})
	if patchErr != nil {
		return &models.MutationResponse{Success: false, Error: patchErr.Error()}, nil
	}

	if !isConnectionTypeConfigMap(patched) {
		errMsg := "patch would remove required connection-type labels"
		existing.ResourceVersion = patched.ResourceVersion
		if _, revertErr := r.saClientset.CoreV1().ConfigMaps(namespace).Update(ctx, existing, metav1.UpdateOptions{}); revertErr != nil {
			errMsg = fmt.Sprintf("%s (revert failed: %v)", errMsg, revertErr)
		}
		return &models.MutationResponse{
			Success: false,
			Error:   errMsg,
		}, nil
	}

	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) validateExistingConnectionType(ctx context.Context, namespace, name string) *models.MutationResponse {
	existing, err := r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("unable to find connection type %q: %v", name, err),
		}
	}
	if !isConnectionTypeConfigMap(existing) {
		return &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("unable to update connection type, object %q is not a connection type", name),
		}
	}
	return nil
}

func (r *ConnectionTypeRepository) Delete(ctx context.Context, namespace, name string) (*models.MutationResponse, error) {
	cm, err := r.saClientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	if !isConnectionTypeConfigMap(cm) {
		return &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("configmap %q is not a connection type", name),
		}, nil
	}

	if err := r.saClientset.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{}); err != nil {
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func isConnectionTypeConfigMap(cm *corev1.ConfigMap) bool {
	if cm == nil || cm.Labels == nil {
		return false
	}
	return cm.Labels[models.LabelDashboardResource] == "true" &&
		cm.Labels[models.LabelConnectionType] == "true"
}
