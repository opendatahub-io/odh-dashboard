package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
)

type SecretRepository struct{}

func NewSecretRepository() *SecretRepository {
	return &SecretRepository{}
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them for those containing the aws_access_key_id key.
// It supports pagination using limit and offset parameters.
func (r *SecretRepository) GetFilteredSecrets(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	identity *k8s.RequestIdentity,
	limit int,
	offset int,
) ([]models.SecretListItem, error) {
	// Fetch all secrets from the namespace
	secrets, err := client.GetSecrets(ctx, namespace, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	// Filter secrets that contain the aws_access_key_id key
	filteredSecrets := filterSecretsWithKey(secrets, "aws_access_key_id")

	// Apply pagination
	paginatedSecrets := paginateSecrets(filteredSecrets, limit, offset)

	// Convert to response models
	var secretListItems []models.SecretListItem
	for _, secret := range paginatedSecrets {
		secretListItems = append(secretListItems, models.NewSecretListItem(
			string(secret.UID),
			secret.Name,
		))
	}

	return secretListItems, nil
}

// filterSecretsWithKey filters secrets that have the specified key in their data field
func filterSecretsWithKey(secrets []corev1.Secret, key string) []corev1.Secret {
	var filtered []corev1.Secret
	for _, secret := range secrets {
		if _, exists := secret.Data[key]; exists {
			filtered = append(filtered, secret)
		}
	}
	return filtered
}

// paginateSecrets applies limit and offset to a slice of secrets
func paginateSecrets(secrets []corev1.Secret, limit int, offset int) []corev1.Secret {
	// If limit is 0 or negative, return all items after offset
	if limit <= 0 {
		limit = len(secrets)
	}

	// If offset is beyond the slice, return empty
	if offset >= len(secrets) {
		return []corev1.Secret{}
	}

	// Calculate end index
	end := offset + limit
	if end > len(secrets) {
		end = len(secrets)
	}

	return secrets[offset:end]
}

// GetSecretByUID retrieves a secret by its UID (for potential future use)
func (r *SecretRepository) GetSecretByUID(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	uid types.UID,
	identity *k8s.RequestIdentity,
) (*corev1.Secret, error) {
	secrets, err := client.GetSecrets(ctx, namespace, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	for _, secret := range secrets {
		if secret.UID == uid {
			return &secret, nil
		}
	}

	return nil, fmt.Errorf("secret with UID %s not found in namespace %s", uid, namespace)
}
