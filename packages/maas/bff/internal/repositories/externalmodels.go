package repositories

import (
	"context"
	"fmt"
	"log/slog"

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

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
func NewExternalModelsRepository(logger *slog.Logger, k8sFactory kubernetes.KubernetesClientFactory, modelRefsRepo MaaSModelRefsRepositoryInterface) *ExternalModelsRepository {
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
			return fmt.Errorf("ExternalModel '%s' not found: %w", name, err)
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
