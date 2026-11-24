package repositories

import (
	"context"
	"encoding/json"
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
//
// List and Get read shared templates with the service account on every
// platform: any authenticated user needs them to create a connection and is
// not granted ConfigMap access in the dashboard namespace. That is a documented
// read-only exception (docs/bootstrap-contract.md). Create, Update, Patch and
// Delete follow the credential policy, including the existence check they do
// first, so on xKS a mutation is authorized by the API server for the caller.
type ConnectionTypeRepository struct {
	saClientset kubernetes.Interface
	clients     clientSource
}

func NewConnectionTypeRepository(saClientset kubernetes.Interface) *ConnectionTypeRepository {
	return &ConnectionTypeRepository{saClientset: saClientset, clients: saSource(saClientset, nil)}
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

	cs, err := r.clients.typed(ctx)
	if err != nil {
		return nil, err
	}
	_, err = cs.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
	if err != nil {
		if r.clients.surfacesAuthFailure(err) {
			return nil, err
		}
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) Update(ctx context.Context, namespace, name string, cm *corev1.ConfigMap) (*models.MutationResponse, error) {
	if resp := requireConnectionTypeLabels(cm); resp != nil {
		return resp, nil
	}

	cs, err := r.clients.typed(ctx)
	if err != nil {
		return nil, err
	}
	existing, resp, err := r.getValidatedConnectionType(ctx, cs, namespace, name)
	if err != nil || resp != nil {
		return resp, err
	}

	// Bind the write to the ConfigMap that was validated: if it changed since,
	// the API server rejects the update as a conflict instead of writing over
	// an object that was not checked. A version the client sent must be that
	// same one; any other could name an object that was never validated.
	if cm.ResourceVersion != "" && cm.ResourceVersion != existing.ResourceVersion {
		return &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("connection type %q changed since it was loaded; reload it and save again", name),
		}, nil
	}
	cm.ResourceVersion = existing.ResourceVersion
	_, updateErr := cs.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	if updateErr != nil {
		if r.clients.surfacesAuthFailure(updateErr) {
			return nil, updateErr
		}
		return &models.MutationResponse{Success: false, Error: updateErr.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

// Patch applies a JSON Patch to a connection-type ConfigMap via the k8s Patch API.
func (r *ConnectionTypeRepository) Patch(ctx context.Context, namespace, name string, patchData []byte) (*models.MutationResponse, error) {
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return nil, err
	}
	existing, resp, err := r.getValidatedConnectionType(ctx, cs, namespace, name)
	if err != nil || resp != nil {
		return resp, err
	}

	_, err = cs.CoreV1().ConfigMaps(namespace).Patch(ctx, name, types.JSONPatchType,
		boundJSONPatch(patchData, existing.ResourceVersion), metav1.PatchOptions{})
	if err != nil {
		if r.clients.surfacesAuthFailure(err) {
			return nil, err
		}
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}

	return &models.MutationResponse{Success: true, Error: ""}, nil
}

func (r *ConnectionTypeRepository) getValidatedConnectionType(ctx context.Context, cs kubernetes.Interface, namespace, name string) (*corev1.ConfigMap, *models.MutationResponse, error) {
	existing, err := cs.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if r.clients.surfacesAuthFailure(err) {
			return nil, nil, err
		}
		return nil, &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("unable to find connection type %q: %v", name, err),
		}, nil
	}
	if !isConnectionTypeConfigMap(existing) {
		return nil, &models.MutationResponse{
			Success: false,
			Error:   fmt.Sprintf("object %q is not a connection type", name),
		}, nil
	}
	return existing, nil, nil
}

func (r *ConnectionTypeRepository) Delete(ctx context.Context, namespace, name string) (*models.MutationResponse, error) {
	cs, err := r.clients.typed(ctx)
	if err != nil {
		return nil, err
	}
	existing, resp, err := r.getValidatedConnectionType(ctx, cs, namespace, name)
	if err != nil || resp != nil {
		return resp, err
	}

	// Delete only the ConfigMap that was validated.
	rv := existing.ResourceVersion
	if err := cs.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{
		Preconditions: &metav1.Preconditions{ResourceVersion: &rv},
	}); err != nil {
		if r.clients.surfacesAuthFailure(err) {
			return nil, err
		}
		return &models.MutationResponse{Success: false, Error: err.Error()}, nil
	}
	return &models.MutationResponse{Success: true, Error: ""}, nil
}

// boundJSONPatch prepends a "test" operation on metadata.resourceVersion, so
// the API server applies the patch only to the ConfigMap that was validated:
// a JSON Patch fails as a whole when a test fails. A body that is not a JSON
// array is passed through unchanged for the API server to reject.
func boundJSONPatch(patchData []byte, resourceVersion string) []byte {
	var ops []json.RawMessage
	if resourceVersion == "" || json.Unmarshal(patchData, &ops) != nil {
		return patchData
	}
	test, err := json.Marshal(map[string]string{"op": "test", "path": "/metadata/resourceVersion", "value": resourceVersion})
	if err != nil {
		return patchData
	}
	bound, err := json.Marshal(append([]json.RawMessage{test}, ops...))
	if err != nil {
		return patchData
	}
	return bound
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
