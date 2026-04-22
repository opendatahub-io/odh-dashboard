package repositories

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// TestBuildAvailableKeysMap_AllowsAWS_S3_BUCKET tests that only the uppercase AWS_S3_BUCKET key
// is exposed with its actual value, while all other keys are sanitized.
func TestBuildAvailableKeysMap_AllowsAWS_S3_BUCKET(t *testing.T) {
	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-secret",
			Namespace: "test-namespace",
		},
		Data: map[string][]byte{
			"AWS_S3_BUCKET":         []byte("my-bucket"),
			"AWS_ACCESS_KEY_ID":     []byte("AKIAIOSFODNN7EXAMPLE"),
			"AWS_SECRET_ACCESS_KEY": []byte("wJalrXUtnFEMI/K7MDENG"),
			"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		},
	}

	result := buildAvailableKeysMap(secret)

	// AWS_S3_BUCKET should have actual value
	assert.Equal(t, "my-bucket", result["AWS_S3_BUCKET"], "AWS_S3_BUCKET should return actual value")

	// All other keys should be redacted
	assert.Equal(t, "[REDACTED]", result["AWS_ACCESS_KEY_ID"], "AWS_ACCESS_KEY_ID should be redacted")
	assert.Equal(t, "[REDACTED]", result["AWS_SECRET_ACCESS_KEY"], "AWS_SECRET_ACCESS_KEY should be redacted")
	assert.Equal(t, "[REDACTED]", result["AWS_DEFAULT_REGION"], "AWS_DEFAULT_REGION should be redacted")
}

// TestBuildAvailableKeysMap_CaseSensitive tests that only the exact uppercase AWS_S3_BUCKET
// is allowed, and lowercase or mixed-case variants are redacted.
func TestBuildAvailableKeysMap_CaseSensitive(t *testing.T) {
	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "mixed-case-secret",
			Namespace: "test-namespace",
		},
		Data: map[string][]byte{
			"AWS_S3_BUCKET": []byte("actual-bucket"),     // Canonical uppercase - allowed
			"aws_s3_bucket": []byte("lowercase-bucket"),  // Lowercase variant - should be redacted
			"Aws_S3_Bucket": []byte("mixed-case-bucket"), // Mixed case variant - should be redacted
		},
	}

	result := buildAvailableKeysMap(secret)

	// Only uppercase AWS_S3_BUCKET should have actual value
	assert.Equal(t, "actual-bucket", result["AWS_S3_BUCKET"], "Uppercase AWS_S3_BUCKET should return actual value")

	// Lowercase and mixed-case variants should be redacted
	assert.Equal(t, "[REDACTED]", result["aws_s3_bucket"], "Lowercase aws_s3_bucket should be redacted")
	assert.Equal(t, "[REDACTED]", result["Aws_S3_Bucket"], "Mixed-case Aws_S3_Bucket should be redacted")
}

// TestBuildAvailableKeysMap_AllKeysRedacted tests that when no allowed keys are present,
// all keys are redacted.
func TestBuildAvailableKeysMap_AllKeysRedacted(t *testing.T) {
	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "lls-secret",
			Namespace: "test-namespace",
		},
		Data: map[string][]byte{
			"LLAMA_STACK_CLIENT_API_KEY":  []byte("sk-1234567890"),
			"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
			"password":                    []byte("SuperSecret123"),
		},
	}

	result := buildAvailableKeysMap(secret)

	// All keys should be redacted since none match the allowed list
	assert.Equal(t, "[REDACTED]", result["LLAMA_STACK_CLIENT_API_KEY"], "API key should be redacted")
	assert.Equal(t, "[REDACTED]", result["LLAMA_STACK_CLIENT_BASE_URL"], "Base URL should be redacted")
	assert.Equal(t, "[REDACTED]", result["password"], "Password should be redacted")
}

// TestBuildAvailableKeysMap_EmptySecret tests that an empty secret returns an empty map.
func TestBuildAvailableKeysMap_EmptySecret(t *testing.T) {
	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "empty-secret",
			Namespace: "test-namespace",
		},
		Data: map[string][]byte{},
	}

	result := buildAvailableKeysMap(secret)

	assert.Empty(t, result, "Empty secret should return empty map")
}

