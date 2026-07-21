// Package helpers provides shared utility functions for logging, kubeconfig, and scheme setup.
package helpers

import (
	"fmt"

	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientRest "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// GetKubeconfig returns the Kubernetes client configuration.
// It tries kubeconfig file resolution first (KUBECONFIG env, ~/.kube/config),
// then falls back to in-cluster service account credentials.
func GetKubeconfig() (*clientRest.Config, error) {
	return getKubeconfig(clientRest.InClusterConfig)
}

func getKubeconfig(inClusterFn func() (*clientRest.Config, error)) (*clientRest.Config, error) {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	cfg, err := kubeConfig.ClientConfig()
	if err == nil {
		return cfg, nil
	}
	if !clientcmd.IsEmptyConfig(err) {
		return nil, fmt.Errorf("kubeconfig found but invalid: %w", err)
	}
	inCluster, inErr := inClusterFn()
	if inErr != nil {
		return nil, fmt.Errorf("no kubeconfig found (%v) and not running in-cluster (%v)", err, inErr)
	}
	return inCluster, nil
}

// GetCurrentContext returns the active kubeconfig context name.
// Returns "inClusterContext" when running inside a cluster (no kubeconfig file).
func GetCurrentContext() string {
	loadingRules := clientcmd.NewDefaultClientConfigLoadingRules()
	rawConfig, err := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		loadingRules, &clientcmd.ConfigOverrides{},
	).RawConfig()
	if err != nil || rawConfig.CurrentContext == "" {
		return "inClusterContext"
	}
	return rawConfig.CurrentContext
}

// BuildScheme creates a runtime scheme with Kubernetes types registered.
func BuildScheme() (*runtime.Scheme, error) {
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		return nil, fmt.Errorf("failed to add Kubernetes types to scheme: %w", err)
	}

	return scheme, nil
}
