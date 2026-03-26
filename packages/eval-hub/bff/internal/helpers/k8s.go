package helper

import (
	"fmt"
	"os"
	"strings"

	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientRest "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

const (
	serviceAccountNamespaceFile = "/var/run/secrets/kubernetes.io/serviceaccount/namespace"
	defaultDashboardNamespace   = "opendatahub"
)

// GetCurrentNamespace detects the namespace where the BFF pod is running.
// Resolution order:
//  1. In-cluster service account namespace file (standard Kubernetes mount)
//  2. OC_PROJECT env var (OpenShift dev override)
//  3. NAMESPACE env var (generic container env)
//  4. Fallback: "opendatahub"
func GetCurrentNamespace() (string, error) {
	if data, err := os.ReadFile(serviceAccountNamespaceFile); err == nil {
		if ns := strings.TrimSpace(string(data)); ns != "" {
			return ns, nil
		}
	}
	if ns := os.Getenv("OC_PROJECT"); ns != "" {
		return ns, nil
	}
	if ns := os.Getenv("NAMESPACE"); ns != "" {
		return ns, nil
	}
	return defaultDashboardNamespace, nil
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

	return scheme, nil
}
