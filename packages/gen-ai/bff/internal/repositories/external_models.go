package repositories

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net"
	"net/url"
	"strings"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/externalmodels"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
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
				// Return both the original error and the cleanup error to surface leaked
				// state. The original error is deliberately formatted with %v rather than
				// %w: a failed cleanup means server-side state was leaked, which must
				// surface as a 500 — not be matched by errors.As in
				// CreateExternalModelHandler as a DuplicateModelError (409).
				return nil, fmt.Errorf("failed to create/update ConfigMap: %v; cleanup failed deleting secret %s: %v", err, secretName, cleanupErr)
			}
		}
		return nil, fmt.Errorf("failed to create/update ConfigMap: %w", err)
	}

	// Return AAModel structure for consistent API response
	caps := constants.BuildCapabilities(req.Capabilities)
	if caps == nil {
		caps = constants.DefaultCapabilities()
	}
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
		ModelSourceType: models.ModelSourceTypeCustomEndpoint,
		ModelType:       req.ModelType,
		Capabilities:    caps,
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
// Returns (nil, nil) if Vector Stores or External Models config not found, or when none of
// the stores use a passthrough embedding model — not an error.
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
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get vector stores config: %w", err)
	}

	vsMap := make(map[string]models.RegisteredVectorStore, len(vsDoc.RegisteredResources.VectorStores))
	for _, vs := range vsDoc.RegisteredResources.VectorStores {
		vsMap[vs.VectorStoreID] = vs
	}

	externalModelsConfig, err := client.GetExternalModelsConfig(ctx, namespace)
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
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
// and trusted for the caller's authorized namespace: localhost/loopback (for local
// development) or a Kubernetes in-cluster service in the caller's own namespace.
// These legitimately resolve to private IPs, so SSRF validation is skipped for them.
// In-cluster services in other namespaces are NOT trusted: the caller is only
// authorized for their own namespace, so cross-namespace hosts must go through
// normal SSRF validation (which blocks private IPs). Short-form service DNS
// names (without the .svc.cluster.local suffix) do not match the FQDN check and
// likewise go through normal SSRF validation. Name shape alone is not sufficient:
// resolveTrustedHost additionally verifies the backing Service (rejecting
// ServiceTypeExternalName aliases) before an in-namespace name is actually trusted.
func isInternalHost(baseURL string, namespace string) bool {
	u, err := url.Parse(baseURL)
	if err != nil {
		return false
	}
	h := u.Hostname()
	// TODO: respect OdhDashboardConfig feature flags when available to be fetched from the BFF
	// Require a fully-qualified Kubernetes service DNS name: <service>.<namespace>.svc.cluster.local
	// (5 dot-separated labels minimum), preventing overly-broad matches like "evil.cluster.local".
	labels := strings.Split(h, ".")
	isK8sService := strings.HasSuffix(h, ".svc.cluster.local") && len(labels) >= 5
	if isK8sService {
		// labels[len-4] is the namespace: <service>.<namespace>.svc.cluster.local
		return labels[len(labels)-4] == namespace
	}
	ip := net.ParseIP(h)
	return h == "localhost" || (ip != nil && ip.IsLoopback())
}

// k8sServiceHost extracts the service and namespace labels from a fully-qualified
// in-cluster service DNS name (<service>.<namespace>.svc.cluster.local).
func k8sServiceHost(baseURL string) (service string, namespace string, ok bool) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return "", "", false
	}
	h := u.Hostname()
	labels := strings.Split(h, ".")
	if !strings.HasSuffix(h, ".svc.cluster.local") || len(labels) < 5 {
		return "", "", false
	}
	// Anchor against the fixed suffix: pod-specific DNS names
	// (<pod>.<service>.<namespace>.svc.cluster.local) have extra labels before
	// the Service label, so labels[0] would name the pod, not the Service.
	return labels[len(labels)-5], labels[len(labels)-4], true
}

// resolveTrustedHost decides whether a base URL may skip SSRF validation, and returns the
// destination IPs the host must resolve to at request time (DNS rebinding guard).
//
// An in-namespace service DNS name is only trusted after resolving the backing Service
// through the Kubernetes API: a namespace user can create a ServiceTypeExternalName
// Service whose in-namespace DNS name aliases an arbitrary target (e.g. in another
// namespace), so ExternalName services and unresolvable names are not trusted. Headless
// and selectorless Services are also rejected: a namespace user can create them with
// manually managed Endpoints pointing at arbitrary destinations (including other
// namespaces' Pod IPs), and their DNS answers are not attributable to a validated
// ClusterIP. ClusterIPs of regular selector-backed services are returned as the expected
// dial-time destination.
func resolveTrustedHost(
	ctx context.Context,
	client kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	baseURL string,
	namespace string,
) (bool, []string) {
	if !isInternalHost(baseURL, namespace) {
		return false, nil
	}
	svcName, svcNamespace, ok := k8sServiceHost(baseURL)
	if !ok {
		// localhost/loopback for local development
		return true, nil
	}
	svc, err := client.GetService(ctx, identity, svcNamespace, svcName)
	if err != nil || svc.Spec.Type == corev1.ServiceTypeExternalName {
		return false, nil
	}
	headless := svc.Spec.ClusterIP == "None"
	selectorless := len(svc.Spec.Selector) == 0
	if headless || selectorless {
		return false, nil
	}
	var clusterIPs []string
	for _, ip := range svc.Spec.ClusterIPs {
		if ip != "" && ip != "None" {
			clusterIPs = append(clusterIPs, ip)
		}
	}
	return true, clusterIPs
}

// internalHostRootCAs returns the provided CA pool only when the URL targets an internal
// host. For external hosts it returns nil so the client falls back to the system CA pool,
// which contains the public root CAs needed to verify certificates from services like
// api.openai.com. Passing a cluster-only CA pool to an external host would break TLS.
func internalHostRootCAs(trusted bool, rootCAs *x509.CertPool) *x509.CertPool {
	if trusted {
		return rootCAs
	}
	return nil
}

// VerifyExternalModel tests an external model endpoint using the external models client.
// namespace is the caller's authorized namespace (from AttachNamespace); it scopes which
// in-cluster service hosts are trusted to skip SSRF validation.
// rootCAs is the application CA pool (nil falls back to system pool for external hosts).
// insecureSkipVerify mirrors cfg.InsecureSkipVerify and disables TLS cert validation when true.
func (r *ExternalModelsRepository) VerifyExternalModel(
	logger *slog.Logger,
	ctx context.Context,
	client kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	req models.VerifyExternalModelRequest,
	namespace string,
	rootCAs *x509.CertPool,
	insecureSkipVerify bool,
) (*models.VerifyExternalModelResponse, error) {
	trusted, trustedDestinationIPs := resolveTrustedHost(ctx, client, identity, req.BaseURL, namespace)
	modelsClient, err := externalmodels.NewExternalModelsClient(
		logger,
		req.BaseURL,
		req.SecretValue,
		req.ModelType,
		&externalmodels.ClientOptions{
			AllowHTTP:          trusted,
			SkipSSRFValidation: trusted,
			// Only supply the cluster CA pool for internal hosts; external hosts
			// must use the system CA pool to verify public certificates.
			SkipTLSVerification:   insecureSkipVerify && trusted,
			RootCAs:               internalHostRootCAs(trusted, rootCAs),
			TrustedDestinationIPs: trustedDestinationIPs,
		},
	)
	if err != nil {
		return nil, err
	}

	// Verify the model using the client (pass embedding dimension for embedding models)
	return modelsClient.VerifyModel(ctx, req.ModelID, req.EmbeddingDimension)
}
