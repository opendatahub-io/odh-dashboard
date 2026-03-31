package repositories

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/externalmodels"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type ExternalModelsRepository struct{}

func NewExternalModelsRepository() *ExternalModelsRepository {
	return &ExternalModelsRepository{}
}

// CreateExternalModel creates an external model by creating/updating the ConfigMap and Secret
func (r *ExternalModelsRepository) CreateExternalModel(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	req models.ExternalModelRequest,
) (*models.AAModel, error) {
	// Generate provider ID (simple incremental ID based on existing providers)
	providerID, err := client.GenerateProviderID(ctx, identity, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to generate provider ID: %w", err)
	}

	// Create Secret for API key only when a token was provided
	var secretName string
	if req.SecretValue != "" {
		secretName = fmt.Sprintf("endpoint-api-key-%s", providerID)
		if err := client.CreateExternalModelSecret(ctx, identity, namespace, secretName, req.SecretValue); err != nil {
			return nil, fmt.Errorf("failed to create secret: %w", err)
		}
	}

	// Create or update ConfigMap with the new provider and model
	if err := client.CreateOrUpdateExternalModelConfigMap(ctx, identity, namespace, providerID, secretName, req); err != nil {
		// Clean up secret if ConfigMap creation fails (only if one was created)
		if secretName != "" {
			if cleanupErr := client.DeleteSecret(ctx, identity, namespace, secretName); cleanupErr != nil {
				// Return both the original error and the cleanup error to surface leaked state
				return nil, fmt.Errorf("failed to create/update ConfigMap: %w; cleanup failed deleting secret %s: %v", err, secretName, cleanupErr)
			}
		}
		return nil, fmt.Errorf("failed to create/update ConfigMap: %w", err)
	}

	// Return AAModel structure for consistent API response
	return &models.AAModel{
		ModelName:       req.ModelID,
		ModelID:         req.ModelID,
		ServingRuntime:  string(models.ProviderTypeOpenAI),
		APIProtocol:     "REST",
		Version:         "",
		Usecase:         req.UseCases,
		Description:     "",
		Endpoints:       []string{req.BaseURL},
		Status:          models.ModelStatusUnknown,
		DisplayName:     req.ModelDisplayName,
		SAToken:         models.SAToken{},
		ModelSourceType: models.ModelSourceTypeCustomEndpoint,
		ModelType:       req.ModelType,
	}, nil
}

// PassthroughEmbeddingInfo holds the provider URL and API key for a remote::passthrough
// embedding model backing a vector store.
type PassthroughEmbeddingInfo struct {
	BaseURL string
	APIKey  string
}

// GetPassthroughEmbeddingProviderInfo finds the first vector store in vectorStoreIDs that uses
// a custom-endpoint (remote::passthrough) embedding model and returns its URL and API key.
// Returns (nil, nil) when none of the stores use a passthrough embedding model — not an error.
// Returns a non-nil error when ConfigMap or Secret reads fail so callers can fail closed.
func (r *ExternalModelsRepository) GetPassthroughEmbeddingProviderInfo(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	vectorStoreIDs []string,
) (*PassthroughEmbeddingInfo, error) {
	vsDoc, err := client.GetVectorStoresConfig(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to get vector stores config: %w", err)
	}

	vsMap := make(map[string]models.RegisteredVectorStore, len(vsDoc.RegisteredResources.VectorStores))
	for _, vs := range vsDoc.RegisteredResources.VectorStores {
		vsMap[vs.VectorStoreID] = vs
	}

	externalModelsConfig, err := client.GetExternalModelsConfig(ctx, namespace)
	if err != nil {
		return nil, fmt.Errorf("failed to get external models config: %w", err)
	}

	for _, vsID := range vectorStoreIDs {
		registeredVS, found := vsMap[vsID]
		if !found || registeredVS.EmbeddingModel == "" {
			continue
		}

		embeddingModelID := registeredVS.EmbeddingModel

		var foundModel *models.RegisteredModel
		for i := range externalModelsConfig.RegisteredResources.Models {
			m := &externalModelsConfig.RegisteredResources.Models[i]
			if m.ModelID == embeddingModelID && m.ModelType == models.ModelTypeEmbedding {
				foundModel = m
				break
			}
		}
		if foundModel == nil {
			continue // not a custom endpoint embedding model
		}

		var foundProvider *models.InferenceProvider
		for i := range externalModelsConfig.Providers.Inference {
			if externalModelsConfig.Providers.Inference[i].ProviderID == foundModel.ProviderID {
				foundProvider = &externalModelsConfig.Providers.Inference[i]
				break
			}
		}
		if foundProvider == nil || foundProvider.ProviderType != models.ProviderTypePassThrough {
			continue
		}

		secretName := foundProvider.Config.CustomGenAI.APIKey.SecretRef.Name
		secretKey := foundProvider.Config.CustomGenAI.APIKey.SecretRef.Key
		apiKey := "fake" // default when no secret is configured
		if secretName != "" && secretKey != "" {
			apiKey, err = client.GetSecretValue(ctx, identity, namespace, secretName, secretKey)
			if err != nil {
				return nil, fmt.Errorf("failed to get secret for passthrough embedding model %q: %w", embeddingModelID, err)
			}
			if apiKey == "" {
				apiKey = "fake"
			}
		}

		return &PassthroughEmbeddingInfo{
			BaseURL: foundProvider.Config.BaseURL,
			APIKey:  apiKey,
		}, nil
	}

	return nil, nil // no passthrough embedding model found
}

