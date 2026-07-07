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

// ExternalProvidersRepository handles ExternalProvider operations via the Kubernetes API.
type ExternalProvidersRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

// NewExternalProvidersRepository creates a new ExternalProvider repository.
func NewExternalProvidersRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory) *ExternalProvidersRepository {
	return &ExternalProvidersRepository{
		logger:     logger,
		k8sFactory: k8sFactory,
	}
}

// ListExternalProviders returns ExternalProvider resources in a namespace.
func (r *ExternalProvidersRepository) ListExternalProviders(ctx context.Context, namespace string) ([]models.ExternalProviderSummary, error) {
	r.logger.Debug("Listing ExternalProviders", slog.String("namespace", namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	list, err := client.GetDynamicClient().Resource(constants.ExternalProviderGvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ExternalProviders: %w", err)
	}

	summaries := make([]models.ExternalProviderSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summaries = append(summaries, *convertUnstructuredToExternalProviderSummary(&item))
	}
	return summaries, nil
}

// CreateExternalProvider creates an ExternalProvider resource.
func (r *ExternalProvidersRepository) CreateExternalProvider(ctx context.Context, request models.CreateExternalProviderRequest) (*models.ExternalProviderSummary, error) {
	r.logger.Debug("Creating ExternalProvider", slog.String("name", request.Name), slog.String("namespace", request.Namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	obj := buildExternalProviderUnstructured(request)
	created, err := client.GetDynamicClient().Resource(constants.ExternalProviderGvr).Namespace(request.Namespace).Create(ctx, obj, metav1.CreateOptions{})
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("ExternalProvider '%s' already exists", request.Name)
		}
		return nil, fmt.Errorf("failed to create ExternalProvider: %w", err)
	}

	return convertUnstructuredToExternalProviderSummary(created), nil
}

// UpdateExternalProvider updates an ExternalProvider resource.
func (r *ExternalProvidersRepository) UpdateExternalProvider(ctx context.Context, namespace, name string, request models.UpdateExternalProviderRequest) (*models.ExternalProviderSummary, error) {
	r.logger.Debug("Updating ExternalProvider", slog.String("namespace", namespace), slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()
	existing, err := kubeClient.Resource(constants.ExternalProviderGvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return nil, fmt.Errorf("ExternalProvider '%s' not found", name)
		}
		return nil, fmt.Errorf("failed to get ExternalProvider: %w", err)
	}

	existingSpec, _, _ := unstructured.NestedMap(existing.Object, "spec")
	if existingSpec == nil {
		existingSpec = map[string]interface{}{}
	}

	if request.EndpointUrl != "" {
		existingSpec["endpoint"] = normalizeEndpointURL(request.EndpointUrl)
	}
	if request.AuthMechanism != nil || request.CredentialSecretRef != "" {
		auth, _, _ := unstructured.NestedMap(existingSpec, "auth")
		if auth == nil {
			auth = map[string]interface{}{}
		}
		if request.AuthMechanism != nil {
			auth["type"] = authMechanismToCRD(*request.AuthMechanism)
		}
		if request.CredentialSecretRef != "" {
			auth["secretRef"] = map[string]interface{}{
				"name": request.CredentialSecretRef,
			}
		}
		existingSpec["auth"] = auth
	}
	if request.Config != nil {
		if len(request.Config) == 0 {
			delete(existingSpec, "config")
		} else {
			existingSpec["config"] = stringMapToUnstructured(request.Config)
		}
	}
	existing.Object["spec"] = existingSpec
	existing.SetAnnotations(applyOptionalDisplayAnnotations(existing.GetAnnotations(), request.DisplayName, request.Description))

	updated, err := kubeClient.Resource(constants.ExternalProviderGvr).Namespace(namespace).Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update ExternalProvider: %w", err)
	}

	return convertUnstructuredToExternalProviderSummary(updated), nil
}

// DeleteExternalProvider deletes an ExternalProvider resource.
func (r *ExternalProvidersRepository) DeleteExternalProvider(ctx context.Context, namespace, name string) error {
	r.logger.Debug("Deleting ExternalProvider", slog.String("namespace", namespace), slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	err = client.GetDynamicClient().Resource(constants.ExternalProviderGvr).Namespace(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return fmt.Errorf("ExternalProvider '%s' not found", name)
		}
		return fmt.Errorf("failed to delete ExternalProvider: %w", err)
	}
	return nil
}
