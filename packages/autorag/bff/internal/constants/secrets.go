package constants

// Secret key constants for allowed secret keys that can be exposed to clients.
// All other secret keys will be sanitized with "[REDACTED]".
const (
	AllowedSecretKey_AWS_S3_Bucket = "aws_s3_bucket"
)

// AllowedSecretKeys defines the keys whose actual values can be returned to the client.
// Key matching is case-insensitive.
var AllowedSecretKeys = []string{
	AllowedSecretKey_AWS_S3_Bucket,
}
