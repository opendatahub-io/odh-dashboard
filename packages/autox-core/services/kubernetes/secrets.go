package kubernetes

import (
	"context"
	"fmt"
	"strings"

	v1 "k8s.io/api/core/v1"
)

// storageTypeRequiredKeys defines the required keys for each supported storage type.
// A secret must have ALL required keys for a storage type to be considered a match.
// Key matching is case-sensitive; keys must be uppercase.
var storageTypeRequiredKeys = map[string][]string{
	"s3": {
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_S3_ENDPOINT",
	},
}

// allowedSecretKeys lists secret keys that should not be redacted
var allowedSecretKeys = map[string]bool{
	"AWS_S3_BUCKET":       true,
	"AWS_S3_ENDPOINT":     true,
	"AWS_DEFAULT_REGION":  true,
	"AWS_SAGEMAKER_ROLE":  true,
	"endpoint":            true,
	"host":                true,
	"port":                true,
	"region":              true,
	"defaultRegion":       true,
	"bucket":              true,
	"type":                true,
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them based on secretType
func (s *K8sService) GetFilteredSecrets(
	ctx context.Context,
	identity *RequestIdentity,
	namespace string,
	secretType string,
) ([]SecretInfo, error) {
	s.Logger.Info("fetching filtered secrets", "namespace", namespace, "type", secretType, "user", identity.UserID)

	// Validate namespace name
	if err := ValidateNamespaceName(namespace); err != nil {
		s.Logger.Error("invalid namespace name", "error", err)
		return nil, err
	}

	// Fetch all secrets from the namespace
	secrets, err := s.Client.GetSecrets(ctx, identity, namespace)
	if err != nil {
		s.Logger.Error("failed to get secrets", "namespace", namespace, "error", err)
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	// Apply filtering based on secretType
	var filteredSecrets []v1.Secret
	switch secretType {
	case "":
		// No type specified - return all secrets
		filteredSecrets = secrets
	case "storage":
		// Filter secrets that match any configured storage type
		filteredSecrets = filterStorageSecrets(secrets)
	default:
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	// Convert to SecretInfo with type information
	secretInfos := make([]SecretInfo, 0, len(filteredSecrets))
	for _, secret := range filteredSecrets {
		// Determine the type for this secret
		var responseType string
		if annotationType, hasAnnotation := secret.Annotations["opendatahub.io/connection-type"]; hasAnnotation && annotationType != "" {
			responseType = annotationType
		} else {
			// Fallback to key-based type detection
			switch secretType {
			case "storage":
				responseType = getStorageType(secret)
			default:
				responseType = getSecretType(secret)
			}
		}

		// Extract available keys with redaction
		availableKeys := buildAvailableKeysMap(secret)

		// Extract metadata
		displayName := secret.Annotations["openshift.io/display-name"]
		description := secret.Annotations["openshift.io/description"]

		secretInfos = append(secretInfos, SecretInfo{
			UUID:        string(secret.UID),
			Name:        secret.Name,
			Type:        responseType,
			Data:        availableKeys,
			DisplayName: displayName,
			Description: description,
		})
	}

	return secretInfos, nil
}

// filterStorageSecrets filters secrets that match any configured storage type
func filterStorageSecrets(secrets []v1.Secret) []v1.Secret {
	var filtered []v1.Secret
	for _, secret := range secrets {
		if matchesAnyStorageType(secret) {
			filtered = append(filtered, secret)
		}
	}
	return filtered
}

// matchesAnyStorageType checks if a secret contains all required keys for any storage type
func matchesAnyStorageType(secret v1.Secret) bool {
	for _, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return true
		}
	}
	return false
}

// getStorageType returns the storage type name for a secret, or empty string if it doesn't match any
func getStorageType(secret v1.Secret) string {
	for storageType, requiredKeys := range storageTypeRequiredKeys {
		if hasAllKeys(secret, requiredKeys) {
			return storageType
		}
	}
	return ""
}

// getSecretType determines the type of a secret by checking all known secret type patterns
func getSecretType(secret v1.Secret) string {
	return getStorageType(secret)
}

// hasAllKeys checks if a secret contains all specified keys (case-sensitive)
func hasAllKeys(secret v1.Secret, keys []string) bool {
	secretKeys := make(map[string]bool)
	for key := range secret.Data {
		secretKeys[key] = true
	}
	for key := range secret.StringData {
		secretKeys[key] = true
	}

	for _, requiredKey := range keys {
		if !secretKeys[requiredKey] {
			return false
		}
	}
	return true
}

// buildAvailableKeysMap extracts all keys from a secret's Data and StringData fields
// and builds a map where allowed keys have their actual values and others are redacted
func buildAvailableKeysMap(secret v1.Secret) map[string]string {
	result := make(map[string]string)

	// Process Data field
	for key, value := range secret.Data {
		if isAllowedSecretKey(key) {
			result[key] = string(value)
		} else {
			result[key] = "[REDACTED]"
		}
	}

	// Process StringData field (avoiding duplicates)
	for key, value := range secret.StringData {
		if _, exists := result[key]; !exists {
			if isAllowedSecretKey(key) {
				result[key] = value
			} else {
				result[key] = "[REDACTED]"
			}
		}
	}

	return result
}

// isAllowedSecretKey checks if a secret key should not be redacted
func isAllowedSecretKey(key string) bool {
	// Case-insensitive check
	lowerKey := strings.ToLower(key)
	_, allowed := allowedSecretKeys[lowerKey]
	if allowed {
		return true
	}

	// Also check original key
	_, allowed = allowedSecretKeys[key]
	return allowed
}
