package repositories

import (
	"context"
	"fmt"

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

// GetFilteredSecrets retrieves secrets from a namespace, filters by type, and redacts sensitive data.
// Returns domain-level SecretInfo — the handler maps to the response DTO.
func (r *SecretRepository) GetFilteredSecrets(
	k8sService *corek8s.Service,
	ctx context.Context,
	namespace string,
	secretType string,
) ([]corek8s.SecretInfo, error) {
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

	for i := range filtered {
		filtered[i].Type = corek8s.DetectSecretType(filtered[i], storageTypeRequiredKeys)
		filtered[i].Data = corek8s.RedactSecretData(filtered[i].Data, allowedSecretKeys)
	}

	return filtered, nil
}
