package repositories

import (
	"context"
	"fmt"
	"log/slog"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// MaaSModelRefsRepository handles MaaSModelRef operations via the Kubernetes API.
type MaaSModelRefsRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

// NewMaaSModelRefsRepository creates a new MaaSModelRef repository.
func NewMaaSModelRefsRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory) *MaaSModelRefsRepository {
	return &MaaSModelRefsRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
	}
}

// CreateMaaSModelRef creates a MaaSModelRef resource.
func (r *MaaSModelRefsRepository) CreateMaaSModelRef(ctx context.Context, request models.CreateMaaSModelRefRequest) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Creating MaaSModelRef", slog.String("name", request.Name), slog.String("namespace", request.Namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	obj := buildModelRefUnstructured(request.Name, request.Namespace, request.ModelRef, request.EndpointOverride)
	created, err := kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(request.Namespace).Create(ctx, obj, metav1.CreateOptions{})
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("MaaSModelRef '%s' already exists", request.Name)
		}
		return nil, fmt.Errorf("failed to create MaaSModelRef: %w", err)
	}

	return convertUnstructuredToModelRefSummary(created)
}

// UpdateMaaSModelRef updates a MaaSModelRef resource.
func (r *MaaSModelRefsRepository) UpdateMaaSModelRef(ctx context.Context, namespace, name string, request models.UpdateMaaSModelRefRequest) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Updating MaaSModelRef", slog.String("namespace", namespace), slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	existing, err := kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return nil, fmt.Errorf("MaaSModelRef '%s' not found", name)
		}
		return nil, fmt.Errorf("failed to get MaaSModelRef: %w", err)
	}

	existingSpec, _, _ := unstructured.NestedMap(existing.Object, "spec")
	if existingSpec == nil {
		existingSpec = map[string]interface{}{}
	}
	existingSpec["modelRef"] = map[string]interface{}{
		"kind": request.ModelRef.Kind,
		"name": request.ModelRef.Name,
	}
	if request.EndpointOverride != "" {
		existingSpec["endpointOverride"] = request.EndpointOverride
	}
	existing.Object["spec"] = existingSpec

	updated, err := kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(namespace).Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update MaaSModelRef: %w", err)
	}

	return convertUnstructuredToModelRefSummary(updated)
}

// DeleteMaaSModelRef deletes a MaaSModelRef resource by namespace and name.
func (r *MaaSModelRefsRepository) DeleteMaaSModelRef(ctx context.Context, namespace, name string) error {
	r.logger.Debug("Deleting MaaSModelRef", slog.String("namespace", namespace), slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetDynamicClient()
	err = kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return fmt.Errorf("MaaSModelRef '%s' not found", name)
		}
		return fmt.Errorf("failed to delete MaaSModelRef: %w", err)
	}

	return nil
}

func buildModelRefUnstructured(name, namespace string, modelRef models.ModelReference, endpointOverride string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("maas.opendatahub.io/v1alpha1")
	obj.SetKind("MaaSModelRef")
	obj.SetName(name)
	obj.SetNamespace(namespace)

	spec := map[string]interface{}{
		"modelRef": map[string]interface{}{
			"kind": modelRef.Kind,
			"name": modelRef.Name,
		},
	}
	if endpointOverride != "" {
		spec["endpointOverride"] = endpointOverride
	}

	obj.Object["spec"] = spec
	return obj
}
