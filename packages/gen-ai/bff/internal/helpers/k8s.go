package helper

import (
	"fmt"
	"net/url"
	"strings"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	kservev1beta1 "github.com/kserve/kserve/pkg/apis/serving/v1beta1"
	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
	gorchv1alpha1 "github.com/trustyai-explainability/trustyai-service-operator/api/gorch/v1alpha1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientRest "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

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
	if err := lsdapi.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add LlamaStackDistribution types to scheme: %w", err)
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

// IsClusterLocalURL checks if a URL points to a Kubernetes cluster-local service.
// It properly parses the URL and checks only the hostname to prevent manipulation
// via query parameters or path components.
//
// Examples:
//   - "http://service.namespace.svc.cluster.local" -> true
//   - "https://service.namespace.svc.cluster.local:8080/path" -> true
//   - "https://evil.com/redirect?to=http://internal.svc.cluster.local" -> false
//   - "https://api.openai.com" -> false
//
// If the URL cannot be parsed, it returns false (treats it as external for safety).
func IsClusterLocalURL(rawURL string) bool {
	// Parse the URL
	parsed, err := url.Parse(rawURL)
	if err != nil {
		// If we can't parse it, treat it as external for safety
		return false
	}

	// Check if the hostname ends with .svc.cluster.local
	hostname := parsed.Hostname()
	return strings.HasSuffix(hostname, ".svc.cluster.local")
	// TODO: Make this configurable from OdhDashboardConfig
}