// TestBuildAvailableKeysMap_StringDataField tests that keys from StringData field
// are also properly sanitized.
func TestBuildAvailableKeysMap_StringDataField(t *testing.T) {
	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "string-data-secret",
			Namespace: "test-namespace",
		},
		StringData: map[string]string{
			"AWS_S3_BUCKET": "string-bucket",
			"password":      "string-password",
		},
	}

	result := buildAvailableKeysMap(secret)

	// AWS_S3_BUCKET from StringData should have actual value
	assert.Equal(t, "string-bucket", result["AWS_S3_BUCKET"], "AWS_S3_BUCKET from StringData should return actual value")

	// Other keys from StringData should be redacted
	assert.Equal(t, "[REDACTED]", result["password"], "Password from StringData should be redacted")
}

// TestBuildAvailableKeysMap_DataAndStringData tests that Data field takes precedence
// when a key exists in both Data and StringData.
func TestBuildAvailableKeysMap_DataAndStringData(t *testing.T) {
	secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "dual-field-secret",
			Namespace: "test-namespace",
		},
		Data: map[string][]byte{
			"AWS_S3_BUCKET": []byte("data-bucket"),
		},
		StringData: map[string]string{
			"AWS_S3_BUCKET": "stringdata-bucket", // This should be ignored since Data has it
			"password":      "secret-password",
		},
	}

	result := buildAvailableKeysMap(secret)

	// Data field value should take precedence
	assert.Equal(t, "data-bucket", result["AWS_S3_BUCKET"], "Data field should take precedence over StringData")
	assert.Equal(t, "[REDACTED]", result["password"], "Password should be redacted")
}

// TestFilterStorageSecrets_MatchesS3 tests that secrets with all required S3 keys are filtered correctly.
func TestFilterStorageSecrets_MatchesS3(t *testing.T) {
	s3Secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "s3-secret"},
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIA..."),
			"AWS_SECRET_ACCESS_KEY": []byte("secret"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
		},
	}

	nonS3Secret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "incomplete-secret"},
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID": []byte("AKIA..."),
			// Missing AWS_SECRET_ACCESS_KEY and AWS_S3_ENDPOINT
		},
	}

	secrets := []corev1.Secret{s3Secret, nonS3Secret}
	filtered := filterStorageSecrets(secrets)

	assert.Len(t, filtered, 1, "Should filter to only S3 secret")
	assert.Equal(t, "s3-secret", filtered[0].Name, "Filtered secret should be the S3 secret")
}

// TestFilterStorageSecrets_EmptyList tests that filtering an empty list returns an empty list.
func TestFilterStorageSecrets_EmptyList(t *testing.T) {
	secrets := []corev1.Secret{}
	filtered := filterStorageSecrets(secrets)

	assert.Empty(t, filtered, "Filtering empty list should return empty list")
}

// TestFilterLLSSecrets_MatchesLLS tests that secrets with all required LLS keys are filtered correctly.
func TestFilterLLSSecrets_MatchesLLS(t *testing.T) {
	llsSecret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "lls-secret"},
		Data: map[string][]byte{
			"LLAMA_STACK_CLIENT_API_KEY":  []byte("sk-..."),
			"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
		},
	}

	nonLLSSecret := corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "incomplete-lls"},
		Data: map[string][]byte{
			"LLAMA_STACK_CLIENT_API_KEY": []byte("sk-..."),
			// Missing LLAMA_STACK_CLIENT_BASE_URL
		},
	}

	secrets := []corev1.Secret{llsSecret, nonLLSSecret}
	filtered := filterLLSSecrets(secrets)

	assert.Len(t, filtered, 1, "Should filter to only LLS secret")
	assert.Equal(t, "lls-secret", filtered[0].Name, "Filtered secret should be the LLS secret")
}

// TestFilterLLSSecrets_EmptyList tests that filtering an empty list returns an empty list.
func TestFilterLLSSecrets_EmptyList(t *testing.T) {
	secrets := []corev1.Secret{}
	filtered := filterLLSSecrets(secrets)

	assert.Empty(t, filtered, "Filtering empty list should return empty list")
}

// TestGetStorageType_ReturnsS3 tests that a secret with S3 keys returns "s3" type.
func TestGetStorageType_ReturnsS3(t *testing.T) {
	secret := corev1.Secret{
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIA..."),
			"AWS_SECRET_ACCESS_KEY": []byte("secret"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
		},
	}

	storageType := getStorageType(secret)
	assert.Equal(t, "s3", storageType, "Secret with S3 keys should return 's3' type")
}

