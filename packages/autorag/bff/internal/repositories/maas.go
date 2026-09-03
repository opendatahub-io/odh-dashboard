package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/url"

	maas "github.com/opendatahub-io/autorag-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

var ErrMaaSCredentialValidation = errors.New("MaaS credential validation failed")

const vectorIOAPI = "vector_io"

// MaaSRepository handles MaaS model and vector store provider operations.
// Reads credentials from Kubernetes secrets per-call and delegates to the stateless MaaS client.
type MaaSRepository struct {
	maasClient maas.MaaSClientInterface
	k8sService kubernetes.Service
	logger     *slog.Logger
}

func NewMaaSRepository(logger *slog.Logger, maasClient maas.MaaSClientInterface, k8sService kubernetes.Service) *MaaSRepository {
	return &MaaSRepository{maasClient: maasClient, k8sService: k8sService, logger: logger}
}

// --- Models ---

// GetMaaSModels retrieves all models from MaaS.
func (r *MaaSRepository) GetMaaSModels(ctx context.Context, namespace, secretName string) (*models.MaaSModelsData, error) {
	baseURL, apiKey, err := resolveMaaSCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	nativeModels, err := r.maasClient.ListModels(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaS models: %w", err)
	}

	allModels := make([]models.MaaSModel, 0, len(nativeModels))
	var skipped, degraded int
	for _, native := range nativeModels {
		maasModel, ok := r.translateMaaSModel(native)
		if !ok {
			skipped++
			continue
		}
		if maasModel.Type == "unknown" {
			degraded++
		}
		allModels = append(allModels, maasModel)
	}

	if skipped > 0 || degraded > 0 {
		r.logger.Warn("Models as a Service schema drift detected — some models could not be fully parsed",
			"total", len(nativeModels),
			"skipped", skipped,
			"degraded_to_unknown_type", degraded)
	}

	return &models.MaaSModelsData{Models: allModels}, nil
}

// translateMaaSModel translates an Models as a Service native model into our stable public API format.
// Degrades gracefully when upstream fields are missing:
//   - ID is required — models without an ID are skipped entirely.
//   - model_type is the most critical field (the UI uses it to filter between embedding and
//     generation models). If missing, it defaults to "unknown" so the model still appears.
//   - provider and resource_path are optional — empty strings are acceptable.
func (r *MaaSRepository) translateMaaSModel(native models.MaaSNativeModel) (models.MaaSModel, bool) {
	if native.ID == "" {
		r.logger.Warn("skipping Models as a Service model with empty ID")
		return models.MaaSModel{}, false
	}

	result := models.MaaSModel{ID: native.ID}

	if native.CustomMetadata == nil {
		r.logger.Warn("Models as a Service model missing custom_metadata — upstream schema may have changed",
			"model_id", native.ID)
		result.Type = "unknown"
		return result, true
	}

	result.Type = native.CustomMetadata.ModelType
	result.Provider = native.CustomMetadata.ProviderID
	result.ResourcePath = native.CustomMetadata.ProviderResourceID

	if result.Type == "" {
		result.Type = "unknown"
		return result, true
	}

	return result, true
}

// --- Vector Store Providers ---

// GetMaaSVectorStoreProviders retrieves vector store providers from MaaS by calling
// /v1/providers and filtering for the vector_io API type.
func (r *MaaSRepository) GetMaaSVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.MaaSVectorStoreProvidersData, error) {
	baseURL, apiKey, err := resolveMaaSCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	allProviders, err := r.maasClient.ListProviders(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list MaaS providers: %w", err)
	}

	vectorStoreProviders := make([]models.MaaSVectorStoreProvider, 0)
	for _, p := range allProviders {
		if p.API == vectorIOAPI {
			vectorStoreProviders = append(vectorStoreProviders, models.MaaSVectorStoreProvider{
				ProviderID:   p.ProviderID,
				ProviderType: p.ProviderType,
			})
		}
	}

	return &models.MaaSVectorStoreProvidersData{VectorStoreProviders: vectorStoreProviders}, nil
}

// --- Credential Helpers ---

