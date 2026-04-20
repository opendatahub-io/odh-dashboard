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

// PoliciesRepository handles MaaSAuthPolicy operations via the Kubernetes API.
type PoliciesRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
	namespace  string
}

// NewPoliciesRepository creates a new policies repository.
func NewPoliciesRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory, namespace string) *PoliciesRepository {
	return &PoliciesRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
		namespace:  namespace,
	}
}

// ListPolicies returns all MaaSAuthPolicy resources in the configured namespace.
func (r *PoliciesRepository) ListPolicies(ctx context.Context) ([]models.MaaSAuthPolicy, error) {
	r.logger.Debug("Listing all policies", slog.String("namespace", r.namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()
	list, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(r.namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaSAuthPolicies: %w", err)
	}

	policies := make([]models.MaaSAuthPolicy, 0, len(list.Items))
	for _, item := range list.Items {
		policy, err := convertUnstructuredToAuthPolicy(&item)
		if err != nil {
			r.logger.Warn("Failed to convert MaaSAuthPolicy", slog.String("name", item.GetName()), slog.Any("error", err))
			continue
		}
		policies = append(policies, *policy)
	}

	return policies, nil
}

// GetPolicy returns a specific MaaSAuthPolicy by name.
func (r *PoliciesRepository) GetPolicy(ctx context.Context, name string) (*models.MaaSAuthPolicy, error) {
	r.logger.Debug("Getting policy", slog.String("name", name), slog.String("namespace", r.namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()
	obj, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(r.namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get MaaSAuthPolicy: %w", err)
	}

	return convertUnstructuredToAuthPolicy(obj)
}

// CreatePolicy creates a MaaSAuthPolicy resource.
func (r *PoliciesRepository) CreatePolicy(ctx context.Context, request models.CreatePolicyRequest) (*models.MaaSAuthPolicy, error) {
	r.logger.Debug("Creating policy", slog.String("name", request.Name), slog.String("namespace", r.namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	policyObj := buildAuthPolicyUnstructured(
		request.Name,
		r.namespace,
		request.DisplayName,
		request.Description,
		request.ModelRefs,
		request.Subjects.Groups,
		request.MeteringMetadata,
	)

	created, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(r.namespace).Create(ctx, policyObj, metav1.CreateOptions{})
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("%w: MaaSAuthPolicy '%s' already exists", ErrAlreadyExists, request.Name)
		}
		return nil, fmt.Errorf("failed to create MaaSAuthPolicy: %w", err)
	}

	return convertUnstructuredToAuthPolicy(created)
}

// UpdatePolicy updates an existing MaaSAuthPolicy resource.
func (r *PoliciesRepository) UpdatePolicy(ctx context.Context, name string, request models.UpdatePolicyRequest) (*models.MaaSAuthPolicy, error) {
	r.logger.Debug("Updating policy", slog.String("name", name), slog.String("namespace", r.namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()

	existingObj, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(r.namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get MaaSAuthPolicy: %w", err)
	}

	// Update annotations for displayName and description
	annotations := existingObj.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}
	if request.DisplayName != "" {
		annotations["openshift.io/display-name"] = request.DisplayName
	} else {
		delete(annotations, "openshift.io/display-name")
	}
	if request.Description != "" {
		annotations["openshift.io/description"] = request.Description
	} else {
		delete(annotations, "openshift.io/description")
	}
	existingObj.SetAnnotations(annotations)

	updateAuthPolicySpec(existingObj, request.ModelRefs, request.Subjects.Groups, request.MeteringMetadata)

	updated, err := kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(r.namespace).Update(ctx, existingObj, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update MaaSAuthPolicy: %w", err)
	}

	return convertUnstructuredToAuthPolicy(updated)
}

// DeletePolicy deletes a MaaSAuthPolicy by name.
func (r *PoliciesRepository) DeletePolicy(ctx context.Context, name string) error {
	r.logger.Debug("Deleting policy", slog.String("name", name), slog.String("namespace", r.namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	kubeClient := client.GetDynamicClient()
	err = kubeClient.Resource(constants.MaaSAuthPolicyGvr).Namespace(r.namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return fmt.Errorf("%w: MaaSAuthPolicy '%s' not found", ErrNotFound, name)
		}
		return fmt.Errorf("failed to delete MaaSAuthPolicy: %w", err)
	}

	return nil
}

// updateAuthPolicySpec updates the spec of an existing MaaSAuthPolicy unstructured object.
func updateAuthPolicySpec(obj *unstructured.Unstructured, modelRefs []models.ModelRef, groups []models.GroupReference, meteringMetadata *models.TokenMetadata) {
	mrList := make([]interface{}, len(modelRefs))
	for i, mr := range modelRefs {
		mrList[i] = map[string]interface{}{
			"name":      mr.Name,
			"namespace": mr.Namespace,
		}
	}

	groupList := make([]interface{}, len(groups))
	for i, g := range groups {
		groupList[i] = map[string]interface{}{
			"name": g.Name,
		}
	}

	// Get existing spec or create empty map
	spec, ok := obj.Object["spec"].(map[string]interface{})
	if !ok {
		spec = make(map[string]interface{})
	}

	// Merge fields instead of overwriting the entire spec
	spec["modelRefs"] = mrList
	spec["subjects"] = map[string]interface{}{
		"groups": groupList,
	}

	if meteringMetadata != nil {
		spec["meteringMetadata"] = buildTokenMetadata(meteringMetadata)
	}

	obj.Object["spec"] = spec
}
