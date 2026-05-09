package kubernetes

import (
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// GetKubernetesConfig returns a Kubernetes rest.Config, automatically detecting
// whether the code is running in-cluster or out-of-cluster.
//
// Detection order:
//  1. In-cluster config (pod service account) - used when running inside Kubernetes
//  2. Kubeconfig file - follows standard loading rules:
//     - KUBECONFIG environment variable
//     - ~/.kube/config
//     - Merge logic if multiple files specified
//
// This function is used by both K8sInternalClient and K8sTokenClient to eliminate
// the need for BFF-specific config bridging.
func GetKubernetesConfig() (*rest.Config, error) {
	// Try in-cluster config first (running as pod with service account)
	config, err := rest.InClusterConfig()
	if err == nil {
		return config, nil
	}

	// Fallback to kubeconfig for local development
	// Uses standard loading rules: KUBECONFIG env var, ~/.kube/config, merge logic
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)

	return kubeConfig.ClientConfig()
}
