package repositories

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

var storageTypeRequiredKeys = map[string][]string{
	"s3": {
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_S3_ENDPOINT",
	},
}

var ogxTypeRequiredKeys = map[string][]string{
	"ogx": {
		"OGX_CLIENT_API_KEY",
		"OGX_CLIENT_BASE_URL",
	},
}

var maasTypeRequiredKeys = map[string][]string{
	"maas": {
		"MAAS_BASE_URL",
		"MAAS_API_KEY",
	},
}

var vectorDBTypeRequiredKeys = map[string][]string{
	"milvus": {"MILVUS_URI"},
	"pgvector": {
		"PGVECTOR_HOST",
		"PGVECTOR_PORT",
		"PGVECTOR_DB",
		"PGVECTOR_USER",
		"PGVECTOR_PASSWORD",
	},
}

var databaseTypeRequiredKeys = map[string][]string{
	"milvus":   {"MILVUS_URI"},
	"pgvector": vectorDBTypeRequiredKeys["pgvector"],
	"neo4j":    {"NEO4J_URI"},
}

var databaseProviderOrder = []string{"milvus", "pgvector", "neo4j"}

var allowedSecretKeys = map[string]bool{
	"AWS_S3_BUCKET": true,
}

type K8sRepository struct{}

func NewK8sRepository() *K8sRepository {
	return &K8sRepository{}
}

func matchingDatabaseProviders(secret kubernetes.SecretInfo) []string {
	providers := make([]string, 0, len(databaseProviderOrder))
	for _, provider := range databaseProviderOrder {
		if kubernetes.SecretInfoHasAllKeys(secret, databaseTypeRequiredKeys[provider]) {
			providers = append(providers, provider)
		}
	}
	return providers
}

func filterDatabaseSecretInfos(
	secretInfos []kubernetes.SecretInfo,
	provider string,
) []kubernetes.SecretInfo {
	filtered := make([]kubernetes.SecretInfo, 0, len(secretInfos))
	for _, secret := range secretInfos {
		providers := matchingDatabaseProviders(secret)
		if len(providers) != 1 || (provider != "" && providers[0] != provider) {
			continue
		}
		filtered = append(filtered, secret)
	}
	return filtered
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them based on secretType.
// secretType can be:
//   - "" (empty): return all secrets
//   - "storage": filter for secrets matching storage type requirements (e.g., S3)
//   - "ogx": filter for secrets matching OGX (Open GenAI Stack) requirements
//   - "maas": filter for secrets containing both MaaS credential keys
//   - "vector-db": filter for the union of Milvus and PGVector credential schemas
//   - "database": filter for database credentials, optionally narrowed by provider
func (r *K8sRepository) GetFilteredSecrets(
	k8sService kubernetes.Service,
	ctx context.Context,
	namespace string,
	secretType string,
) ([]models.SecretListItem, error) {
	return r.GetFilteredSecretsByProvider(k8sService, ctx, namespace, secretType, "")
}

func (r *K8sRepository) GetFilteredSecretsByProvider(
	k8sService kubernetes.Service,
	ctx context.Context,
	namespace string,
	secretType string,
	provider string,
) ([]models.SecretListItem, error) {
	secretInfos, err := k8sService.GetSecretInfos(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("error fetching secrets from namespace %s: %w", namespace, err)
	}

	var filtered []kubernetes.SecretInfo
	switch secretType {
	case "":
		filtered = secretInfos
	case "storage":
		filtered = kubernetes.FilterSecretInfos(secretInfos, storageTypeRequiredKeys)
	case "ogx":
		filtered = kubernetes.FilterSecretInfos(secretInfos, ogxTypeRequiredKeys)
	case "maas":
		filtered = kubernetes.FilterSecretInfos(secretInfos, maasTypeRequiredKeys)
	case "vector-db":
		filtered = kubernetes.FilterSecretInfos(secretInfos, vectorDBTypeRequiredKeys)
	case "database":
		filtered = filterDatabaseSecretInfos(secretInfos, provider)
	default:
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	result := make([]models.SecretListItem, 0, len(filtered))
	for _, secret := range filtered {
		responseType := detectType(secret, secretType, provider)
		redactedData := kubernetes.RedactSecretData(secret.Data, allowedSecretKeys)

		result = append(result, models.SecretListItem{
			UUID:        secret.UUID,
			Name:        secret.Name,
			Type:        responseType,
			Data:        redactedData,
			DisplayName: secret.DisplayName,
			Description: secret.Description,
		})
	}

	return result, nil
}

// GetSecretCredentials retrieves a named secret and returns only the OGX credential
// keys (OGX_CLIENT_BASE_URL, OGX_CLIENT_API_KEY) with base64-encoded values.
// Returns an empty map if the secret contains no OGX keys.
func (r *K8sRepository) GetSecretCredentials(
	k8sService kubernetes.Service,
	ctx context.Context,
	namespace, name string,
) (map[string]string, error) {
	secret, err := k8sService.GetSecret(ctx, namespace, name)
	if err != nil {
		return nil, err
	}

	ogxKeys := ogxTypeRequiredKeys["ogx"]
	data := make(map[string]string, len(ogxKeys))
	for _, key := range ogxKeys {
		if value, ok := secret.Data[key]; ok {
			data[key] = base64.StdEncoding.EncodeToString(value)
		}
	}

	return data, nil
}

// detectType determines the type for a secret, checking annotation first and
// then falling back to key-based detection.
func detectType(secret kubernetes.SecretInfo, secretType string, providers ...string) string {
	if secretType == "database" {
		if secret.Type != "" {
			return secret.Type
		}
		providers := matchingDatabaseProviders(secret)
		if len(providers) == 1 {
			return providers[0]
		}
		return "database"
	}
	if secret.Type != "" {
		return secret.Type
	}
	switch secretType {
	case "ogx", "maas", "vector-db":
		return secretType
	case "storage":
		return kubernetes.DetectSecretType(secret, storageTypeRequiredKeys)
	default:
		if kubernetes.SecretInfoHasAllKeys(secret, ogxTypeRequiredKeys["ogx"]) {
			return "ogx"
		}
		return kubernetes.DetectSecretType(secret, storageTypeRequiredKeys)
	}
}
