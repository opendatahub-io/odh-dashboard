package constants

// Secret key constants for allowed secret keys that can be exposed to clients.
// All other secret keys will be sanitized with "[REDACTED]".
// Keys must be uppercase.
const (
	AllowedSecretKey_AWS_S3_Bucket = "AWS_S3_BUCKET"
)

// allowedSecretKeys defines the keys whose actual values can be returned to the client.
// This slice is unexported to prevent external modification.
// Use IsAllowedSecretKey() to check if a key is allowed.
var allowedSecretKeys = []string{
	AllowedSecretKey_AWS_S3_Bucket,
}

// IsAllowedSecretKey checks if a given key is in the allowed list.
// Key matching is case-sensitive; keys must be uppercase.
func IsAllowedSecretKey(key string) bool {
	for _, allowedKey := range allowedSecretKeys {
		if allowedKey == key {
			return true
		}
	}
	return false
}
