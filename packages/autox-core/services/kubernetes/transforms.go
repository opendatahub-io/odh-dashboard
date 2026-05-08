package kubernetes

import (
	v1 "k8s.io/api/core/v1"
)

// This file contains reusable business logic and security-critical functions
// for working with Kubernetes resources. These functions are parameterized
// to give consuming packages control over configuration while centralizing
// the core logic for security and consistency.

// SecretTypeDetector detects the type of a secret based on annotation or key matching
// annotationKey: the annotation to check (e.g., "opendatahub.io/connection-type")
// typeRequirements: map of type name → required keys (e.g., "s3" → ["AWS_ACCESS_KEY_ID", ...])
//
// Returns the type name if detected, empty string otherwise
func SecretTypeDetector(secret v1.Secret, annotationKey string, typeRequirements map[string][]string) string {
	// Check for explicit annotation first
	if annotationType := secret.Annotations[annotationKey]; annotationType != "" {
		return annotationType
	}

	// Fallback to key-based detection
	for typeName, requiredKeys := range typeRequirements {
		if HasAllKeys(secret, requiredKeys) {
			return typeName
		}
	}

	return ""
}

// FilterSecretsByRequirements filters secrets that have all required keys for any configured type
// typeRequirements: map of type name → required keys
//
// Use this to filter secrets by storage type, connection type, etc.
func FilterSecretsByRequirements(secrets []v1.Secret, typeRequirements map[string][]string) []v1.Secret {
	filtered := make([]v1.Secret, 0)
	for _, secret := range secrets {
		for _, requiredKeys := range typeRequirements {
			if HasAllKeys(secret, requiredKeys) {
				filtered = append(filtered, secret)
				break // Found a match, move to next secret
			}
		}
	}
	return filtered
}

// HasAllKeys checks if a secret contains all specified keys (case-sensitive)
// This is a core utility for type detection and validation
func HasAllKeys(secret v1.Secret, keys []string) bool {
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

// BuildSanitizedSecretData creates a map of secret keys with sanitized values
// allowedKeys: map of keys that can return actual values (all others return "[REDACTED]")
//
// SECURITY-CRITICAL: Use this to prevent credential exposure in API responses
// Example allowedKeys: {"AWS_S3_ENDPOINT": true, "AWS_DEFAULT_REGION": true}
func BuildSanitizedSecretData(secret v1.Secret, allowedKeys map[string]bool) map[string]string {
	result := make(map[string]string)

	// Process Data field
	for key, value := range secret.Data {
		if allowedKeys[key] {
			result[key] = string(value)
		} else {
			result[key] = "[REDACTED]"
		}
	}

	// Process StringData field (avoid duplicates)
	for key, value := range secret.StringData {
		if _, exists := result[key]; !exists {
			if allowedKeys[key] {
				result[key] = value
			} else {
				result[key] = "[REDACTED]"
			}
		}
	}

	return result
}
