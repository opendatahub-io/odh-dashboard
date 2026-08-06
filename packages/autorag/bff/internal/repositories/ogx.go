package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/url"

	ogx "github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

var ErrOGXCredentialValidation = errors.New("OGX credential validation failed")

const vectorIOAPI = "vector_io"

// OGXRepository handles OGX model and vector store provider operations.
// Reads credentials from Kubernetes secrets per-call and delegates to the stateless OGX client.
type OGXRepository struct {
	ogxClient  ogx.OGXClientInterface
	k8sService kubernetes.Service
	logger     *slog.Logger
}

func NewOGXRepository(logger *slog.Logger, ogxClient ogx.OGXClientInterface, k8sService kubernetes.Service) *OGXRepository {
	return &OGXRepository{ogxClient: ogxClient, k8sService: k8sService, logger: logger}
}

// --- Models ---

// GetOGXModels retrieves all models from OGX.
func (r *OGXRepository) GetOGXModels(ctx context.Context, namespace, secretName string) (*models.OGXModelsData, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	nativeModels, err := r.ogxClient.ListModels(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX models: %w", err)
	}

	allModels := make([]models.OGXModel, 0, len(nativeModels))
	var skipped, degraded int
	for _, native := range nativeModels {
		ogxModel, ok := r.translateOGXModel(native)
		if !ok {
			skipped++
			continue
		}
		if ogxModel.Type == "unknown" {
			degraded++
		}
		allModels = append(allModels, ogxModel)
	}

	if skipped > 0 || degraded > 0 {
		r.logger.Warn("Open GenAI Stack schema drift detected — some models could not be fully parsed",
			"total", len(nativeModels),
			"skipped", skipped,
			"degraded_to_unknown_type", degraded)
	}

	return &models.OGXModelsData{Models: allModels}, nil
}

// translateOGXModel translates an Open GenAI Stack native model into our stable public API format.
// Degrades gracefully when upstream fields are missing:
//   - ID is required — models without an ID are skipped entirely.
//   - model_type is the most critical field (the UI uses it to filter between embedding and
//     generation models). If missing, it defaults to "unknown" so the model still appears.
//   - provider and resource_path are optional — empty strings are acceptable.
func (r *OGXRepository) translateOGXModel(native models.OGXNativeModel) (models.OGXModel, bool) {
	if native.ID == "" {
		r.logger.Warn("skipping Open GenAI Stack model with empty ID")
		return models.OGXModel{}, false
	}

	result := models.OGXModel{ID: native.ID}

	if native.CustomMetadata == nil {
		r.logger.Warn("Open GenAI Stack model missing custom_metadata — upstream schema may have changed",
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

// GetOGXVectorStoreProviders retrieves vector store providers from OGX by calling
// /v1/providers and filtering for the vector_io API type.
func (r *OGXRepository) GetOGXVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.OGXVectorStoreProvidersData, error) {
	baseURL, apiKey, err := resolveOGXCredentials(ctx, r.k8sService, namespace, secretName)
	if err != nil {
		return nil, err
	}

	allProviders, err := r.ogxClient.ListProviders(ctx, baseURL, apiKey)
	if err != nil {
		return nil, fmt.Errorf("failed to list OGX providers: %w", err)
	}

	vectorStoreProviders := make([]models.OGXVectorStoreProvider, 0)
	for _, p := range allProviders {
		if p.API == vectorIOAPI {
			vectorStoreProviders = append(vectorStoreProviders, models.OGXVectorStoreProvider{
				ProviderID:   p.ProviderID,
				ProviderType: p.ProviderType,
			})
		}
	}

	return &models.OGXVectorStoreProvidersData{VectorStoreProviders: vectorStoreProviders}, nil
}

// --- Credential Helpers ---

// resolveOGXCredentials fetches the named secret from Kubernetes and extracts the OGX
// base URL and API key using case-insensitive key lookups.
// Returns (baseURL, apiKey, error). When the factory is in mock mode the caller can
// pass empty strings back to CreateClient — so this function always does a real secret
// lookup; mock switching is handled at the factory level.
func resolveOGXCredentials(ctx context.Context, k8sService kubernetes.Service, namespace, secretName string) (string, string, error) {
	secret, err := k8sService.GetSecret(ctx, namespace, secretName)
	if err != nil {
		return "", "", fmt.Errorf("failed to get secret %q: %w", secretName, err)
	}
	if secret == nil {
		return "", "", fmt.Errorf("secret %q not found in namespace %q", secretName, namespace)
	}

	baseURL, err := kubernetes.LookupSecretValue(secret.Data, "ogx_client_base_url")
	if err != nil {
		return "", "", fmt.Errorf("invalid secret %q: %w", secretName, err)
	}
	if baseURL == "" {
		return "", "", fmt.Errorf("secret %q is missing or has empty value for required key: ogx_client_base_url: %w", secretName, ErrOGXCredentialValidation)
	}

	apiKey, err := kubernetes.LookupSecretValue(secret.Data, "ogx_client_api_key")
	if err != nil {
		return "", "", fmt.Errorf("invalid secret %q: %w", secretName, err)
	}
	// API key is optional — OGX servers can run without auth, so empty API key is valid.
	// Only reject if the key is entirely absent from the secret, not if present-but-empty.
	if _, keyPresent := secret.Data["ogx_client_api_key"]; !keyPresent {
		// Case-insensitive fallback: check if any case variant exists
		if apiKey == "" {
			// key not found by any variant — reject
			return "", "", fmt.Errorf("secret %q is missing required key: ogx_client_api_key: %w", secretName, ErrOGXCredentialValidation)
		}
	}

	if err := isValidOGXURL(baseURL); err != nil {
		return "", "", fmt.Errorf("invalid ogx_client_base_url in secret %q: %s: %w", secretName, err, ErrOGXCredentialValidation)
	}

	return baseURL, apiKey, nil
}

// validateOGXIP checks an IP address against the SSRF blocklist.
// Loopback (127.x, ::1), link-local (169.254.x — cloud metadata), and unspecified (0.0.0.0) are blocked.
// Private ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed for cluster-internal services.
func validateOGXIP(ip net.IP) error {
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

// isValidOGXURL validates a URL extracted from a Kubernetes secret to prevent SSRF attacks.
// Only http and https schemes are allowed. For IP literals, the IP is checked directly.
// For DNS hostnames, all resolved A/AAAA records are validated against the same blocklist.
// Private IP ranges (10.x, 172.16.x, 192.168.x) are intentionally allowed because OGX
// services typically run as cluster-internal services with private IPs.
func isValidOGXURL(rawURL string) error {
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
		return validateOGXIP(ip)
	}

	// Resolve DNS hostnames and validate all resulting IPs.
	// If DNS resolution fails, allow it through — the hostname may only be resolvable
	// inside the cluster (e.g., svc.cluster.local). The HTTP client will fail with a
	// connection error later, which is handled as a 502 Bad Gateway.
	ips, err := net.LookupIP(host)
	if err == nil {
		for _, ip := range ips {
			if err := validateOGXIP(ip); err != nil {
				return fmt.Errorf("hostname %q resolves to blocked address: %w", host, err)
			}
		}
	}

	return nil
}
