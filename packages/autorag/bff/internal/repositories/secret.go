package repositories

import (
	"context"
	"fmt"

	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
)

// storageTypeRequiredKeys defines the required keys for each supported storage type.
// A secret must have ALL required keys for a storage type to be considered a match.
var storageTypeRequiredKeys = map[string][]string{
	"s3": {
		"aws_access_key_id",
		"aws_region_name",
		"aws_secret_access_key",
		"endpoint_url",
	},
	// Future storage types can be added here:
	// "azure": {"azure_storage_account", "azure_storage_key"},
	// "gcp": {"gcp_service_account_key"},
}

type SecretRepository struct{}

func NewSecretRepository() *SecretRepository {
	return &SecretRepository{}
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them based on the secretType.
// It supports pagination using limit and offset parameters.
// secretType can be:
//   - "" (empty): return all secrets
//   - "storage": filter for secrets containing the aws_access_key_id key
//   - "lls": return empty list (placeholder for future implementation)
func (r *SecretRepository) GetFilteredSecrets(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	identity *k8s.RequestIdentity,
	secretType string,
	limit int,
	offset int,
) ([]models.SecretListItem, error) {
	// Fetch all secrets from the namespace
	secrets, err := client.GetSecrets(ctx, namespace, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	// Apply filtering based on secretType
	var filteredSecrets []corev1.Secret
	switch secretType {
	case "":
		// No type specified - return all secrets
		filteredSecrets = secrets
	case "storage":
		// Filter secrets that match any configured storage type
		filteredSecrets = filterStorageSecrets(secrets)
	case "lls":
		// Placeholder for LLS implementation - return empty list
		filteredSecrets = []corev1.Secret{}
	default:
		// This should be caught by handler validation, but handle it here as well
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	// Apply pagination
	paginatedSecrets := paginateSecrets(filteredSecrets, limit, offset)

	// Convert to response models with type information
	var secretListItems []models.SecretListItem
	for _, secret := range paginatedSecrets {
		// Determine the type for this secret
		var responseType string
		switch secretType {
		case "lls":
			responseType = "lls"
		case "storage":
			// For storage type, determine which storage type it matches
			responseType = getStorageType(secret)
		default:
			// For all secrets (no type filter), check if it matches a storage type
			responseType = getStorageType(secret)
		}

		secretListItems = append(secretListItems, models.NewSecretListItem(
			string(secret.UID),
			secret.Name,
			responseType,
		))
	}

	return secretListItems, nil
}

// filterStorageSecrets filters secrets that match any configured storage type.
// A secret matches if it contains ALL required keys for at least one storage type.
func filterStorageSecrets(secrets []corev1.Secret) []corev1.Secret {
	var filtered []corev1.Secret
	for _, secret := range secrets {
		if matchesAnyStorageType(secret) {
			filtered = append(filtered, secret)
		}
	}
	return filtered
}

// matchesAnyStorageType checks if a secret contains all required keys for any storage type.
func matchesAnyStorageType(secret corev1.Secret) bool {
	for _, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return true
		}
	}
	return false
}

// getStorageType returns the storage type name for a secret, or empty string if it doesn't match any.
// Returns the first matching storage type if the secret matches multiple types.
func getStorageType(secret corev1.Secret) string {
	for storageType, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return storageType
		}
	}
	return ""
}

// hasAllKeys checks if a secret contains all specified keys in its data.
func hasAllKeys(secret corev1.Secret, keys []string) bool {
	for _, key := range keys {
		if _, exists := secret.Data[key]; !exists {
			return false
		}
	}
	return true
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
