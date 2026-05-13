package kubernetes

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
