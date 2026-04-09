package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	corev1 "k8s.io/api/core/v1"
)

// storageTypeRequiredKeys defines the required keys for each supported storage type.
// A secret must have ALL required keys for a storage type to be considered a match.
// Key matching is case-sensitive; keys must be uppercase.
var storageTypeRequiredKeys = map[string][]string{
	"s3": {
		"AWS_ACCESS_KEY_ID",
		// Region is currently not enforced by common connections ui so we need to handle it as an additionalRequiredKeys in frontend
		// "AWS_DEFAULT_REGION",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_S3_ENDPOINT",
	},
	// Future storage types can be added here:
	// "azure": {"AZURE_STORAGE_ACCOUNT", "AZURE_STORAGE_KEY"},
	// "gcp": {"GCP_SERVICE_ACCOUNT_KEY"},
}

type SecretRepository struct{}

func NewSecretRepository() *SecretRepository {
	return &SecretRepository{}
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them based on the secretType.
// secretType can be:
//   - "" (empty): return all secrets
//   - "storage": filter for secrets matching storage type requirements (e.g., S3)
func (r *SecretRepository) GetFilteredSecrets(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	identity *k8s.RequestIdentity,
	secretType string,
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
	default:
		// This should be caught by handler validation, but handle it here as well
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	// Convert to response models with type information
	// Initialize as empty slice instead of nil to ensure JSON serialization returns [] instead of null
	secretListItems := make([]models.SecretListItem, 0, len(filteredSecrets))
	for _, secret := range filteredSecrets {
		// Determine the type for this secret
		// First, check if the secret has the opendatahub.io/connection-type annotation
		var responseType string
		if annotationType, hasAnnotation := secret.Annotations["opendatahub.io/connection-type"]; hasAnnotation && annotationType != "" {
			// Use the annotation value as the type
			responseType = annotationType
		} else {
			// Fallback to key-based type detection
			switch secretType {
			case "storage":
				// For storage type, determine which storage type it matches
				responseType = getStorageType(secret)
			default:
				// For all secrets (no type filter), check if it matches a storage type
				responseType = getSecretType(secret)
			}
		}

		// Extract available keys from the secret and build map with actual/sanitized values
		availableKeys := buildAvailableKeysMap(secret)

		// Extract display name from annotation if it exists
		displayName := secret.Annotations["openshift.io/display-name"]

		// Extract description from annotation if it exists
		description := secret.Annotations["openshift.io/description"]

		secretListItems = append(secretListItems, models.NewSecretListItem(
			string(secret.UID),
			secret.Name,
			responseType,
			availableKeys,
			displayName,
			description,
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

// matchesAnyStorageType checks if a secret contains all required keys for any storage type (case-sensitive).
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
// Key matching is case-sensitive; keys must be uppercase.
func getStorageType(secret corev1.Secret) string {
	for storageType, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return storageType
		}
	}
	return ""
}

// getSecretType determines the type of a secret by checking all known secret type patterns.
// Returns the first matching storage type.
func getSecretType(secret corev1.Secret) string {
	// Check storage types
	return getStorageType(secret)
}

// hasAllKeys checks if a secret contains all specified keys in its data (case-sensitive).
func hasAllKeys(secret corev1.Secret, keys []string) bool {
	// Create a map of keys from the secret
	secretKeys := make(map[string]bool)
	for key := range secret.Data {
		secretKeys[key] = true
	}
	for key := range secret.StringData {
		secretKeys[key] = true
	}

	// Check if all required keys exist (case-sensitive)
	for _, requiredKey := range keys {
		if !secretKeys[requiredKey] {
			return false
		}
	}
	return true
}

// buildAvailableKeysMap extracts all keys from a secret's Data and StringData fields
// and builds a map where:
// - Keys in the allowed list have their actual values
// - All other keys have the value "[REDACTED]"
// Allowed-key matching is case-sensitive (via constants.IsAllowedSecretKey).
func buildAvailableKeysMap(secret corev1.Secret) map[string]string {
	result := make(map[string]string)

	// Process Data field
	for key, value := range secret.Data {
		if constants.IsAllowedSecretKey(key) {
			// Return actual value for allowed keys
			result[key] = string(value)
		} else {
			// Sanitize other keys
			result[key] = "[REDACTED]"
		}
	}

	// Process StringData field (avoiding duplicates)
	for key, value := range secret.StringData {
		if _, exists := result[key]; !exists {
			if constants.IsAllowedSecretKey(key) {
				// Return actual value for allowed keys
				result[key] = value
			} else {
				// Sanitize other keys
				result[key] = "[REDACTED]"
			}
		}
	}

	return result
}
