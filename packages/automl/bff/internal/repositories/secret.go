package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

var storageTypeRequiredKeys = map[string][]string{
	"s3": {
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_S3_ENDPOINT",
	},
}

var allowedSecretKeys = map[string]bool{
	"AWS_S3_BUCKET": true,
}

type SecretRepository struct{}

func NewSecretRepository() *SecretRepository {
	return &SecretRepository{}
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them based on secretType.
// secretType can be:
//   - "" (empty): return all secrets
//   - "storage": filter for secrets matching storage type requirements (e.g., S3)
func (r *SecretRepository) GetFilteredSecrets(
	k8sService *corek8s.K8sService,
	ctx context.Context,
	namespace string,
	secretType string,
) ([]models.SecretListItem, error) {
	secretInfos, err := k8sService.GetSecretInfos(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	var filtered []corek8s.SecretInfo
	switch secretType {
	case "":
		filtered = secretInfos
	case "storage":
		filtered = corek8s.FilterSecretInfos(secretInfos, storageTypeRequiredKeys)
	default:
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	result := make([]models.SecretListItem, 0, len(filtered))
	for _, secret := range filtered {
		responseType := corek8s.DetectSecretType(secret, storageTypeRequiredKeys)
		redactedData := corek8s.RedactSecretData(secret.Data, allowedSecretKeys)

		result = append(result, models.NewSecretListItem(
			secret.UUID,
			secret.Name,
			responseType,
			redactedData,
			secret.DisplayName,
			secret.Description,
		))
	}

	return result, nil
}
