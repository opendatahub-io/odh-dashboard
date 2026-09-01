package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type ExternalProvidersRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

func NewExternalProvidersRepository(
	logger *slog.Logger,
	k8sFactory kubernetes.KubernetesClientFactory,
) *ExternalProvidersRepository {
	return &ExternalProvidersRepository{logger: logger, k8sFactory: k8sFactory}
}

func (r *ExternalProvidersRepository) ListExternalProviders(
	ctx context.Context,
	namespace string,
) ([]models.ExternalProviderSummary, error) {
	client, err := r.k8sFactory.GetClient(ctx)
	if err != nil {
		return nil, err
	}
	return listExternalProviderSummariesInNamespace(ctx, client.GetDynamicClient(), namespace)
}

func (r *ExternalProvidersRepository) CreateExternalProvider(
	_ context.Context,
	_ models.CreateExternalProviderRequest,
) (*models.ExternalProviderSummary, error) {
	return nil, fmt.Errorf("not implemented")
}

func (r *ExternalProvidersRepository) UpdateExternalProvider(
	_ context.Context,
	_, _ string,
	_ models.UpdateExternalProviderRequest,
) (*models.ExternalProviderSummary, error) {
	return nil, fmt.Errorf("not implemented")
}

func (r *ExternalProvidersRepository) DeleteExternalProvider(_ context.Context, _, _ string) error {
	return fmt.Errorf("not implemented")
}
