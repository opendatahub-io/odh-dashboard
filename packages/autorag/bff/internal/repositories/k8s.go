package repositories

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"

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

var maasCredentialBaseURLKeys = []string{"maas_base_url", "ogx_client_base_url"}
var maasCredentialAPIKeyKeys = []string{"maas_api_key", "ogx_client_api_key"}

var allowedSecretKeys = map[string]bool{
	"AWS_S3_BUCKET": true,
}

type K8sRepository struct{}

func NewK8sRepository() *K8sRepository {
	return &K8sRepository{}
}

// GetFilteredSecrets retrieves secrets from a namespace and filters them based on secretType.
// secretType can be:
//   - "" (empty): return all secrets
//   - "storage": filter for secrets matching storage type requirements (e.g., S3)
//   - "maas": filter for secrets matching MaaS (Models as a Service) requirements
func (r *K8sRepository) GetFilteredSecrets(
	k8sService kubernetes.Service,
	ctx context.Context,
	namespace string,
	secretType string,
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
	case "maas":
		filtered = filterMaasSecrets(secretInfos)
	default:
		return nil, fmt.Errorf("invalid secret type: %s", secretType)
	}

	result := make([]models.SecretListItem, 0, len(filtered))
	for _, secret := range filtered {
		responseType := detectType(secret, secretType)
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

// GetSecretCredentials retrieves a named secret and returns MaaS credential keys
// (MAAS_BASE_URL, MAAS_API_KEY) with base64-encoded values.
// Legacy OGX_CLIENT_* keys are mapped to the same MAAS_* names so the frontend
// playground does not need to know about the old schema.
// Empty API key values are included (no-auth MaaS). Missing keys are omitted.
func (r *K8sRepository) GetSecretCredentials(
	k8sService kubernetes.Service,
	ctx context.Context,
	namespace, name string,
) (map[string]string, error) {
	secret, err := k8sService.GetSecret(ctx, namespace, name)
	if err != nil {
		return nil, err
	}

	data := make(map[string]string, 2)
	if secretDataHasKey(secret.Data, maasCredentialBaseURLKeys...) {
		value, lookupErr := kubernetes.LookupSecretValue(secret.Data, maasCredentialBaseURLKeys...)
		if lookupErr != nil {
			return nil, lookupErr
		}
		data["MAAS_BASE_URL"] = base64.StdEncoding.EncodeToString([]byte(value))
	}
	if secretDataHasKey(secret.Data, maasCredentialAPIKeyKeys...) {
		value, lookupErr := kubernetes.LookupSecretValue(secret.Data, maasCredentialAPIKeyKeys...)
		if lookupErr != nil {
			return nil, lookupErr
		}
		data["MAAS_API_KEY"] = base64.StdEncoding.EncodeToString([]byte(value))
	}

	return data, nil
}

// secretDataHasKey reports whether data contains any of the names, ignoring key case.
func secretDataHasKey(data map[string][]byte, names ...string) bool {
	for k := range data {
		for _, name := range names {
			if strings.EqualFold(k, name) {
				return true
			}
		}
	}
	return false
}

func secretInfoHasAnyKeyCI(data map[string]string, names ...string) bool {
	for k := range data {
		for _, name := range names {
			if strings.EqualFold(k, name) {
				return true
			}
		}
	}
	return false
}

// isMaasCompatibleSecret reports whether a secret has a MaaS or legacy OGX
// base-URL key and the matching API-key key (the API-key value may be empty).
func isMaasCompatibleSecret(secret kubernetes.SecretInfo) bool {
	hasMaasPair := secretInfoHasAnyKeyCI(secret.Data, "maas_base_url") &&
		secretInfoHasAnyKeyCI(secret.Data, "maas_api_key")
	hasOgxPair := secretInfoHasAnyKeyCI(secret.Data, "ogx_client_base_url") &&
		secretInfoHasAnyKeyCI(secret.Data, "ogx_client_api_key")
	return hasMaasPair || hasOgxPair
}

func filterMaasSecrets(secrets []kubernetes.SecretInfo) []kubernetes.SecretInfo {
	filtered := make([]kubernetes.SecretInfo, 0)
	for _, secret := range secrets {
		if isMaasCompatibleSecret(secret) {
			filtered = append(filtered, secret)
		}
	}
	return filtered
}

// detectType determines the type for a secret, checking annotation first,
// then falling back to key-based detection with MaaS (including legacy OGX keys)
// prioritized over storage.
func detectType(secret kubernetes.SecretInfo, secretType string) string {
	if secret.Type != "" {
		return secret.Type
	}
	switch secretType {
	case "maas":
		return "maas"
	case "storage":
		return kubernetes.DetectSecretType(secret, storageTypeRequiredKeys)
	default:
		if isMaasCompatibleSecret(secret) {
			return "maas"
		}
		return kubernetes.DetectSecretType(secret, storageTypeRequiredKeys)
	}
}
