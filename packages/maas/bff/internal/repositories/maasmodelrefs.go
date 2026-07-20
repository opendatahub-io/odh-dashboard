package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/types"

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

// ListMaaSModelRefs returns all MaaSModelRef resources across all namespaces.
func (r *MaaSModelRefsRepository) ListMaaSModelRefs(ctx context.Context) ([]models.MaaSModelRefSummary, error) {
	r.logger.Debug("Listing all MaaSModelRefs")

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	list, err := kubeClient.Resource(constants.MaaSModelRefGvr).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSModelRefs: %w", err)
	}

	summaries := make([]models.MaaSModelRefSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summary := convertUnstructuredToModelRefSummary(&item)
		summaries = append(summaries, *summary)
	}

	return summaries, nil
}

// CreateMaaSModelRef creates a MaaSModelRef resource. When dryRun is true the request is
// validated by the API server but not persisted.
func (r *MaaSModelRefsRepository) CreateMaaSModelRef(ctx context.Context, request models.CreateMaaSModelRefRequest, dryRun bool) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Creating MaaSModelRef", slog.String("name", request.Name), slog.String("namespace", request.Namespace), slog.Bool("dryRun", dryRun))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	createOpts := metav1.CreateOptions{}
	if dryRun {
		createOpts.DryRun = []string{metav1.DryRunAll}
	}

	obj := buildModelRefUnstructured(request.Name, request.Namespace, request.ModelRef, request.EndpointOverride, request.Uid, request.DisplayName, request.Description, request.ModelCapabilities)
	created, err := kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(request.Namespace).Create(ctx, obj, createOpts)
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("MaaSModelRef '%s' already exists", request.Name)
		}
		return nil, fmt.Errorf("failed to create MaaSModelRef: %w", err)
	}

	return convertUnstructuredToModelRefSummary(created), nil
}

// UpdateMaaSModelRef updates a MaaSModelRef resource. When dryRun is true the request is
// validated by the API server but not persisted.
func (r *MaaSModelRefsRepository) UpdateMaaSModelRef(ctx context.Context, namespace, name string, request models.UpdateMaaSModelRefRequest, dryRun bool) (*models.MaaSModelRefSummary, error) {
	r.logger.Debug("Updating MaaSModelRef", slog.String("namespace", namespace), slog.String("name", name), slog.Bool("dryRun", dryRun))

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

	annotations := existing.GetAnnotations()
	if annotations == nil {
		annotations = map[string]string{}
	}

	if request.DisplayName != nil {
		if *request.DisplayName == "" {
			delete(annotations, constants.DisplayNameAnnotation)
		} else {
			annotations[constants.DisplayNameAnnotation] = *request.DisplayName
		}
	}
	if request.Description != nil {
		if *request.Description == "" {
			delete(annotations, constants.DescriptionAnnotation)
		} else {
			annotations[constants.DescriptionAnnotation] = *request.Description
		}
	}
	if request.ModelCapabilities != nil {
		if len(request.ModelCapabilities) == 0 {
			delete(annotations, modelCapabilitiesAnnotation)
		} else {
			capJSON, err := json.Marshal(request.ModelCapabilities)
			if err != nil {
				r.logger.Warn("failed to marshal model capabilities", "err", err)
			} else {
				annotations[modelCapabilitiesAnnotation] = string(capJSON)
			}
		}
	}
	existing.SetAnnotations(annotations)
	existing.Object["spec"] = existingSpec

	updateOpts := metav1.UpdateOptions{}
	if dryRun {
		updateOpts.DryRun = []string{metav1.DryRunAll}
	}

	updated, err := kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(namespace).Update(ctx, existing, updateOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to update MaaSModelRef: %w", err)
	}

	return convertUnstructuredToModelRefSummary(updated), nil
}

// DeleteMaaSModelRef deletes a MaaSModelRef resource by namespace and name. When dryRun is true
// the request is validated by the API server but not persisted.
func (r *MaaSModelRefsRepository) DeleteMaaSModelRef(ctx context.Context, namespace, name string, dryRun bool) error {
	r.logger.Debug("Deleting MaaSModelRef", slog.String("namespace", namespace), slog.String("name", name), slog.Bool("dryRun", dryRun))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetDynamicClient()
	deleteOpts := metav1.DeleteOptions{}
	if dryRun {
		deleteOpts.DryRun = []string{metav1.DryRunAll}
	}
	err = kubeClient.Resource(constants.MaaSModelRefGvr).Namespace(namespace).Delete(ctx, name, deleteOpts)
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return fmt.Errorf("MaaSModelRef '%s' not found: %w", name, err)
		}
		return fmt.Errorf("failed to delete MaaSModelRef: %w", err)
	}

	return nil
}

func buildModelRefUnstructured(name, namespace string, modelRef models.ModelReference, endpointOverride string, uid string, displayName string, description string, modelCapabilities []string) *unstructured.Unstructured {
	obj := &unstructured.Unstructured{}
	obj.SetAPIVersion("maas.opendatahub.io/v1alpha1")
	obj.SetKind("MaaSModelRef")
	obj.SetName(name)
	obj.SetNamespace(namespace)
	if uid != "" {
		obj.SetOwnerReferences([]metav1.OwnerReference{
			{
				UID:                types.UID(uid),
				Name:               name,
				APIVersion:         "serving.kserve.io/v1alpha2",
				Kind:               "LLMInferenceService",
				BlockOwnerDeletion: &[]bool{false}[0],
			},
		})
	}
	annotations := map[string]string{}
	if displayName != "" {
		annotations[constants.DisplayNameAnnotation] = displayName
	}
	if description != "" {
		annotations[constants.DescriptionAnnotation] = description
	}
	if len(modelCapabilities) > 0 {
		modelCapabilitiesJSON, err := json.Marshal(modelCapabilities)
		if err != nil {
			slog.Warn("failed to marshal model capabilities", "err", err)
		} else {
			annotations[modelCapabilitiesAnnotation] = string(modelCapabilitiesJSON)
		}
	}
	obj.SetAnnotations(annotations)

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
