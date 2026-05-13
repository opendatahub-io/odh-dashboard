package repositories

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
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

// llsTypeRequiredKeys defines the required keys for LLS (Llama Stack) secrets.
// A secret must have ALL required keys to be considered an LLS secret.
// Key matching is case-sensitive; keys must be uppercase.
var llsTypeRequiredKeys = []string{
	"LLAMA_STACK_CLIENT_API_KEY",
	"LLAMA_STACK_CLIENT_BASE_URL",
}

type SecretRepository struct{}

func NewSecretRepository() *SecretRepository {
	return &SecretRepository{}
}

// GetFilteredSecrets retrieves secrets from a namespace via autox-core and filters them based on the secretType.
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
	// Fetch all secrets from the namespace via autox-core (raw, unredacted)
	secretInfos, err := k8sService.GetSecretInfos(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	// Apply filtering based on secretType
	var filteredSecrets []corek8s.SecretInfo
	switch secretType {
	case "":
		// No type specified - return all secrets
		filteredSecrets = secretInfos
	case "storage":
		// Filter secrets that match any configured storage type
		filteredSecrets = filterStorageSecrets(secretInfos)
	case "lls":
		// Filter secrets that match LLS requirements
		filteredSecrets = filterLLSSecrets(secretInfos)
	default:
		// This should be caught by handler validation, but handle it here as well
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	// Convert to response models with type information and redaction
	// Initialize as empty slice instead of nil to ensure JSON serialization returns [] instead of null
	secretListItems := make([]models.SecretListItem, 0, len(filteredSecrets))
	for _, secretInfo := range filteredSecrets {
		// Determine the type for this secret
		var responseType string
		if secretInfo.Type != "" {
			// Use the type from autox-core (from annotation)
			responseType = secretInfo.Type
		} else {
			// Fallback to key-based type detection
			switch secretType {
			case "lls":
				responseType = "lls"
			case "storage":
				// For storage type, determine which storage type it matches
				responseType = getStorageType(secretInfo)
			default:
				// For all secrets (no type filter), check if it matches a storage or LLS type
				responseType = getSecretType(secretInfo)
			}
		}

		// Apply redaction based on allowed keys
		redactedData := redactSecretKeys(secretInfo.Data)

		secretListItems = append(secretListItems, models.NewSecretListItem(
			secretInfo.UUID,
			secretInfo.Name,
			responseType,
			redactedData,
			secretInfo.DisplayName,
			secretInfo.Description,
		))
	}

	return secretListItems, nil
}

// filterStorageSecrets filters secrets that match any configured storage type.
// A secret matches if it contains ALL required keys for at least one storage type.
func filterStorageSecrets(secrets []corek8s.SecretInfo) []corek8s.SecretInfo {
	var filtered []corek8s.SecretInfo
	for _, secret := range secrets {
		if matchesAnyStorageType(secret) {
			filtered = append(filtered, secret)
		}
	}
	return filtered
}

// filterLLSSecrets filters secrets that match LLS (Llama Stack) requirements.
// A secret matches if it contains ALL required LLS keys (case-sensitive, uppercase).
func filterLLSSecrets(secrets []corek8s.SecretInfo) []corek8s.SecretInfo {
	var filtered []corek8s.SecretInfo
	for _, secret := range secrets {
		if isLLSSecret(secret) {
			filtered = append(filtered, secret)
		}
	}
	return filtered
}

// matchesAnyStorageType checks if a secret contains all required keys for any storage type (case-sensitive).
func matchesAnyStorageType(secret corek8s.SecretInfo) bool {
	for _, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return true
		}
	}
	return false
}

// isLLSSecret checks if a secret contains all required LLS keys (case-sensitive, uppercase).
func isLLSSecret(secret corek8s.SecretInfo) bool {
	return hasAllKeys(secret, llsTypeRequiredKeys)
}

// getStorageType returns the storage type name for a secret, or empty string if it doesn't match any.
// Returns the first matching storage type if the secret matches multiple types.
// Key matching is case-sensitive; keys must be uppercase.
func getStorageType(secret corek8s.SecretInfo) string {
	for storageType, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return storageType
		}
	}
	return ""
}

// getSecretType determines the type of a secret by checking all known secret type patterns.
// Returns the first matching type, prioritizing LLS over storage types.
func getSecretType(secret corek8s.SecretInfo) string {
	// Check LLS first
	if isLLSSecret(secret) {
		return "lls"
	}
	// Then check storage types
	return getStorageType(secret)
}

// hasAllKeys checks if a secret contains all specified keys in its data (case-sensitive).
func hasAllKeys(secret corek8s.SecretInfo, keys []string) bool {
	// Check if all required keys exist in the secret's Data map (case-sensitive)
	for _, requiredKey := range keys {
		if _, exists := secret.Data[requiredKey]; !exists {
			return false
		}
	}
	return true
}

// redactSecretKeys applies redaction to secret data based on allowed keys list.
// Keys in the allowed list retain their actual values, others are redacted.
func redactSecretKeys(data map[string]string) map[string]string {
	result := make(map[string]string, len(data))
	for key, value := range data {
		if constants.IsAllowedSecretKey(key) {
			// Return actual value for allowed keys
			result[key] = value
		} else {
			// Redact sensitive keys
			result[key] = "[REDACTED]"
		}
	}
	return result
}
