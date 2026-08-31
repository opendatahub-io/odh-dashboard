package helper

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	ogxapi "github.com/ogx-ai/ogx-k8s-operator/api/v1beta1"
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientRest "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// CheckAgentSandboxCRDAvailable reports whether the agents.x-k8s.io/v1beta1 API group
// is served by the cluster. It tries the pod's in-cluster service account first and
// falls back to the local kubeconfig for out-of-cluster development. Returns false on
// any discovery error or non-200 response. The caller is responsible for caching the result.
func CheckAgentSandboxCRDAvailable(ctx context.Context, logger *slog.Logger) bool {
	cfg, err := clientRest.InClusterConfig()
	if err != nil {
		logger.Debug("not running in-cluster, falling back to kubeconfig for agent sandbox CRD check", "error", err)
		cfg, err = GetKubeconfig()
		if err != nil {
			logger.Warn("failed to get kubeconfig for agent sandbox CRD check", "error", err)
			return false
		}
	}

	httpClient, err := clientRest.HTTPClientFor(cfg)
	if err != nil {
		logger.Warn("failed to build HTTP client for agent sandbox CRD check", "error", err)
		return false
	}

	url := strings.TrimRight(cfg.Host, "/") + "/apis/agents.x-k8s.io/v1beta1"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		logger.Warn("failed to create agent sandbox CRD check request", "error", err)
		return false
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		logger.Warn("agent sandbox CRD check request failed", "error", err)
		return false
	}
	available := resp.StatusCode == http.StatusOK
	_, _ = io.Copy(io.Discard, resp.Body)
	_ = resp.Body.Close()
	logger.Debug("agent sandbox CRD availability check complete", "available", available, "statusCode", resp.StatusCode)
	return available
}

// GetKubeconfig returns the current KUBECONFIG configuration based on the default loading rules.
func GetKubeconfig() (*clientRest.Config, error) {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	return kubeConfig.ClientConfig()
}

// BuildScheme builds a new runtime scheme with all the necessary types registered.
func BuildScheme() (*runtime.Scheme, error) {
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add Kubernetes types to scheme: %w", err)
	}
	if err := ogxapi.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add OGXServer types to scheme: %w", err)
	}
	if err := kservev1alpha1.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add KServe v1alpha1 types to scheme: %w", err)
	}
	if err := kservev1beta1.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add KServe v1beta1 types to scheme: %w", err)
	}
	if err := gorchv1alpha1.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add GuardrailsOrchestrator types to scheme: %w", err)
	}

	return scheme, nil
}
