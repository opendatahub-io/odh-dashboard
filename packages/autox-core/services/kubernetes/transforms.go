package kubernetes

import (
	"fmt"
	"strings"

	v1 "k8s.io/api/core/v1"
)

// buildKeysMap extracts all keys from a secret's Data and StringData fields
// and returns them as string values without redaction.
func buildKeysMap(secret v1.Secret) map[string]string {
	result := make(map[string]string)
	for key, value := range secret.Data {
		result[key] = string(value)
	}
	for key, value := range secret.StringData {
		if _, exists := result[key]; !exists {
			result[key] = value
		}
	}
	return result
}

// extractServiceAccountName extracts the service account name from a Kubernetes username.
// If the username is a service account (format: system:serviceaccount:namespace:name),
// it returns just the service account name. Otherwise, it returns the full username.
func mapNamespacesToInfos(namespaces []v1.Namespace) []NamespaceInfo {
	infos := make([]NamespaceInfo, 0, len(namespaces))
	for _, ns := range namespaces {
		displayName := ns.Name
		if dn := ns.Annotations["openshift.io/display-name"]; dn != "" {
			displayName = dn
		}
		infos = append(infos, NamespaceInfo{
			Name:        ns.Name,
			DisplayName: displayName,
		})
	}
	return infos
}

func extractServiceAccountName(username string) string {
	const saPrefix = "system:serviceaccount:"
	if len(username) > len(saPrefix) && username[:len(saPrefix)] == saPrefix {
		parts := strings.SplitN(username[len(saPrefix):], ":", 2)
		if len(parts) == 2 {
			return parts[1]
		}
	}
	return username
}

// LookupSecretValue performs a case-insensitive lookup against Kubernetes secret data.
//
// Lookup order:
//  1. Exact-case match (highest priority).
//  2. Single case-insensitive variant.
//  3. ErrAmbiguousSecretKey if multiple case-variants collide.
//
// Multiple candidate key names can be provided; they are tried in order — useful
// for vendor aliases (e.g. "accessKey" vs "AWS_ACCESS_KEY_ID").
//
// Returns ("", nil) if none of the keys are found.
func LookupSecretValue(data map[string][]byte, keys ...string) (string, error) {
	type entry struct {
		originalKey string
		value       string
	}
	normalized := make(map[string][]entry, len(data))
	for k, v := range data {
		lower := strings.ToLower(k)
		normalized[lower] = append(normalized[lower], entry{originalKey: k, value: string(v)})
	}

	for _, targetKey := range keys {
		if val, ok := data[targetKey]; ok {
			return string(val), nil
		}

		lower := strings.ToLower(targetKey)
		entries, ok := normalized[lower]
		if !ok || len(entries) == 0 {
			continue
		}

		if len(entries) == 1 {
			return entries[0].value, nil
		}

		originals := make([]string, len(entries))
		for i, e := range entries {
			originals[i] = e.originalKey
		}
		return "", fmt.Errorf("%w %q: multiple case-variants found: %v", ErrAmbiguousSecretKey, targetKey, originals)
	}

	return "", nil
}

// SecretInfoHasAllKeys checks if a SecretInfo contains all specified keys (case-sensitive).
func SecretInfoHasAllKeys(secret SecretInfo, keys []string) bool {
	for _, key := range keys {
		if _, exists := secret.Data[key]; !exists {
			return false
		}
	}
	return true
}

// FilterSecretInfos returns secrets that have all required keys for at least one
// entry in typeRequirements (type name → required keys).
func FilterSecretInfos(secrets []SecretInfo, typeRequirements map[string][]string) []SecretInfo {
	filtered := make([]SecretInfo, 0)
	for _, secret := range secrets {
		for _, requiredKeys := range typeRequirements {
			if SecretInfoHasAllKeys(secret, requiredKeys) {
				filtered = append(filtered, secret)
				break
			}
		}
	}
	return filtered
}

// DetectSecretType returns the type name for a secret by checking its annotation-based
// type first, then falling back to key-based matching against typeRequirements.
func DetectSecretType(secret SecretInfo, typeRequirements map[string][]string) string {
	if secret.Type != "" {
		return secret.Type
	}
	for typeName, requiredKeys := range typeRequirements {
		if SecretInfoHasAllKeys(secret, requiredKeys) {
			return typeName
		}
	}
	return ""
}

// RedactSecretData returns a copy of the data map with all keys not in the
// allowed set replaced by "[REDACTED]".
func RedactSecretData(data map[string]string, allowedKeys map[string]bool) map[string]string {
	result := make(map[string]string, len(data))
	for key, value := range data {
		if allowedKeys[key] {
			result[key] = value
		} else {
			result[key] = "[REDACTED]"
		}
	}
	return result
}