// DeleteExternalModel deletes an external model by removing its entry from the ConfigMap and deleting its Secret
func (r *ExternalModelsRepository) DeleteExternalModel(
	client kubernetes.KubernetesClientInterface,
	ctx context.Context,
	identity *integrations.RequestIdentity,
	namespace string,
	modelID string,
) error {
	return client.DeleteExternalModel(ctx, identity, namespace, modelID)
}

// isInternalHost reports whether a URL targets a host that is known to be internal
// (localhost or a Kubernetes in-cluster service). These legitimately resolve to private
// IPs, so SSRF validation is skipped for them. All other URLs are subject to SSRF checks.
func isInternalHost(baseURL string) bool {
	u, err := url.Parse(baseURL)
	if err != nil {
		return false
	}
	h := u.Hostname()
	// TODO: respect OdhDashboardConfig feature flags when available to be fetched from the BFF
	// Require a fully-qualified Kubernetes service DNS name: <service>.<namespace>.svc.cluster.local
	// (5 dot-separated labels minimum), preventing overly-broad matches like "evil.cluster.local".
	isK8sService := strings.HasSuffix(h, ".svc.cluster.local") && len(strings.Split(h, ".")) >= 5
	ip := net.ParseIP(h)
	return h == "localhost" ||
		(ip != nil && ip.IsLoopback()) ||
		isK8sService
}

// internalHostRootCAs returns the provided CA pool only when the URL targets an internal
// host. For external hosts it returns nil so the client falls back to the system CA pool,
// which contains the public root CAs needed to verify certificates from services like
// api.openai.com. Passing a cluster-only CA pool to an external host would break TLS.
func internalHostRootCAs(baseURL string, rootCAs *x509.CertPool) *x509.CertPool {
	if isInternalHost(baseURL) {
		return rootCAs
	}
	return nil
}

// VerifyExternalModel tests an external model endpoint using the external models client.
// rootCAs is the application CA pool (nil falls back to system pool for external hosts).
// insecureSkipVerify mirrors cfg.InsecureSkipVerify and disables TLS cert validation when true.
func (r *ExternalModelsRepository) VerifyExternalModel(
	logger *slog.Logger,
	ctx context.Context,
	req models.VerifyExternalModelRequest,
	rootCAs *x509.CertPool,
	insecureSkipVerify bool,
) (*models.VerifyExternalModelResponse, error) {
	client, err := externalmodels.NewExternalModelsClient(
		logger,
		req.BaseURL,
		req.SecretValue,
		req.ModelType,
		&externalmodels.ClientOptions{
			AllowHTTP:          isInternalHost(req.BaseURL),
			SkipSSRFValidation: isInternalHost(req.BaseURL),
			// Only supply the cluster CA pool for internal hosts; external hosts
			// must use the system CA pool to verify public certificates.
			SkipTLSVerification: insecureSkipVerify && isInternalHost(req.BaseURL),
			RootCAs:             internalHostRootCAs(req.BaseURL, rootCAs),
		},
	)
	if err != nil {
		return nil, err
	}

	// Verify the model using the client (pass embedding dimension for embedding models)
	return client.VerifyModel(ctx, req.ModelID, req.EmbeddingDimension)
}