// resolveMaaSCredentials fetches the named secret from Kubernetes and extracts the MaaS
// base URL and API key using case-insensitive key lookups.
// Returns (baseURL, apiKey, error). When the factory is in mock mode the caller can
// pass empty strings back to CreateClient — so this function always does a real secret
// lookup; mock switching is handled at the factory level.
func resolveMaaSCredentials(ctx context.Context, k8sService kubernetes.Service, namespace, secretName string) (string, string, error) {
	secret, err := k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return "", "", fmt.Errorf("failed to get secret %q: %w", secretName, err)
	}
	if secret == nil {
		return "", "", fmt.Errorf("secret %q not found in namespace %q", secretName, namespace)
	}

	baseURL, err := kubernetes.LookupSecretValue(secret.Data, "maas_base_url")
	if err != nil {
		return "", "", fmt.Errorf("invalid secret %q: %w", secretName, err)
	}
	if baseURL == "" {
		return "", "", fmt.Errorf("secret %q is missing or has empty value for required key: maas_base_url: %w", secretName, ErrMaaSCredentialValidation)
	}

	apiKey, err := kubernetes.LookupSecretValue(secret.Data, "maas_api_key")
	if err != nil {
		return "", "", fmt.Errorf("invalid secret %q: %w", secretName, err)
	}
	// API key is optional — MaaS servers can run without auth, so empty API key is valid.
	// Only reject if the key is entirely absent from the secret, not if present-but-empty.
	if _, keyPresent := secret.Data["maas_api_key"]; !keyPresent {
		// Case-insensitive fallback: check if any case variant exists
		if apiKey == "" {
			// key not found by any variant — reject
			return "", "", fmt.Errorf("secret %q is missing required key: maas_api_key: %w", secretName, ErrMaaSCredentialValidation)
		}
	}

	if err := isValidMaaSURL(baseURL); err != nil {
		return "", "", fmt.Errorf("invalid maas_base_url in secret %q: %s: %w", secretName, err, ErrMaaSCredentialValidation)
	}

	return baseURL, apiKey, nil
}

// validateMaaSIP checks an IP address against the SSRF blocklist.
// Loopback (127.x, ::1), link-local (169.254.x — cloud metadata), and unspecified (0.0.0.0) are blocked.
// Private ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed for cluster-internal services.
func validateMaaSIP(ip net.IP) error {
	if ip.IsLoopback() {
		return fmt.Errorf("loopback addresses are not allowed")
	}
	if ip.IsLinkLocalUnicast() {
		return fmt.Errorf("link-local addresses are not allowed")
	}
	if ip.IsUnspecified() {
		return fmt.Errorf("unspecified addresses are not allowed")
	}
	if ip.IsMulticast() {
		return fmt.Errorf("multicast addresses are not allowed")
	}
	return nil
}

// isValidMaaSURL validates a URL extracted from a Kubernetes secret to prevent SSRF attacks.
// Only http and https schemes are allowed. For IP literals, the IP is checked directly.
// For DNS hostnames, all resolved A/AAAA records are validated against the same blocklist.
// Private IP ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed because MaaS
// services typically run as cluster-internal services with private IPs.
func isValidMaaSURL(rawURL string) error {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("invalid URL scheme %q: only http and https are allowed", parsedURL.Scheme)
	}

	if parsedURL.User != nil {
		return fmt.Errorf("URL must not contain credentials")
	}
	if parsedURL.Path != "" && parsedURL.Path != "/" {
		return fmt.Errorf("URL must not contain a path")
	}
	if parsedURL.RawQuery != "" {
		return fmt.Errorf("URL must not contain a query string")
	}
	if parsedURL.Fragment != "" {
		return fmt.Errorf("URL must not contain a fragment")
	}

	host := parsedURL.Hostname()
	if host == "" {
		return fmt.Errorf("URL must contain a host")
	}

	// Check IP literals directly
	if ip := net.ParseIP(host); ip != nil {
		return validateMaaSIP(ip)
	}

	// Resolve DNS hostnames and validate all resulting IPs.
	// If DNS resolution fails, allow it through — the hostname may only be resolvable
	// inside the cluster (e.g., svc.cluster.local). The HTTP client will fail with a
	// connection error later, which is handled as a 502 Bad Gateway.
	ips, err := net.LookupIP(host)
	if err == nil {
		for _, ip := range ips {
			if err := validateMaaSIP(ip); err != nil {
				return fmt.Errorf("hostname %q resolves to blocked address: %w", host, err)
			}
		}
	}

	return nil
}
