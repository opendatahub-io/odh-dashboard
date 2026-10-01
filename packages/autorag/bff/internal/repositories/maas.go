package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

var ErrMaaSCredentialValidation = errors.New("MaaS credential validation failed")

type MaaSRepository struct {
	maasClient maas.MaaSClientInterface
	k8sService kubernetes.Service
	logger     *slog.Logger
}

func NewMaaSRepository(logger *slog.Logger, maasClient maas.MaaSClientInterface, k8sService kubernetes.Service) *MaaSRepository {
	return &MaaSRepository{maasClient: maasClient, k8sService: k8sService, logger: logger}
}

func (r *MaaSRepository) GetMaaSModels(ctx context.Context, namespace, secretName string) (*models.MaaSModelsData, error) {
	secret, err := r.k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return nil, fmt.Errorf("failed to get secret %q: %w", secretName, err)
	}
	if secret == nil {
		return nil, fmt.Errorf("secret %q not found in namespace %q", secretName, namespace)
	}

	baseURL := strings.TrimSpace(string(secret.Data["MAAS_BASE_URL"]))
	apiKey := strings.TrimSpace(string(secret.Data["MAAS_API_KEY"]))
	if baseURL == "" || apiKey == "" {
		return nil, fmt.Errorf("secret %q must contain non-empty MAAS_BASE_URL and MAAS_API_KEY: %w", secretName, ErrMaaSCredentialValidation)
	}

	nativeModels, err := r.maasClient.ListModels(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaS models: %w", err)
	}

	result := make([]models.MaaSModel, 0, len(nativeModels))
	for _, native := range nativeModels {
		if native.ID == "" {
			r.logger.Warn("skipping MaaS model with empty ID")
			continue
		}

		model := models.MaaSModel{
			ID:      native.ID,
			OwnedBy: native.OwnedBy,
			Ready:   native.Ready,
		}
		if native.ModelDetails != nil {
			model.DisplayName = native.ModelDetails.DisplayName
			model.Description = native.ModelDetails.Description
		}
		result = append(result, model)
	}

	return &models.MaaSModelsData{Models: result}, nil
}
