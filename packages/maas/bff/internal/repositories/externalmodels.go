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

// ExternalModelsRepository handles ExternalModel operations via the Kubernetes API.
type ExternalModelsRepository struct {
	logger        *slog.Logger
	k8sFactory    kubernetes.KubernetesClientFactory
	modelRefsRepo MaaSModelRefsRepositoryInterface
}

// NewExternalModelsRepository creates a new ExternalModel repository.
func NewExternalModelsRepository(
	logger *slog.Logger,
	k8sFactory kubernetes.KubernetesClientFactory,
	modelRefsRepo MaaSModelRefsRepositoryInterface,
) *ExternalModelsRepository {
	return &ExternalModelsRepository{
		logger:        logger,
		k8sFactory:    k8sFactory,
		modelRefsRepo: modelRefsRepo,
	}
}

// ListExternalModels returns ExternalModel resources in a namespace.
func (r *ExternalModelsRepository) ListExternalModels(ctx context.Context, namespace string) ([]models.ExternalModelSummary, error) {
	r.logger.Debug("Listing ExternalModels", slog.String("namespace", namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	list, err := client.GetDynamicClient().Resource(constants.ExternalModelGvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list ExternalModels: %w", err)
	}

	summaries := make([]models.ExternalModelSummary, 0, len(list.Items))
	for _, item := range list.Items {
		summaries = append(summaries, *convertUnstructuredToExternalModelSummary(&item))
	}

	kubeClient := client.GetDynamicClient()
	providers, err := listExternalProviderSummariesInNamespace(ctx, kubeClient, namespace)
	if err != nil {
		return nil, err
	}

	modelRefs, err := listModelRefSummariesInNamespace(ctx, kubeClient, namespace)
	if err != nil {
		return nil, err
	}

	return enrichExternalModelSummaries(
		summaries,
		buildExternalProviderSummaryIndex(providers),
		buildModelRefSummaryIndex(modelRefs),
	), nil
}

// CreateExternalModel creates an ExternalModel resource and its companion MaaSModelRef.
func (r *ExternalModelsRepository) CreateExternalModel(ctx context.Context, request models.CreateExternalModelRequest) (*models.ExternalModelSummary, error) {
	r.logger.Debug("Creating ExternalModel", slog.String("name", request.Name), slog.String("namespace", request.Namespace))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	obj := buildExternalModelUnstructured(request)
	created, err := client.GetDynamicClient().Resource(constants.ExternalModelGvr).Namespace(request.Namespace).Create(ctx, obj, metav1.CreateOptions{})
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			return nil, fmt.Errorf("%w: ExternalModel '%s' already exists", ErrAlreadyExists, request.Name)
		}
		return nil, fmt.Errorf("failed to create ExternalModel: %w", err)
	}

	if err := r.createMaaSModelRefForExternalModel(ctx, request, string(created.GetUID())); err != nil {
		if delErr := client.GetDynamicClient().
			Resource(constants.ExternalModelGvr).
			Namespace(request.Namespace).
			Delete(ctx, request.Name, metav1.DeleteOptions{}); delErr != nil {
			r.logger.Error(
				"failed to rollback ExternalModel creation after MaaSModelRef failure",
				slog.String("namespace", request.Namespace),
				slog.String("name", request.Name),
				slog.Any("err", delErr),
			)
		}
		return nil, fmt.Errorf("failed to create MaaSModelRef for ExternalModel: %w", err)
	}

	return convertUnstructuredToExternalModelSummary(created), nil
}

// UpdateExternalModel updates an ExternalModel resource and its companion MaaSModelRef.
func (r *ExternalModelsRepository) UpdateExternalModel(ctx context.Context, namespace, name string, request models.UpdateExternalModelRequest) (*models.ExternalModelSummary, error) {
	r.logger.Debug("Updating ExternalModel", slog.String("namespace", namespace), slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}

	kubeClient := client.GetDynamicClient()
	existing, err := kubeClient.Resource(constants.ExternalModelGvr).Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return nil, fmt.Errorf("%w: ExternalModel '%s' not found", ErrNotFound, name)
		}
		return nil, fmt.Errorf("failed to get ExternalModel: %w", err)
	}

	existingSpec, _, _ := unstructured.NestedMap(existing.Object, "spec")
	if existingSpec == nil {
		existingSpec = map[string]interface{}{}
	}
	if request.ModelName != "" {
		existingSpec["modelName"] = request.ModelName
	}
	if len(request.ProviderRefs) > 0 {
		existingSpec["externalProviderRefs"] = buildExternalProviderRefs(request.ProviderRefs)
	}
	existing.Object["spec"] = existingSpec
	existing.SetAnnotations(applyDisplayAnnotations(existing.GetAnnotations(), request.DisplayName, request.Description))

	updated, err := kubeClient.Resource(constants.ExternalModelGvr).Namespace(namespace).Update(ctx, existing, metav1.UpdateOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to update ExternalModel: %w", err)
	}

	if err := r.syncMaaSModelRefOnUpdate(ctx, namespace, name, request, string(updated.GetUID())); err != nil {
		r.logger.Warn(
			"failed to sync MaaSModelRef for ExternalModel",
			slog.String("namespace", namespace),
			slog.String("name", name),
			slog.Any("err", err),
		)
	}

	return convertUnstructuredToExternalModelSummary(updated), nil
}

// DeleteExternalModel deletes an ExternalModel resource and its companion MaaSModelRef.
func (r *ExternalModelsRepository) DeleteExternalModel(ctx context.Context, namespace, name string) error {
	r.logger.Debug("Deleting ExternalModel", slog.String("namespace", namespace), slog.String("name", name))

	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return err
	}

	err = client.GetDynamicClient().Resource(constants.ExternalModelGvr).Namespace(namespace).Delete(ctx, name, metav1.DeleteOptions{})
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			return fmt.Errorf("%w: ExternalModel '%s' not found", ErrNotFound, name)
		}
		return fmt.Errorf("failed to delete ExternalModel: %w", err)
	}

	if err := r.deleteMaaSModelRefForExternalModel(ctx, namespace, name); err != nil {
		return fmt.Errorf("failed to delete MaaSModelRef for ExternalModel: %w", err)
	}
	return nil
}

func (r *ExternalModelsRepository) deleteMaaSModelRefForExternalModel(ctx context.Context, namespace, name string) error {
	err := r.modelRefsRepo.DeleteMaaSModelRef(ctx, namespace, name, false)
	if k8sErrors.IsNotFound(err) {
		return nil
	}
	return err
}
