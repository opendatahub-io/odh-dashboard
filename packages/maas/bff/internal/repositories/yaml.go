package repositories

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	kyaml "sigs.k8s.io/yaml"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// YamlRepositoryInterface defines the contract for YAML export operations.
type YamlRepositoryInterface interface {
	GetYaml(ctx context.Context, name, resourceType string) (string, error)
}

// YamlRepository handles YAML operations via the Kubernetes API.
type YamlRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
	namespace  string
}

// NewYamlRepository creates a new YAML repository.
func NewYamlRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory, namespace string) *YamlRepository {
	return &YamlRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
		namespace:  namespace,
	}
}

// GetYaml returns the YAML for a given resource name and type.
func (r *YamlRepository) GetYaml(ctx context.Context, name, resourceType string) (string, error) {
	r.logger.Debug("Getting YAML for resource", slog.String("name", name), slog.String("resourceType", resourceType))

	gvr, err := yamlResourceTypeToGVR(resourceType)
	if err != nil {
		return "", err
	}

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return "", err
	}

	kubeClient := client.GetDynamicClient()
	resource, err := kubeClient.Resource(gvr).Namespace(r.namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return "", fmt.Errorf("%w: %s", ErrNotFound, name)
		}
		return "", fmt.Errorf("failed to get resource: %w", err)
	}

	return unstructuredToYAML(resource)
}

func yamlResourceTypeToGVR(resourceType string) (schema.GroupVersionResource, error) {
	switch resourceType {
	case constants.YamlResourceTypeSubscription:
		return constants.MaaSSubscriptionGvr, nil
	case constants.YamlResourceTypeAuthorizationPolicy:
		return constants.MaaSAuthPolicyGvr, nil
	default:
		return schema.GroupVersionResource{}, fmt.Errorf("%w: must be %q or %q", ErrInvalidResourceType, constants.YamlResourceTypeSubscription, constants.YamlResourceTypeAuthorizationPolicy)
	}
}

func unstructuredToYAML(obj *unstructured.Unstructured) (string, error) {
	clean := sanitizeResourceForYAML(obj)
	yamlBytes, err := kyaml.Marshal(clean.Object)
	if err != nil {
		return "", fmt.Errorf("failed to marshal resource to YAML: %w", err)
	}
	return string(yamlBytes), nil
}

func setResourceStatus(obj *unstructured.Unstructured, phase, statusMessage string) {
	status := map[string]interface{}{}
	if phase != "" {
		status["phase"] = phase
	}
	if statusMessage != "" {
		status["conditions"] = []interface{}{
			map[string]interface{}{
				"type":    "Ready",
				"status":  "True",
				"message": statusMessage,
			},
		}
	}
	if len(status) > 0 {
		obj.Object["status"] = status
	}
}

func subscriptionModelToUnstructured(sub models.MaaSSubscription) *unstructured.Unstructured {
	obj := buildSubscriptionUnstructured(
		sub.Name,
		sub.Namespace,
		sub.DisplayName,
		sub.Description,
		sub.Owner,
		sub.ModelRefs,
		sub.TokenMetadata,
		sub.Priority,
	)
	setResourceStatus(obj, sub.Phase, sub.StatusMessage)
	setModelTimestamps(obj, sub.CreationTimestamp, sub.DeletionTimestamp)
	return obj
}

func authPolicyModelToUnstructured(policy models.MaaSAuthPolicy) *unstructured.Unstructured {
	obj := buildAuthPolicyUnstructured(
		policy.Name,
		policy.Namespace,
		policy.DisplayName,
		policy.Description,
		policy.ModelRefs,
		policy.Subjects.Groups,
		policy.MeteringMetadata,
	)
	setResourceStatus(obj, policy.Phase, policy.StatusMessage)
	setModelTimestamps(obj, policy.CreationTimestamp, policy.DeletionTimestamp)
	return obj
}

func setModelTimestamps(obj *unstructured.Unstructured, creationTimestamp, deletionTimestamp *time.Time) {
	if creationTimestamp != nil {
		obj.SetCreationTimestamp(metav1.NewTime(*creationTimestamp))
	}
	if deletionTimestamp != nil {
		obj.SetDeletionTimestamp(&metav1.Time{Time: *deletionTimestamp})
	}
}

func sanitizeResourceForYAML(obj *unstructured.Unstructured) *unstructured.Unstructured {
	clean := obj.DeepCopy()
	clean.SetManagedFields(nil)
	clean.SetResourceVersion("")
	clean.SetUID("")
	clean.SetGeneration(0)
	clean.SetOwnerReferences(nil)

	if metadata, ok := clean.Object["metadata"].(map[string]interface{}); ok {
		delete(metadata, "managedFields")
		delete(metadata, "resourceVersion")
		delete(metadata, "uid")
		delete(metadata, "generation")
		delete(metadata, "ownerReferences")
		delete(metadata, "selfLink")
		delete(metadata, "creationTimestamp")
		delete(metadata, "finalizers")
		if annotations, ok := metadata["annotations"].(map[string]interface{}); ok {
			delete(annotations, "kubectl.kubernetes.io/last-applied-configuration")
			if len(annotations) == 0 {
				delete(metadata, "annotations")
			}
		}
	}
	delete(clean.Object, "status")

	return clean
}
