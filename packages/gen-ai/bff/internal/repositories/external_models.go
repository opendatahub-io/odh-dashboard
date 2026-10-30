package repositories

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net"
	"net/http"
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
// and trusted for the caller's authorized namespace: localhost/loopback (local
// development) or a Kubernetes in-cluster service in the caller's own namespace.
// These legitimately resolve to private IPs, so SSRF validation is skipped for them.
// In-cluster services in other namespaces are NOT trusted: the caller is only
// authorized for their own namespace, so cross-namespace hosts must go through
// normal SSRF validation (CWE-918). All other URLs are subject to SSRF checks.
func isInternalHost(baseURL string, allowedNamespace string) bool {
	u, err := url.Parse(baseURL)
	if err != nil {
		return false
	}
	h := u.Hostname()
	ip := net.ParseIP(h)
	if h == "localhost" || (ip != nil && ip.IsLoopback()) {
		return true
	}
	// TODO: respect OdhDashboardConfig feature flags when available to be fetched from the BFF
	// Require a fully-qualified Kubernetes service DNS name: <service>.<namespace>.svc.cluster.local
	// (5 dot-separated labels minimum), preventing overly-broad matches like "evil.cluster.local".
	// Only trust services whose namespace segment matches the caller's authorized namespace.
	labels := strings.Split(h, ".")
	return strings.HasSuffix(h, ".svc.cluster.local") &&
		len(labels) >= 5 &&
		allowedNamespace != "" &&
		labels[len(labels)-4] == allowedNamespace
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

// resolveTrustedHost decides whether a base URL in the caller's own namespace may
// skip SSRF validation. A namespace user can create a ServiceTypeExternalName Service
// whose in-namespace DNS name aliases an arbitrary target (e.g. in another namespace),
// so the backing Service is read through the Kubernetes API and ExternalName services
// are not trusted. Selectorless Services are also rejected: without a selector their
// endpoint addresses are manually managed and can point at Pods in another namespace,
// so they must not receive the SSRF exemption. Selector-backed Services are trusted
// whether or not they are headless (headless KServe model endpoints are legitimate),
// but only after their EndpointSlices are checked: a selector alone does not prove
// the effective endpoints, because a caller who can create EndpointSlices in their
// namespace can attach a manually managed slice (labelled kubernetes.io/service-name)
// to a selector-backed Service and point it at another namespace's Pod IP, and can
// forge the endpoint's Pod targetRef. Every endpoint must therefore reference
// a running, non-host-network Pod in the caller's namespace whose PodIPs contain the
// endpoint's addresses, which is all the EndpointSlice controller itself ever
// produces (fail closed on lookup errors too; readiness is not relied on, because
// service routing can fall back to serving/terminating endpoints when no ready
// endpoint exists). A Forbidden lookup returns an error so the caller learns the
// missing permission instead of a misleading connectivity failure.
//
// When the host is trusted, the validated endpoint addresses are returned so the
// connection can be pinned to them (see ClientOptions.PinnedDialAddresses): a
// caller who mutates Services or EndpointSlices in their own namespace after the
// lookup cannot redirect the request, because the dial bypasses DNS and the
// Service VIP entirely.
func resolveTrustedHost(
	ctx context.Context,
	client kubernetes.KubernetesClientInterface,
	identity *integrations.RequestIdentity,
	baseURL string,
	namespace string,
	logger *slog.Logger,
) (bool, []string, error) {
	if !isInternalHost(baseURL, namespace) {
		return false, nil, nil
	}
	svcName, svcNamespace, ok := k8sServiceHost(baseURL)
	if !ok {
		// localhost/loopback for local development
		return true, nil, nil
	}
	svc, err := client.GetService(ctx, identity, svcNamespace, svcName)
	if err != nil {
		if apierrors.IsForbidden(err) {
			return false, nil, forbiddenTrustError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires permission to get the Service %s/%s, which the caller lacks", svcNamespace, svcName))
		}
		logger.Warn("service lookup failed during trusted host resolution", "service", svcName, "namespace", svcNamespace, "error", err)
		return false, nil, nil
	}
	if svc.Spec.Type == corev1.ServiceTypeExternalName {
		return false, nil, nil
	}
	if len(svc.Spec.Selector) == 0 {
		return false, nil, nil
	}
	slices, err := client.GetServiceEndpointSlices(ctx, identity, svcNamespace, svcName)
	if err != nil {
		if apierrors.IsForbidden(err) {
			return false, nil, forbiddenTrustError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires permission to list EndpointSlices for the Service %s/%s, which the caller lacks", svcNamespace, svcName))
		}
		logger.Warn("endpoint slice lookup failed during trusted host resolution", "service", svcName, "namespace", svcNamespace, "error", err)
		return false, nil, nil
	}
	// Readiness is deliberately not relied on: service routing can fall back to
	// serving/terminating endpoints when no ready endpoint exists, so an endpoint
	// omitted or marked not ready could still receive traffic. Every endpoint is
	// therefore validated after fetching its referenced Pod and confirming the
	// endpoint addresses belong to that Pod: a targetRef is just a name an
	// EndpointSlice writer can forge, so it must be checked against a running,
	// non-host-network Pod in the caller's namespace whose PodIPs contain every
	// endpoint address. The validated addresses are returned so the connection is
	// pinned to them.
	addresses := make(map[string]bool)
	for i := range slices {
		for _, endpoint := range slices[i].Endpoints {
			ref := endpoint.TargetRef
			if ref == nil || ref.Kind != "Pod" || ref.Namespace != namespace || ref.Name == "" {
				return false, nil, nil
			}
			pod, err := client.GetPod(ctx, identity, svcNamespace, ref.Name)
			if err != nil {
				if apierrors.IsForbidden(err) {
					return false, nil, forbiddenTrustError(baseURL, fmt.Sprintf("verifying an in-cluster endpoint requires permission to get the Pod %s/%s, which the caller lacks", svcNamespace, ref.Name))
				}
				logger.Warn("pod lookup failed during trusted host resolution", "pod", ref.Name, "namespace", svcNamespace, "error", err)
				return false, nil, nil
			}
			if pod.Spec.HostNetwork || pod.Status.Phase != corev1.PodRunning {
				return false, nil, nil
			}
			podIPs := make(map[string]bool, len(pod.Status.PodIPs))
			for _, podIP := range pod.Status.PodIPs {
				podIPs[podIP.IP] = true
			}
			for _, address := range endpoint.Addresses {
				if !podIPs[address] {
					return false, nil, nil
				}
				addresses[address] = true
			}
		}
	}
	// Fail closed when no endpoint was verified: an endpoint-less Service (e.g.
	// scaled to zero) has no validated destination to pin the connection to.
	if len(addresses) == 0 {
		return false, nil, nil
	}
	pinned := make([]string, 0, len(addresses))
	for address := range addresses {
		pinned = append(pinned, address)
	}
	return true, pinned, nil
}

// forbiddenTrustError builds the permission error returned when a caller lacks read
// access to a resource needed to verify an in-cluster endpoint.
func forbiddenTrustError(baseURL, message string) *externalmodels.ExternalModelError {
	return &externalmodels.ExternalModelError{
		Code:       "FORBIDDEN",
		Message:    message,
		BaseURL:    baseURL,
		StatusCode: http.StatusForbidden,
	}
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
	namespace string,
	req models.VerifyExternalModelRequest,
	rootCAs *x509.CertPool,
	insecureSkipVerify bool,
) (*models.VerifyExternalModelResponse, error) {
	trusted, pinnedAddresses, err := resolveTrustedHost(ctx, client, identity, req.BaseURL, namespace, logger)
	if err != nil {
		return nil, err
	}
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
			SkipTLSVerification: insecureSkipVerify && trusted,
			RootCAs:             internalHostRootCAs(trusted, rootCAs),
			// Pin trusted in-cluster connections to the validated Pod addresses so
			// routing mutations after the trust decision cannot redirect them.
			PinnedDialAddresses: pinnedAddresses,
		},
	)
	if err != nil {
		return nil, err
	}

	// Verify the model using the client (pass embedding dimension for embedding models)
	return modelsClient.VerifyModel(ctx, req.ModelID, req.EmbeddingDimension)
}