// TestGetStorageType_ReturnsEmpty tests that a secret without storage keys returns empty string.
func TestGetStorageType_ReturnsEmpty(t *testing.T) {
	secret := corev1.Secret{
		Data: map[string][]byte{
			"LLAMA_STACK_CLIENT_API_KEY": []byte("sk-..."),
		},
	}

	storageType := getStorageType(secret)
	assert.Equal(t, "", storageType, "Secret without storage keys should return empty string")
}

// TestGetSecretType_PrioritizesLLS tests that LLS type is returned before storage types.
func TestGetSecretType_PrioritizesLLS(t *testing.T) {
	llsSecret := corev1.Secret{
		Data: map[string][]byte{
			"LLAMA_STACK_CLIENT_API_KEY":  []byte("sk-..."),
			"LLAMA_STACK_CLIENT_BASE_URL": []byte("https://llama.example.com"),
		},
	}

	secretType := getSecretType(llsSecret)
	assert.Equal(t, "lls", secretType, "LLS secret should return 'lls' type")
}

// TestGetSecretType_FallbackToStorage tests that storage type is returned when LLS doesn't match.
func TestGetSecretType_FallbackToStorage(t *testing.T) {
	s3Secret := corev1.Secret{
		Data: map[string][]byte{
			"AWS_ACCESS_KEY_ID":     []byte("AKIA..."),
			"AWS_SECRET_ACCESS_KEY": []byte("secret"),
			"AWS_S3_ENDPOINT":       []byte("https://s3.amazonaws.com"),
		},
	}

	secretType := getSecretType(s3Secret)
	assert.Equal(t, "s3", secretType, "S3 secret should return 's3' type")
}

// TestGetSecretType_ReturnsEmpty tests that unrecognized secrets return empty string.
func TestGetSecretType_ReturnsEmpty(t *testing.T) {
	genericSecret := corev1.Secret{
		Data: map[string][]byte{
			"username": []byte("admin"),
			"password": []byte("secret"),
		},
	}

	secretType := getSecretType(genericSecret)
	assert.Equal(t, "", secretType, "Generic secret should return empty string type")
}

// TestHasAllKeys_AllPresent tests that hasAllKeys returns true when all keys are present.
func TestHasAllKeys_AllPresent(t *testing.T) {
	secret := corev1.Secret{
		Data: map[string][]byte{
			"key1": []byte("value1"),
			"key2": []byte("value2"),
			"key3": []byte("value3"),
		},
	}

	requiredKeys := []string{"key1", "key2"}
	result := hasAllKeys(secret, requiredKeys)

	assert.True(t, result, "Should return true when all required keys are present")
}

// TestHasAllKeys_SomeMissing tests that hasAllKeys returns false when some keys are missing.
func TestHasAllKeys_SomeMissing(t *testing.T) {
	secret := corev1.Secret{
		Data: map[string][]byte{
			"key1": []byte("value1"),
		},
	}

	requiredKeys := []string{"key1", "key2", "key3"}
	result := hasAllKeys(secret, requiredKeys)

	assert.False(t, result, "Should return false when some required keys are missing")
}

// TestHasAllKeys_EmptyRequired tests that hasAllKeys returns true for empty required keys list.
func TestHasAllKeys_EmptyRequired(t *testing.T) {
	secret := corev1.Secret{
		Data: map[string][]byte{
			"key1": []byte("value1"),
		},
	}

	requiredKeys := []string{}
	result := hasAllKeys(secret, requiredKeys)

	assert.True(t, result, "Should return true when no keys are required")
}

// TestHasAllKeys_CaseSensitive tests that key matching is case-sensitive.
func TestHasAllKeys_CaseSensitive(t *testing.T) {
	secret := corev1.Secret{
		Data: map[string][]byte{
			"AWS_S3_BUCKET": []byte("my-bucket"),
		},
	}

	uppercaseKeys := []string{"AWS_S3_BUCKET"}
	lowercaseKeys := []string{"aws_s3_bucket"}

	assert.True(t, hasAllKeys(secret, uppercaseKeys), "Should match uppercase key")
	assert.False(t, hasAllKeys(secret, lowercaseKeys), "Should not match lowercase key (case-sensitive)")
}
