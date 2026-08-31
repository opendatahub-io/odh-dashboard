package repositories

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

type SecretsRepository struct {
	logger     *slog.Logger
	k8sFactory kubernetes.KubernetesClientFactory
}

func NewSecretsRepository(
	logger *slog.Logger,
	k8sFactory kubernetes.KubernetesClientFactory,
) *SecretsRepository {
	return &SecretsRepository{logger: logger, k8sFactory: k8sFactory}
}

func (r *SecretsRepository) ListSecrets(_ context.Context, _ string) ([]models.SecretSummary, error) {
	return nil, fmt.Errorf("not implemented")
}

func (r *SecretsRepository) CreateSecret(
	_ context.Context,
	_ models.CreateSecretRequest,
) (*models.CreateSecretResponse, error) {
	return nil, fmt.Errorf("not implemented")
}
