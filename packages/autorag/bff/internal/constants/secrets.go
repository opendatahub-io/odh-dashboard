package constants

import "strings"

// Secret key constants for allowed secret keys that can be exposed to clients.
// All other secret keys will be sanitized with "[REDACTED]".
const (
	AllowedSecretKey_AWS_S3_Bucket = "aws_s3_bucket"
)

// allowedSecretKeys defines the keys whose actual values can be returned to the client.
// This slice is unexported to prevent external modification.
// Use IsAllowedSecretKey() to check if a key is allowed.
var allowedSecretKeys = []string{
	AllowedSecretKey_AWS_S3_Bucket,
}

// IsAllowedSecretKey checks if a given key is in the allowed list.
// Key matching is case-insensitive.
func IsAllowedSecretKey(key string) bool {
	keyLower := strings.ToLower(key)
	for _, allowedKey := range allowedSecretKeys {
		if strings.ToLower(allowedKey) == keyLower {
			return true
		}
	}
	return false
}
