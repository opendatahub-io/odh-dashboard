package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

var storageTypeRequiredKeys = map[string][]string{
	"s3": {
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_S3_ENDPOINT",
	},
}

var llsTypeRequiredKeys = map[string][]string{
	"lls": {
		"LLAMA_STACK_CLIENT_API_KEY",
		"LLAMA_STACK_CLIENT_BASE_URL",
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
//   - "lls": filter for secrets matching LLS (Llama Stack) requirements
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
	case "lls":
		filtered = corek8s.FilterSecretInfos(secretInfos, llsTypeRequiredKeys)
	default:
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	result := make([]models.SecretListItem, 0, len(filtered))
	for _, secret := range filtered {
		responseType := detectType(secret, secretType)
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

// detectType determines the type for a secret, checking annotation first,
// then falling back to key-based detection with LLS prioritized over storage.
func detectType(secret corek8s.SecretInfo, secretType string) string {
	if secret.Type != "" {
		return secret.Type
	}
	switch secretType {
	case "lls":
		return "lls"
	case "storage":
		return corek8s.DetectSecretType(secret, storageTypeRequiredKeys)
	default:
		if corek8s.SecretInfoHasAllKeys(secret, llsTypeRequiredKeys["lls"]) {
			return "lls"
		}
		return corek8s.DetectSecretType(secret, storageTypeRequiredKeys)
	}
}
